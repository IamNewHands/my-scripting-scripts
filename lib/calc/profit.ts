import { todayDateStr } from "../format"
import type {
  FundItem,
  FundNavSnap,
  FundRowView,
  StockItem,
  StockQuote,
  StockRowView,
  SummaryView,
} from "../types"

/** 基金份额：优先 buyNav 折算，其次已存 shares，最后用当前净值兜底 */
export function resolveFundShares(
  item: FundItem,
  currentNav: number | null
): number {
  const cost = item.costAmount || 0
  if (item.buyNav != null && item.buyNav > 0 && cost > 0) {
    return cost / item.buyNav
  }
  if (item.shares != null && item.shares > 0) {
    return item.shares
  }
  // 兜底：按当前净值折算（持有收益会接近 0，仅防数据不全）
  if (currentNav != null && currentNav > 0 && cost > 0) {
    return cost / currentNav
  }
  return 0
}

/** 股票股数：优先 buyPrice 折算 */
export function resolveStockQuantity(
  item: StockItem,
  currentPrice: number | null
): number {
  const cost = item.costAmount || 0
  if (item.buyPrice != null && item.buyPrice > 0 && cost > 0) {
    return cost / item.buyPrice
  }
  if (item.quantity != null && item.quantity > 0) {
    return item.quantity
  }
  if (currentPrice != null && currentPrice > 0 && cost > 0) {
    return cost / currentPrice
  }
  return 0
}

/**
 * 当日收益（对齐天天基金/x2rr/funds 口径）：
 * - 官方净值日：shares × (今日净值 - 昨日净值)
 *   → 昨日净值 = 今日净值 / (1 + 涨跌幅%/100)
 * - 盘中估算：shares × (估算净值 - 昨日净值)
 *
 * 参考：https://github.com/x2rr/funds/blob/master/src/background.js#L200
 */
export function fundDayPnl(params: {
  shares: number
  nav: number | null
  navChgPct: number | null
  estNav: number | null
  isOfficial: boolean
}): number | null {
  const { shares, nav, navChgPct, estNav, isOfficial } = params
  if (!shares || shares <= 0) return null

  // 官方净值已出：反推昨日净值计算当日收益
  if (isOfficial && nav != null && navChgPct != null) {
    // 昨日净值 = 今日净值 / (1 + 涨跌幅%)
    const prevNav = nav / (1 + navChgPct / 100)
    return shares * (nav - prevNav)
  }

  // 盘中估算：估算净值 - 昨日净值
  if (estNav != null && nav != null) {
    return shares * (estNav - nav)
  }

  // 有估算涨跌幅但无 estNav 时（回退逻辑）
  if (!isOfficial && nav != null && navChgPct != null) {
    const prevNav = nav / (1 + navChgPct / 100)
    return shares * (nav - prevNav)
  }
  return null
}

/** 持有收益：当前市值 - 总买入金额 */
export function holdPnlFromAmount(
  marketValue: number | null,
  costAmount: number
): { holdPnl: number | null; holdRate: number | null } {
  if (marketValue == null || !Number.isFinite(marketValue)) {
    return { holdPnl: null, holdRate: null }
  }
  if (!costAmount || costAmount <= 0) {
    return { holdPnl: null, holdRate: null }
  }
  const holdPnl = marketValue - costAmount
  const holdRate = (holdPnl / costAmount) * 100
  return { holdPnl, holdRate }
}

/**
 * 是否用「已公布净值日涨跌」而非盘中估算。
 * 注意：净值一般在收盘后更新；PDATE===今天表示今日正式净值已出。
 */
export function isOfficialNavDay(navDate: string): boolean {
  if (!navDate || navDate === "--") return false
  return navDate.slice(0, 10) === todayDateStr()
}

export function buildFundRow(
  item: FundItem,
  snap: FundNavSnap | undefined,
  estPct: number | null,
  estNav: number | null,
  prevNav: number | null,
  prevChgPct: number | null
): FundRowView {
  const nav = snap?.nav ?? null
  const navDate = snap?.navDate ?? ""
  const navChgPct = snap?.navChgPct ?? null
  const official = isOfficialNavDay(navDate) && nav != null && navChgPct != null

  const shares = resolveFundShares(item, nav)
  const changePct = official ? navChgPct : estPct
  // 市值：净值已出用 NAV；盘中用估净值
  const priceForMv = official ? nav : estNav ?? nav
  const marketValue =
    priceForMv != null && shares > 0 ? priceForMv * shares : null

  const dayPnl = fundDayPnl({
    shares,
    nav,
    navChgPct,
    estNav: official ? null : estNav,
    isOfficial: official,
  })

  const { holdPnl, holdRate } = holdPnlFromAmount(marketValue, item.costAmount)

  return {
    code: item.code,
    name: snap?.name || item.name || item.code,
    alias: item.alias, // 传递用户自定义别名
    shares,
    costAmount: item.costAmount,
    nav,
    navDate,
    changePct,
    isOfficial: official,
    estNav: official ? nav : estNav,
    estPct,
    prevNav,
    prevChgPct,
    marketValue,
    dayPnl,
    holdPnl,
    holdRate,
  }
}

export function buildStockRow(
  item: StockItem,
  quote: StockQuote | undefined
): StockRowView {
  const price = quote?.price ?? null
  const changePct = quote?.changePct ?? null
  const quantity = resolveStockQuantity(item, price)
  const marketValue =
    price != null && quantity > 0 ? price * quantity : null

  let dayPnl: number | null = null
  if (quantity > 0 && price != null && changePct != null) {
    // 日收益 ≈ 市值 × 涨跌幅
    dayPnl = price * quantity * (changePct / 100)
  } else if (quantity > 0 && quote?.change != null) {
    dayPnl = quote.change * quantity
  }

  const { holdPnl, holdRate } = holdPnlFromAmount(marketValue, item.costAmount)

  return {
    code: item.code,
    name: quote?.name || item.name || item.code,
    alias: item.alias, // 传递用户自定义别名
    market: item.market,
    secid: item.secid,
    quantity,
    costAmount: item.costAmount,
    price,
    changePct,
    marketValue,
    dayPnl,
    holdPnl,
    holdRate,
  }
}

export function summarize(
  rows: Array<{
    dayPnl: number | null
    holdPnl: number | null
    marketValue: number | null
    costAmount: number
  }>
): SummaryView {
  let dayPnl = 0
  let holdPnl = 0
  let marketValue = 0
  let costAmount = 0
  for (const r of rows) {
    if (r.dayPnl != null) dayPnl += r.dayPnl
    if (r.holdPnl != null) holdPnl += r.holdPnl
    if (r.marketValue != null) marketValue += r.marketValue
    if (r.costAmount > 0) costAmount += r.costAmount
  }
  return { dayPnl, holdPnl, marketValue, costAmount }
}

/** 兼容旧 Storage：补齐 buyNav / buyPrice */
export function migrateFundItem(raw: any): FundItem | null {
  if (!raw || typeof raw.code !== "string") return null
  const costAmount = Number(raw.costAmount) || 0
  let buyNav = Number(raw.buyNav) || 0
  const shares = Number(raw.shares) || 0
  // 旧数据只有 shares+cost → 反推买入净值
  if (buyNav <= 0 && shares > 0 && costAmount > 0) {
    buyNav = costAmount / shares
  }
  return {
    code: String(raw.code),
    name: String(raw.name || raw.code),
    costAmount,
    buyNav,
    shares: shares > 0 ? shares : undefined,
  }
}

export function migrateStockItem(raw: any): StockItem | null {
  if (!raw || typeof raw.code !== "string") return null
  const costAmount = Number(raw.costAmount) || 0
  let buyPrice = Number(raw.buyPrice) || 0
  const quantity = Number(raw.quantity) || 0
  if (buyPrice <= 0 && quantity > 0 && costAmount > 0) {
    buyPrice = costAmount / quantity
  }
  return {
    code: String(raw.code),
    name: String(raw.name || raw.code),
    market: raw.market === "HK" || raw.market === "US" ? raw.market : "CN",
    secid: String(raw.secid || ""),
    costAmount,
    buyPrice,
    quantity: quantity > 0 ? quantity : undefined,
  }
}
