import { Widget } from "scripting"
import { fetchFundDetail, fetchFundFees, fetchFundHistory, fetchFundHoldings } from "./lib/api/fund"
import { fetchStockDetail, fetchStockHistory, fetchStockQuotes } from "./lib/api/stock"
import { getCachedSnapshot, setCachedSnapshot, computeFundsHash, computeStocksHash } from "./lib/cache/snapshot"
import { loadPortfolioSnapshot, rebuildFromCached } from "./lib/portfolio"
import {
  getChartHistoryCache,
  getFunds,
  getHoldingsCache,
  getStocks,
  getWidgetChart,
  getWidgetConfig,
  getWidgetPage,
  setChartHistoryCache,
} from "./lib/storage"
import type {
  FundHoldingRow,
  FundItem,
  FundOverview,
  HistoryTableRow,
  PortfolioSnapshot,
  StockItem,
  StockOverview,
  WidgetChartState,
} from "./lib/types"
import { anyMarketOpen, marketKeyOfCode } from "./lib/util/marketHours"
import type { MarketKey } from "./lib/util/marketHours"
import { ChartWidgetView } from "./widget/views/Chart"
import { CompactWidgetView, WatchlistWidgetView } from "./widget/views/List"

/** 图表历史缓存 TTL：5 分钟。切 days/tab 在 TTL 内只切视图不重拉 */
const CHART_CACHE_TTL_MS = 5 * 60 * 1000

/**
 * 根据自选市场的交易时段，计算小组件下次刷新时间。
 *
 * 策略：
 * - 交易时段 → 刷新最近一个收盘（保证当日最后数据）
 * - 非交易时段 → 刷新最近一个开盘（保证开盘即更新）
 * - 周末 → 下周一 9:30
 */
function getNextRefreshDate(items: Array<{ code?: string; secid?: string }>): Date {
  const now = new Date()
  const day = now.getDay()

  // 周末：下周一 9:30
  if (day === 0 || day === 6) {
    const monday = new Date(now)
    monday.setDate(monday.getDate() + (day === 6 ? 2 : 1))
    monday.setHours(9, 30, 0, 0)
    return monday
  }

  // 收集所有自选涉及的市场
  const markets = new Set<MarketKey>()
  for (const it of items) {
    const k = marketKeyOfCode(it.code || "", it.secid || "")
    if (k) markets.add(k)
  }
  if (markets.size === 0) markets.add("cn")

  // 跳过周末
  function nextWeekday(d: Date): Date {
    const r = new Date(d)
    while (r.getDay() === 0 || r.getDay() === 6) {
      r.setDate(r.getDate() + 1)
    }
    return r
  }

  // 交易时段 → 找最近收盘
  if (anyMarketOpen(items, now)) {
    const candidates: Date[] = []
    for (const m of markets) {
      if (m === "cn") {
        const c = new Date(now)
        c.setHours(15, 0, 0, 0)
        if (c > now) candidates.push(c)
      } else if (m === "hk") {
        const c = new Date(now)
        c.setHours(16, 0, 0, 0)
        if (c > now) candidates.push(c)
      } else if (m === "us") {
        // 美股收盘 05:00 北京时间
        let c = new Date(now)
        c.setHours(5, 0, 0, 0)
        if (c <= now) c = new Date(c.getTime() + 86400000)
        c = nextWeekday(c)
        if (c > now) candidates.push(c)
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.getTime() - b.getTime())
      return candidates[0]
    }
  }

  // 非交易时段 → 找最近开盘
  const candidates: Date[] = []
  for (const m of markets) {
    if (m === "cn" || m === "hk") {
      let o = new Date(now)
      o.setHours(9, 30, 0, 0)
      if (o <= now) o = new Date(o.getTime() + 86400000)
      o = nextWeekday(o)
      candidates.push(o)
    } else if (m === "us") {
      let o = new Date(now)
      o.setHours(21, 30, 0, 0)
      if (o <= now) o = new Date(o.getTime() + 86400000)
      o = nextWeekday(o)
      candidates.push(o)
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.getTime() - b.getTime())
    return candidates[0]
  }

  // 兜底：1 小时后
  return new Date(now.getTime() + 3600000)
}

/**
 * 加载图表历史数据（含缓存）。
 * 策略：一次拉满 30 天 → 缓存到 Storage → 按 chartState.days 截取所需行。
 * 在 5 分钟内重复切 days/tab 均不重拉。
 */
async function loadChartHistoryWithCache(
  chartState: WidgetChartState
): Promise<HistoryTableRow[]> {
  const kind = chartState.kind === "stock" ? "stock" : "fund"
  const code = chartState.code
  const secid = chartState.secid
  const targetDays = chartState.days

  // 1) 缓存命中且 days 满足 → 直接截取
  const cached = getChartHistoryCache(code, kind, secid)
  if (
    cached &&
    cached.days === 30 &&
    Date.now() - cached.updatedAt < CHART_CACHE_TTL_MS
  ) {
    return cached.rows.slice(-targetDays)
  }

  // 2) 缓存未命中或过期 → 拉满 30 天
  try {
    let rows: HistoryTableRow[] = []
    if (kind === "stock" && secid) {
      const hist = await fetchStockHistory(secid, 30)
      rows = hist.map((h) => ({ date: h.date, value: h.close, chgPct: h.chgPct }))
    } else {
      const hist = await fetchFundHistory(code, 30)
      rows = hist.map((h) => ({ date: h.date, value: h.nav, chgPct: h.chgPct }))
    }
    if (rows.length > 0) {
      setChartHistoryCache({
        code,
        kind,
        secid,
        days: 30,
        rows,
        updatedAt: Date.now(),
      })
    }
    return rows.slice(-targetDays)
  } catch {
    // 拉取失败：返回过期缓存的截取（即使过期也比空白好）
    if (cached && cached.days === 30) return cached.rows.slice(-targetDays)
    return []
  }
}

async function run() {
  const page = getWidgetPage()
  const config = getWidgetConfig()
  const chartState = getWidgetChart()

  // 提前获取自选列表（用于计算刷新时间）
  const fundsList: FundItem[] = getFunds()
  const stocksList: StockItem[] = getStocks()
  const allItems = [
    ...fundsList.map((f) => ({ code: f.code, secid: undefined })),
    ...stocksList.map((s) => ({ code: s.code, secid: s.secid })),
  ]
  const nextRefresh = getNextRefreshDate(allItems)

  // 历史表：提前加载（基金净值 / 股票日K + 持仓明细）
  if (page === "chart" && chartState) {
    const currentTab = chartState.tab || "history"
    let chartData: HistoryTableRow[] = []
    let holdingsData: FundHoldingRow[] = []
    let holdingsUpdatedAt: number | undefined
    let overviewData: FundOverview | StockOverview | null = null
    const holdingsQuotes = new Map<string, { price: number | null; changePct: number | null }>()

    try {
      if (currentTab === "history") {
        // 一次性拉 30 天 + 缓存，切 days 仅本地截取
        chartData = await loadChartHistoryWithCache(chartState)
      } else if (currentTab === "holdings") {
        // 加载持仓数据（基金或 ETF）
        const isStock = chartState.kind === "stock"
        const code =
          isStock && chartState.code && /^(51|52|56|58|59|15)/.test(chartState.code)
            ? chartState.code
            : !isStock
              ? chartState.code
              : ""
        if (code) {
          holdingsData = await fetchFundHoldings(code)
          // 从缓存读取更新时间
          const cached = getHoldingsCache(code)
          holdingsUpdatedAt = cached?.updatedAt

          // 拉取持仓股的实时行情
          if (holdingsData.length > 0) {
            const secids = holdingsData.map((h) => h.secid).filter(Boolean)
            try {
              const quotes = await fetchStockQuotes(secids)
              for (const q of quotes) {
                if (q.secid) {
                  holdingsQuotes.set(q.secid, {
                    price: q.price,
                    changePct: q.changePct,
                  })
                }
                if (q.code) {
                  holdingsQuotes.set(q.code, {
                    price: q.price,
                    changePct: q.changePct,
                  })
                }
              }
            } catch {
              // 行情拉取失败不影响持仓展示
            }
          }
        }
      } else if (currentTab === "overview") {
        // 加载概况数据
        if (chartState.kind === "stock" && chartState.secid) {
          const d = await fetchStockDetail(chartState.secid)
          if (d) overviewData = d
        } else {
          const [detail, fees] = await Promise.all([
            fetchFundDetail(chartState.code),
            fetchFundFees(chartState.code),
          ])
          if (detail) {
            overviewData = {
              ...detail,
              manageFee: fees.manageFee,
              custodianFee: fees.custodianFee,
              serviceFee: fees.serviceFee,
            } as FundOverview
          }
        }
      }
    } catch (e) {
      // 记录错误便于诊断，但不要阻断 UI 呈现
      console.log("[chart] load failed:", e instanceof Error ? e.message : String(e))
      chartData = []
      holdingsData = []
    }

    Widget.present(
      <ChartWidgetView
        chartState={chartState}
        chartData={chartData}
        holdingsData={holdingsData}
        holdingsQuotes={holdingsQuotes}
        holdingsUpdatedAt={holdingsUpdatedAt}
        overviewData={overviewData}
        config={config}
      />,
      { policy: "after", date: nextRefresh }
    )
    return
  }

  // 列表模式：非交易时段读本地快照，交易时段才拉接口。
  let snap: PortfolioSnapshot
  const marketOpen = anyMarketOpen(allItems)

  if (marketOpen) {
    // 交易时段：实时拉 + 写本地快照
    try {
      snap = await loadPortfolioSnapshot({ funds: fundsList, stocks: stocksList })
      setCachedSnapshot(snap, false, fundsList, stocksList)
    } catch (e) {
      console.log("[list] snapshot load failed:", e instanceof Error ? e.message : String(e))
      // 拉取失败 → 降级到本地快照
      const cached = getCachedSnapshot()
      snap = cached ?? {
        funds: [],
        stocks: [],
        fundSummary: { dayPnl: 0, holdPnl: 0, marketValue: 0, costAmount: 0 },
        stockSummary: { dayPnl: 0, holdPnl: 0, marketValue: 0, costAmount: 0 },
        updatedAt: Date.now(),
        warnings: ["加载失败"],
      }
    }
  } else {
    // 非交易时段：读本地（开盘后最后一帧的快照）
    const cached = getCachedSnapshot()
    if (cached) {
      // 检查用户数据是否手工调整过（成本/持仓变化）
      const fundsHash = computeFundsHash(fundsList)
      const stocksHash = computeStocksHash(stocksList)
      if (fundsHash !== cached.fundsHash || stocksHash !== cached.stocksHash) {
        // 数据有变化：用缓存价格 + 最新用户数据重算
        snap = rebuildFromCached(cached, fundsList, stocksList)
      } else {
        snap = cached
      }
    } else {
      // 没有本地快照（首次使用 / Storage 被清理）→ 只能拉一次
      console.log("[list] no cached snapshot, fetching once...")
      try {
        snap = await loadPortfolioSnapshot({ funds: fundsList, stocks: stocksList })
        setCachedSnapshot(snap, true, fundsList, stocksList)
      } catch (e) {
        console.log("[list] first fetch failed:", e instanceof Error ? e.message : String(e))
        snap = {
          funds: [],
          stocks: [],
          fundSummary: { dayPnl: 0, holdPnl: 0, marketValue: 0, costAmount: 0 },
          stockSummary: { dayPnl: 0, holdPnl: 0, marketValue: 0, costAmount: 0 },
          updatedAt: Date.now(),
          warnings: ["加载失败"],
        }
      }
    }
  }

  const family = Widget.family
  if (family === "systemSmall" || family === "accessoryRectangular") {
    Widget.present(<CompactWidgetView page={page} snap={snap} config={config} />, { policy: "after", date: nextRefresh })
  } else {
    Widget.present(<WatchlistWidgetView page={page} snap={snap} config={config} />, { policy: "after", date: nextRefresh })
  }
}

run()
