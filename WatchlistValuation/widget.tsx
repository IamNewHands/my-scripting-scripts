import { Widget } from "scripting"
import { fetchFundHistory, fetchFundHoldings } from "./lib/api/fund"
import { fetchStockHistory, fetchStockQuotes } from "./lib/api/stock"
import { getCachedSnapshot, setCachedSnapshot } from "./lib/cache/snapshot"
import { loadPortfolioSnapshot } from "./lib/portfolio"
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
  HistoryTableRow,
  PortfolioSnapshot,
  StockItem,
  WidgetChartState,
} from "./lib/types"
import { anyMarketOpen } from "./lib/util/marketHours"
import { ChartWidgetView } from "./widget/views/Chart"
import { CompactWidgetView, WatchlistWidgetView } from "./widget/views/List"

/** 图表历史缓存 TTL：5 分钟。切 days/tab 在 TTL 内只切视图不重拉 */
const CHART_CACHE_TTL_MS = 5 * 60 * 1000

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

  // 历史表：提前加载（基金净值 / 股票日K + 持仓明细）
  if (page === "chart" && chartState) {
    const currentTab = chartState.tab || "history"
    let chartData: HistoryTableRow[] = []
    let holdingsData: FundHoldingRow[] = []
    let holdingsUpdatedAt: number | undefined
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
        config={config}
      />
    )
    return
  }

  // 列表模式：非交易时段读本地快照，交易时段才拉接口。
  let snap: PortfolioSnapshot
  const fundsList: FundItem[] = getFunds()
  const stocksList: StockItem[] = getStocks()
  const allItems = [
    ...fundsList.map((f) => ({ code: f.code, secid: undefined })),
    ...stocksList.map((s) => ({ code: s.code, secid: s.secid })),
  ]
  const marketOpen = anyMarketOpen(allItems)

  if (marketOpen) {
    // 交易时段：实时拉 + 写本地快照
    try {
      snap = await loadPortfolioSnapshot({ funds: fundsList, stocks: stocksList })
      setCachedSnapshot(snap, false)
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
      snap = cached
    } else {
      // 没有本地快照（首次使用 / Storage 被清理）→ 只能拉一次
      console.log("[list] no cached snapshot, fetching once...")
      try {
        snap = await loadPortfolioSnapshot({ funds: fundsList, stocks: stocksList })
        setCachedSnapshot(snap, true)
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
    Widget.present(<CompactWidgetView page={page} snap={snap} config={config} />)
  } else {
    Widget.present(<WatchlistWidgetView page={page} snap={snap} config={config} />)
  }
}

run()
