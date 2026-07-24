import { migrateFundItem, migrateStockItem } from "./calc/profit"
import type {
  FundHoldingsCache,
  FundItem,
  StockItem,
  WatchlistStore,
  WidgetChartState,
  WidgetConfig,
  WidgetPage,
} from "./types"

const KEY_FUNDS = "watchlist.funds"
const KEY_STOCKS = "watchlist.stocks"
const KEY_PAGE = "watchlist.widgetPage"
const KEY_WIDGET_CONFIG = "watchlist.widgetConfig"
const KEY_LIST_PAGE_FUND = "watchlist.listPage.fund"
const KEY_LIST_PAGE_STOCK = "watchlist.listPage.stock"
const KEY_CHART = "watchlist.widgetChart"
const KEY_HOLDINGS_PREFIX = "watchlist.holdings."
const KEY_CHART_HISTORY_PREFIX = "watchlist.chartHistory."

/** 图表历史缓存：一次性拉 30 天，切 days/tab 时只切视图不重拉 */
export type ChartHistoryCache = {
  code: string
  kind: "fund" | "stock"
  secid?: string
  days: 7 | 15 | 30
  rows: Array<{ date: string; value: number; chgPct: number }>
  updatedAt: number
}

function chartHistoryKey(code: string, kind: "fund" | "stock", secid?: string): string {
  return `${KEY_CHART_HISTORY_PREFIX}${kind}.${secid || code}`
}

export function getChartHistoryCache(
  code: string,
  kind: "fund" | "stock",
  secid?: string
): ChartHistoryCache | null {
  const raw = Storage.get<ChartHistoryCache>(chartHistoryKey(code, kind, secid))
  if (!raw || !Array.isArray(raw.rows)) return null
  return raw
}

export function setChartHistoryCache(cache: ChartHistoryCache): void {
  Storage.set(chartHistoryKey(cache.code, cache.kind, cache.secid), cache)
}

function fundsNeedRewrite(raw: any[], migrated: FundItem[]): boolean {
  if (raw.length !== migrated.length) return true
  for (let i = 0; i < migrated.length; i++) {
    const r = raw[i]
    const m = migrated[i]
    // 旧版只有 shares、没有 buyNav，需要落盘新模型
    if (r == null || m == null) return true
    if (m.buyNav > 0 && !(Number(r.buyNav) > 0)) return true
    if (Number(r.costAmount) !== m.costAmount) return true
  }
  return false
}

function stocksNeedRewrite(raw: any[], migrated: StockItem[]): boolean {
  if (raw.length !== migrated.length) return true
  for (let i = 0; i < migrated.length; i++) {
    const r = raw[i]
    const m = migrated[i]
    if (r == null || m == null) return true
    if (m.buyPrice > 0 && !(Number(r.buyPrice) > 0)) return true
    if (Number(r.costAmount) !== m.costAmount) return true
  }
  return false
}

export function getFunds(): FundItem[] {
  const list = Storage.get<any[]>(KEY_FUNDS)
  if (!Array.isArray(list)) return []
  const migrated = list.map(migrateFundItem).filter(Boolean) as FundItem[]
  if (fundsNeedRewrite(list, migrated)) {
    Storage.set(KEY_FUNDS, migrated)
  }
  return migrated
}

export function setFunds(funds: FundItem[]): void {
  Storage.set(KEY_FUNDS, funds)
}

export function getStocks(): StockItem[] {
  const list = Storage.get<any[]>(KEY_STOCKS)
  if (!Array.isArray(list)) return []
  const migrated = list.map(migrateStockItem).filter(Boolean) as StockItem[]
  if (stocksNeedRewrite(list, migrated)) {
    Storage.set(KEY_STOCKS, migrated)
  }
  return migrated
}

export function setStocks(stocks: StockItem[]): void {
  Storage.set(KEY_STOCKS, stocks)
}

export function getWidgetPage(): WidgetPage {
  const page = Storage.get<string>(KEY_PAGE)
  if (page === "stock" || page === "chart") return page
  return "fund"
}

export function setWidgetPage(page: WidgetPage): void {
  Storage.set(KEY_PAGE, page)
}

/** 列表翻页：从 0 起 */
export function getListPage(kind: "fund" | "stock"): number {
  const key = kind === "fund" ? KEY_LIST_PAGE_FUND : KEY_LIST_PAGE_STOCK
  const n = Number(Storage.get<number>(key) ?? 0)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

export function setListPage(kind: "fund" | "stock", page: number): void {
  const key = kind === "fund" ? KEY_LIST_PAGE_FUND : KEY_LIST_PAGE_STOCK
  Storage.set(key, Math.max(0, Math.floor(page)))
}

export function getWidgetChart(): WidgetChartState | null {
  const raw = Storage.get<WidgetChartState>(KEY_CHART)
  if (!raw || !raw.code) return null
  const days = raw.days === 15 ? 15 : raw.days === 30 ? 30 : 7
  const page = Math.max(0, Math.floor(Number(raw.page) || 0))
  const kind = raw.kind === "stock" ? "stock" : "fund"
  const tab = raw.tab === "holdings" ? "holdings" : "history"
  return {
    kind,
    code: String(raw.code),
    name: String(raw.name || raw.code),
    secid: raw.secid ? String(raw.secid) : undefined,
    days,
    page,
    tab,
  }
}

export function setWidgetChart(state: WidgetChartState | null): void {
  if (!state) {
    Storage.remove(KEY_CHART)
    return
  }
  Storage.set(KEY_CHART, {
    kind: state.kind === "stock" ? "stock" : "fund",
    code: state.code,
    name: state.name,
    secid: state.secid,
    days: state.days === 15 ? 15 : state.days === 30 ? 30 : 7,
    page: Math.max(0, Math.floor(Number(state.page) || 0)),
    tab: state.tab,
  })
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  fontSize: "medium",
  maxFundRows: 6,
  maxStockRows: 6,
  maxChartRows: 7,
  redUp: true,
}

export function getWidgetConfig(): WidgetConfig {
  const config = Storage.get<Partial<WidgetConfig>>(KEY_WIDGET_CONFIG)
  if (!config) return { ...DEFAULT_WIDGET_CONFIG }
  const fontSize =
    config.fontSize === "xsmall" ||
    config.fontSize === "small" ||
    config.fontSize === "large" ||
    config.fontSize === "xlarge"
      ? config.fontSize
      : "medium"
  return {
    fontSize,
    maxFundRows: Math.max(3, Number(config.maxFundRows) || 6),
    maxStockRows: Math.max(3, Number(config.maxStockRows) || 6),
    maxChartRows: Math.max(4, Number(config.maxChartRows) || 7),
    redUp: config.redUp !== false, // 未设置/异常 → 默认 true（中国习惯）
  }
}

export function setWidgetConfig(config: WidgetConfig): void {
  const fontSize =
    config.fontSize === "xsmall" ||
    config.fontSize === "small" ||
    config.fontSize === "large" ||
    config.fontSize === "xlarge"
      ? config.fontSize
      : "medium"
  Storage.set(KEY_WIDGET_CONFIG, {
    fontSize,
    maxFundRows: Math.max(3, Number(config.maxFundRows) || 6),
    maxStockRows: Math.max(3, Number(config.maxStockRows) || 6),
    maxChartRows: Math.max(4, Number(config.maxChartRows) || 7),
    redUp: config.redUp !== false,
  })
}

export function loadWatchlist(): WatchlistStore {
  return {
    funds: getFunds(),
    stocks: getStocks(),
    widgetPage: getWidgetPage(),
    widgetConfig: getWidgetConfig(),
  }
}

export function getHoldingsCache(code: string): FundHoldingsCache | null {
  const raw = Storage.get<FundHoldingsCache>(KEY_HOLDINGS_PREFIX + code)
  if (!raw || !Array.isArray(raw.rows)) return null
  return raw
}

export function setHoldingsCache(cache: FundHoldingsCache): void {
  Storage.set(KEY_HOLDINGS_PREFIX + cache.code, cache)
}
