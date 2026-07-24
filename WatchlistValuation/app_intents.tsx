import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import {
  getFunds,
  getListPage,
  getStocks,
  getWidgetChart,
  getWidgetConfig,
  setListPage,
  setWidgetChart,
  setWidgetPage,
} from "./lib/storage"
import type { WidgetPage } from "./lib/types"

/** 切换到基金列表页 */
export const SwitchToFundPageIntent = AppIntentManager.register({
  name: "SwitchToFundPageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    setWidgetPage("fund")
    setWidgetChart(null)
    Widget.reloadAll()
  },
})

/** 切换到股票列表页 */
export const SwitchToStockPageIntent = AppIntentManager.register({
  name: "SwitchToStockPageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    setWidgetPage("stock")
    setWidgetChart(null)
    Widget.reloadAll()
  },
})

/** 基金/股票列表轮换（备用） */
export const ToggleWatchPageIntent = AppIntentManager.register({
  name: "ToggleWatchPageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    const cur = Storage.get<string>("watchlist.widgetPage")
    // 图表态回到基金；列表间 fund <-> stock
    const next: WidgetPage = cur === "stock" ? "fund" : "stock"
    setWidgetPage(next)
    setWidgetChart(null)
    Widget.reloadAll()
  },
})

/**
 * 打开历史明细
 * 基金: "code|name" 或 "fund|code|name"
 * 股票: "stock|code|name|secid"
 */
export const OpenFundChartIntent = AppIntentManager.register({
  name: "OpenFundChartIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (params: string) => {
    const parts = String(params ?? "")
      .split("|")
      .map((s) => s.trim())
    let kind: "fund" | "stock" = "fund"
    let code = ""
    let name = ""
    let secid: string | undefined

    if (parts[0] === "stock" && parts.length >= 3) {
      kind = "stock"
      code = parts[1]
      name = parts[2] || parts[1]
      secid = parts[3] || undefined
    } else if (parts[0] === "fund" && parts.length >= 2) {
      code = parts[1]
      name = parts[2] || parts[1]
    } else {
      // 兼容旧格式 code|name
      code = parts[0] || ""
      name = parts[1] || code
    }

    if (!/^\d{6}$/.test(code)) return
    if (kind === "stock" && !secid) return

    const prev = getWidgetChart()
    const same =
      prev?.code === code &&
      (prev.kind || "fund") === kind &&
      (kind !== "stock" || prev.secid === secid)

    setWidgetChart({
      kind,
      code,
      name,
      secid,
      days: same && (prev!.days === 15 || prev!.days === 30 || prev!.days === 7) ? prev!.days : 7,
      page: 0,
    })
    setWidgetPage("chart")
    Widget.reloadAll()
  },
})

/** 关闭历史明细，回到对应列表 */
export const CloseFundChartIntent = AppIntentManager.register({
  name: "CloseFundChartIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    const cur = getWidgetChart()
    const back = cur?.kind === "stock" ? "stock" : "fund"
    setWidgetChart(null)
    setWidgetPage(back)
    Widget.reloadAll()
  },
})

/** 图表切换 7/15/30 日（切换时回到第 0 页） */
export const SetChartDaysIntent = AppIntentManager.register({
  name: "SetChartDaysIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (daysRaw: string) => {
    const days = String(daysRaw) === "15" ? 15 : String(daysRaw) === "30" ? 30 : 7
    const cur = getWidgetChart()
    if (!cur) return
    setWidgetChart({ ...cur, days, page: 0 })
    Widget.reloadAll()
  },
})

/** 历史净值表格翻页：params 为 "prev" | "next" */
export const ShiftChartPageIntent = AppIntentManager.register({
  name: "ShiftChartPageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (dir: string) => {
    const cur = getWidgetChart()
    if (!cur) return
    const pageSize = Math.max(4, getWidgetConfig().maxChartRows || 7)
    // 以所选天数作总行数上界（接口最多返回 days 条）；widget 展示时再按真实长度钳制
    const maxPage = Math.max(0, Math.ceil(cur.days / pageSize) - 1)
    const page = Math.min(maxPage, Math.max(0, Math.floor(Number(cur.page) || 0)))
    if (dir === "prev") {
      setWidgetChart({ ...cur, page: Math.max(0, page - 1) })
    } else if (dir === "next") {
      setWidgetChart({ ...cur, page: Math.min(maxPage, page + 1) })
    }
    Widget.reloadAll()
  },
})

/** 历史明细切换 tab：history | holdings */
export const SetChartTabIntent = AppIntentManager.register({
  name: "SetChartTabIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (tab: string) => {
    const cur = getWidgetChart()
    if (!cur) return
    const newTab = tab === "holdings" ? "holdings" : "history"
    setWidgetChart({ ...cur, tab: newTab, page: 0 })
    Widget.reloadAll()
  },
})

/**
 * 列表翻页：params 为 "fund:next" | "fund:prev" | "stock:next" | "stock:prev"
 */
export const ShiftListPageIntent = AppIntentManager.register({
  name: "ShiftListPageIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (params: string) => {
    const [kind, dir] = String(params ?? "").split(":")
    if (kind !== "fund" && kind !== "stock") return
    const cfg = getWidgetConfig()
    const pageSize =
      kind === "fund"
        ? Math.max(1, cfg.maxFundRows || 6)
        : Math.max(1, cfg.maxStockRows || 6)
    const total =
      kind === "fund" ? getFunds().length : getStocks().length
    const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)
    const cur = Math.min(getListPage(kind), maxPage)
    if (dir === "prev") {
      setListPage(kind, Math.max(0, cur - 1))
    } else if (dir === "next") {
      setListPage(kind, Math.min(maxPage, cur + 1))
    }
    Widget.reloadAll()
  },
})

/** 仅触发刷新 */
export const RefreshWatchlistIntent = AppIntentManager.register({
  name: "RefreshWatchlistIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    Widget.reloadAll()
  },
})
