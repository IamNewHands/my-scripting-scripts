import { fetchFundHoldings, fetchFundNavs } from "./api/fund"
import { fetchStockQuotes, indexQuotes } from "./api/stock"
import { getCachedSnapshot, setCachedSnapshot } from "./cache/snapshot"
import { estimateFundChangePct, estimateNav } from "./calc/estimate"
import { buildFundRow, buildStockRow, summarize } from "./calc/profit"
import { getFunds, getStocks } from "./storage"
import { parallelLimit } from "./util/async"
import { anyMarketOpen } from "./util/marketHours"
import { fetchPrevNavCached } from "./cache/prevnav"
import type {
  FundItem,
  FundNavSnap,
  PortfolioSnapshot,
  StockItem,
} from "./types"

export async function loadPortfolioSnapshot(
  options?: { funds?: FundItem[]; stocks?: StockItem[] }
): Promise<PortfolioSnapshot> {
  const funds = options?.funds ?? getFunds()
  const stocks = options?.stocks ?? getStocks()
  const warnings: string[] = []

  // 1) 基金净值
  let navs: FundNavSnap[] = []
  if (funds.length > 0) {
    try {
      navs = await fetchFundNavs(funds.map((f) => f.code))
      if (navs.length === 0) warnings.push("基金净值接口无数据")
    } catch {
      warnings.push("基金净值请求失败")
    }
  }
  const navMap = new Map(navs.map((n) => [n.code, n]))

  // 2) 各基金重仓（并发限流3个）
  const holdingsTasks = funds.map((f) => async () => {
    try {
      const rows = await fetchFundHoldings(f.code)
      return { code: f.code, rows }
    } catch {
      warnings.push(`持仓 ${f.code} 失败`)
      return { code: f.code, rows: [] as Awaited<ReturnType<typeof fetchFundHoldings>> }
    }
  })
  const holdingsResults = await parallelLimit(holdingsTasks, 3)
  const holdingsByFund = new Map(
    holdingsResults.map((r) => [r.code, r.rows])
  )
  const allHoldingSecids = new Set<string>()
  for (const result of holdingsResults) {
    for (const r of result.rows) {
      if (r.secid) allHoldingSecids.add(r.secid)
    }
  }

  // 3) 昨日净值（并发限流3个 + 缓存）
  const prevNavTasks = funds.map((f) => async () => {
    try {
      const prev = await fetchPrevNavCached(f.code)
      return { code: f.code, prev }
    } catch {
      return { code: f.code, prev: null }
    }
  })
  const prevNavResults = await parallelLimit(prevNavTasks, 3)
  const prevNavMap = new Map(
    prevNavResults.map((r) => [r.code, r.prev])
  )

  // 4) 自选股 secid + 重仓 secid 合并拉行情
  for (const s of stocks) {
    if (s.secid) allHoldingSecids.add(s.secid)
  }

  let quotes = [] as Awaited<ReturnType<typeof fetchStockQuotes>>
  if (allHoldingSecids.size > 0) {
    try {
      quotes = await fetchStockQuotes([...allHoldingSecids])
      if (quotes.length === 0) warnings.push("股票行情无数据")
    } catch {
      warnings.push("股票行情请求失败")
    }
  }
  const quoteMap = indexQuotes(quotes)

  // 5) 组装基金行
  const fundRows = funds.map((item) => {
    const snap = navMap.get(item.code)
    
    // 优先使用 API 提供的估算值（gsz/gszzl）
    let estPct: number | null = null
    let estNav: number | null = null
    
    if (snap?.gsz != null && snap?.gszzl != null) {
      // API 有估算：直接用
      estPct = snap.gszzl
      estNav = snap.gsz
    } else if (snap?.nav != null) {
      // API 无估算：用持仓加权计算
      const holdings = holdingsByFund.get(item.code) ?? []
      const related = holdings
        .map(
          (h) =>
            quoteMap.get(h.secid) ||
            quoteMap.get(h.code) ||
            quoteMap.get(`1.${h.code}`) ||
            quoteMap.get(`0.${h.code}`)
        )
        .filter(Boolean) as typeof quotes
      const est = estimateFundChangePct(holdings, related)
      estPct = est.estPct
      estNav = estimateNav(snap.nav, estPct)
    }
    
    const prev = prevNavMap.get(item.code) ?? null
    return buildFundRow(item, snap, estPct, estNav, prev?.prevNav ?? null, prev?.prevChgPct ?? null)
  })

  // 6) 组装股票行
  const stockRows = stocks.map((item) => {
    const q =
      quoteMap.get(item.secid) ||
      quoteMap.get(item.code) ||
      undefined
    return buildStockRow(item, q)
  })

  return {
    funds: fundRows,
    stocks: stockRows,
    fundSummary: summarize(fundRows),
    stockSummary: summarize(stockRows),
    updatedAt: Date.now(),
    warnings,
  }
}

/**
 * 智能快照加载：非交易时段优先读本地。
 *
 * - 交易时段：实时拉接口 + 写本地快照（savedAfterClose=false 表示“中间状态”）
 * - 非交易时段：读本地快照；无本地则拉一次（savedAfterClose=true 表示“收盘后”）
 * - 传入 force=true 总是拉（控制台“刷新预览”按钮）
 */
export async function loadPortfolioSmart(
  options?: { funds?: FundItem[]; stocks?: StockItem[]; force?: boolean }
): Promise<PortfolioSnapshot> {
  const funds = options?.funds ?? getFunds()
  const stocks = options?.stocks ?? getStocks()
  const force = options?.force ?? false

  // 判断市场状态
  const allItems = [
    ...funds.map((f) => ({ code: f.code, secid: undefined })),
    ...stocks.map((s) => ({ code: s.code, secid: s.secid })),
  ]
  const marketOpen = anyMarketOpen(allItems)

  if (!force && !marketOpen) {
    // 非交易时段：读本地
    const cached = getCachedSnapshot()
    if (cached) return cached
    // 没有本地 → 拉一次（首次使用 / Storage 被清）
  }

  // 交易时段或首次：实拉
  const snap = await loadPortfolioSnapshot({ funds, stocks })
  // 收盘后保存为“最终状态”
  setCachedSnapshot(snap, !marketOpen)
  return snap
}
