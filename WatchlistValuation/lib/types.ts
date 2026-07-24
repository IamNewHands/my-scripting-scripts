/** 小组件当前展示分组：基金列表 / 股票列表 / 基金净值图 */
export type WidgetPage = "fund" | "stock" | "chart"

/**
 * 股票市场标识。
 * P0 仅实现 A 股；hk/us 预留，后续扩展时在 stock 解析与行情源中补全。
 */
export type StockMarket = "CN" | "HK" | "US"

/** 用户自选基金：用户只填买入金额，份额由买入净值折算 */
export type FundItem = {
  code: string
  name: string
  /** 用户自定义显示名称（用于小组件显示） */
  alias?: string
  /** 总买入金额（元），用户唯一必填持仓字段 */
  costAmount: number
  /**
   * 买入确认净值（元/份）。添加时默认取当时最新净值；
   * 份额 = costAmount / buyNav，之后净值变动不再改份额。
   */
  buyNav: number
  /**
   * 持有份额（自动计算缓存）。
   * 优先用 buyNav 折算；兼容旧数据里手填的 shares。
   */
  shares?: number
}

/** 用户自选股票：P0 可只填买入金额，股数按添加时现价折算 */
export type StockItem = {
  code: string
  name: string
  /** 用户自定义显示名称（用于小组件显示） */
  alias?: string
  market: StockMarket
  /** 东财 secid，如 1.600519 / 0.000001 */
  secid: string
  /** 总买入金额（元） */
  costAmount: number
  /** 买入均价（元），添加时默认现价 */
  buyPrice: number
  /** 持股数量 = costAmount / buyPrice（自动） */
  quantity?: number
}

/** 小组件字体大小（控制台可配，全界面统一缩放） */
export type WidgetFontSize =
  | "xsmall"
  | "small"
  | "medium"
  | "large"
  | "xlarge"

/** 小组件显示配置 */
export type WidgetConfig = {
  /** 全局字号档位 */
  fontSize: WidgetFontSize
  /** 基金列表每页行数 */
  maxFundRows: number
  /** 股票列表每页行数 */
  maxStockRows: number
  /** 历史净值表格每页行数（超出可翻页） */
  maxChartRows: number
  /** 涨跌色方向：true=红涨绿跌（中国）；false=绿涨红跌（海外）默认 true */
  redUp: boolean
}

/** 历史明细类型：基金净值 / 股票日K */
export type WidgetHistoryKind = "fund" | "stock"

/** 历史明细 tab：历史数据 / 持仓明细 */
export type HistoryTab = "history" | "holdings"

/** 小组件内嵌历史明细状态 */
export type WidgetChartState = {
  /** fund | stock，缺省按基金兼容旧数据 */
  kind?: WidgetHistoryKind
  code: string
  name: string
  /** 股票东财 secid，如 1.600519 */
  secid?: string
  /** 默认 7；可选 15 / 30 */
  days: 7 | 15 | 30
  /** 表格页码，从 0 起 */
  page?: number
  /** 当前 tab：历史 / 持仓（默认历史） */
  tab?: HistoryTab
}

/** 历史表格统一行（基金净值 / 股票收盘价） */
export type HistoryTableRow = {
  date: string
  /** 基金单位净值或股票收盘价 */
  value: number
  chgPct: number
}

export type WatchlistStore = {
  funds: FundItem[]
  stocks: StockItem[]
  widgetPage: WidgetPage
  widgetConfig?: WidgetConfig
}

/** 基金净值快照（接口） */
export type FundNavSnap = {
  code: string
  name: string
  nav: number | null
  navDate: string
  navChgPct: number | null
  /** API 估算净值（盘中实时，可能为 null） */
  gsz?: number | null
  /** API 估算涨跌幅 %（盘中实时，可能为 null） */
  gszzl?: number | null
  /** 估值时间，如 "2026-07-24 14:30" */
  gztime?: string | null
}

/** 基金重仓股一行 */
export type FundHoldingRow = {
  code: string
  name: string
  /** 占净值比，百分数，如 9.77 表示 9.77% */
  weightPct: number
  /** 东财市场前缀 0/1/... */
  exchange: string
  secid: string
}

export type FundHoldingsCache = {
  code: string
  updatedAt: number
  rows: FundHoldingRow[]
}

/** 股票实时行情 */
export type StockQuote = {
  code: string
  name: string
  secid: string
  price: number | null
  /** 涨跌幅 % */
  changePct: number | null
  change: number | null
}

export type FundSearchHit = {
  code: string
  name: string
}

export type StockSearchHit = {
  code: string
  name: string
  market: StockMarket
  secid: string
}

/** 单只基金计算结果 */
export type FundRowView = {
  code: string
  name: string
  /** 用户自定义别名 */
  alias?: string
  shares: number
  costAmount: number
  nav: number | null
  navDate: string
  /** 展示用涨跌幅 %（估或净） */
  changePct: number | null
  /** 是否使用官方净值日涨跌（非估算） */
  isOfficial: boolean
  estNav: number | null
  /** 盘中估算涨幅 % */
  estPct: number | null
  /** 昨日单位净值 */
  prevNav: number | null
  /** 昨日涨跌幅 % */
  prevChgPct: number | null
  marketValue: number | null
  dayPnl: number | null
  holdPnl: number | null
  holdRate: number | null
}

/** 单只股票计算结果 */
export type StockRowView = {
  code: string
  name: string
  /** 用户自定义别名 */
  alias?: string
  market: StockMarket
  secid: string
  quantity: number
  costAmount: number
  price: number | null
  changePct: number | null
  marketValue: number | null
  dayPnl: number | null
  holdPnl: number | null
  holdRate: number | null
}

export type SummaryView = {
  dayPnl: number
  holdPnl: number
  marketValue: number
  costAmount: number
}

export type PortfolioSnapshot = {
  funds: FundRowView[]
  stocks: StockRowView[]
  fundSummary: SummaryView
  stockSummary: SummaryView
  updatedAt: number
  /** 简要错误（部分失败不阻断） */
  warnings: string[]
}
