import { Button, Divider, HStack, Spacer, Text, VStack } from "scripting"
import {
  OpenFundChartIntent,
  RefreshWatchlistIntent,
  ShiftListPageIntent,
  SwitchToFundPageIntent,
  SwitchToStockPageIntent,
} from "../../app_intents"
import {
  abbreviateFundName,
  formatClock,
  formatMoney,
  formatPct,
  formatPrice,
  pnlColor,
} from "../../lib/format"
import { getListPage } from "../../lib/storage"
import type {
  FundRowView,
  PortfolioSnapshot,
  StockRowView,
  SummaryView,
  WidgetConfig,
  WidgetPage,
} from "../../lib/types"
import { getFontSize, layoutPad, scaleW } from "../common/fontScale"

/** 页标签：基金 / 股票 切换 + 刷新 */
export function PageTabs({ page, config }: { page: WidgetPage; config: WidgetConfig }) {
  if (page === "chart") return null
  const fundActive = page === "fund"
  const stockActive = page === "stock"
  // 紧凑布局：缩小字号和内边距，避免中等字号下顶栏放不下
  const f = getFontSize(12, config.fontSizeSummary)
  const gap = Math.max(2, getFontSize(4, config.fontSizeSummary))
  const btnPad = { top: 2, bottom: 2, leading: 4, trailing: 4 }
  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <Button intent={SwitchToFundPageIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text
          font={f}
          fontWeight={fundActive ? "bold" : "regular"}
          foregroundStyle={fundActive ? "red" : "secondaryLabel"}
          lineLimit={1}
        >
          {fundActive ? "基金●" : "基金"}
        </Text>
      </Button>
      <Button intent={SwitchToStockPageIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text
          font={f}
          fontWeight={stockActive ? "bold" : "regular"}
          foregroundStyle={stockActive ? "red" : "secondaryLabel"}
          lineLimit={1}
        >
          {stockActive ? "股票●" : "股票"}
        </Text>
      </Button>
      <Spacer />
      <Button intent={RefreshWatchlistIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text
          font={getFontSize(10, config.fontSizeSummary)}
          foregroundStyle="secondaryLabel"
          lineLimit={1}
        >
          刷新
        </Text>
      </Button>
    </HStack>
  )
}

/** 顶部汇总：当日/持有收益 */
export function SummaryBar({
  summary,
  timeLabel,
  config,
}: {
  summary: SummaryView
  timeLabel: string
  config: WidgetConfig
}) {
  const labelF = getFontSize(10, config.fontSizeSummary)
  // 收益主数字：上限14，避免大字号溢出
  const valueF = getFontSize(13, config.fontSizeSummary)
  const subF = getFontSize(11, config.fontSizeSummary)
  const gap = Math.max(6, getFontSize(8, config.fontSizeSummary))
  return (
    <VStack alignment="leading" spacing={Math.max(2, getFontSize(3, config.fontSizeSummary))} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={labelF} fontWeight="medium" foregroundStyle="secondaryLabel" lineLimit={1} minScaleFactor={0.5}>
          自选估值
        </Text>
        <Spacer />
        <Text font={getFontSize(9, config.fontSizeSummary)} foregroundStyle="tertiaryLabel" lineLimit={1} minScaleFactor={0.5}>
          {timeLabel}
        </Text>
      </HStack>
      <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
        <VStack alignment="leading" spacing={1}>
          <Text font={labelF} foregroundStyle="secondaryLabel" lineLimit={1}>
            当日收益
          </Text>
          <Text font={valueF} fontWeight="bold" foregroundStyle={pnlColor(summary.dayPnl, config.redUp)} lineLimit={1} minScaleFactor={0.5}>
            {formatMoney(summary.dayPnl, 0)}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="leading" spacing={1}>
          <Text font={labelF} foregroundStyle="secondaryLabel" lineLimit={1}>
            持有收益
          </Text>
          <Text font={valueF} fontWeight="bold" foregroundStyle={pnlColor(summary.holdPnl, config.redUp)} lineLimit={1} minScaleFactor={0.5}>
            {formatMoney(summary.holdPnl, 0)}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={1}>
          <Text font={getFontSize(9, config.fontSizeSummary)} foregroundStyle="tertiaryLabel" lineLimit={1}>
            持仓
          </Text>
          <Text font={subF} fontWeight="semibold" foregroundStyle="label" lineLimit={1} minScaleFactor={0.5}>
            {formatMoney(summary.marketValue, 0)}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  )
}

/** 空列表提示 */
export function EmptyHint({ page, config }: { page: WidgetPage; config: WidgetConfig }) {
  const label = page === "fund" ? "基金" : "股票"
  return (
    <Text font={getFontSize(11, config.fontSizeList)} foregroundStyle="secondaryLabel">
      还没有{label}，去控制台添加
    </Text>
  )
}

/** 基金列头：7列 — 名称 | 份额 | 成本 | 昨涨 | 今涨 | 当日 | 持有 */
function FundColHeader({ config }: { config: WidgetConfig }) {
  const f = getFontSize(9, config.fontSizeList)
  // 7列：名称 | 份额 | 成本 | 昨涨 | 今涨 | 当日 | 持有
  const nW = Math.max(34, scaleW(42, config.fontSizeList))
  const wShares = scaleW(28, config.fontSizeList)
  const wn = scaleW(26, config.fontSizeList)
  const wPrev = scaleW(26, config.fontSizeList)
  const wToday = scaleW(28, config.fontSizeList)
  const wPnl = scaleW(28, config.fontSizeList)
  const gap = Math.max(1, config.columnGap || 2)
  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: nW, alignment: "leading" }} lineLimit={1}>
        名称
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wShares, alignment: "trailing" }} lineLimit={1}>
        份额
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wn, alignment: "trailing" }} lineLimit={1}>
        成本
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wPrev, alignment: "trailing" }} lineLimit={1}>
        昨涨
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wToday, alignment: "trailing" }} lineLimit={1}>
        今涨
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wPnl, alignment: "trailing" }} lineLimit={1}>
        当日
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wPnl, alignment: "trailing" }} lineLimit={1}>
        持有
      </Text>
    </HStack>
  )
}

/** 基金行：名称 | 份额 | 成本 | 昨涨 | 今涨 | 当日¥ | 持有¥ */
function FundRow({ row, config }: { row: FundRowView; config: WidgetConfig }) {
  const todayTag = row.isOfficial ? "净" : "估"
  const todayColor = pnlColor(row.changePct, config.redUp)
  const displayName = (row.alias || abbreviateFundName(row.name, 6)).trim() || row.code
  const nameFont = getFontSize(10, config.fontSizeName)
  const numFont = getFontSize(9, config.fontSizeNum)
  const nW = Math.max(34, scaleW(42, config.fontSizeList))
  const wShares = scaleW(28, config.fontSizeList)
  const wn = scaleW(26, config.fontSizeList)
  const wPrev = scaleW(26, config.fontSizeList)
  const wToday = scaleW(28, config.fontSizeList)
  const wPnl = scaleW(28, config.fontSizeList)
  const chartParams = `fund|${row.code}|${row.alias || row.name}`
  const costPrice =
    row.costAmount > 0 && row.shares > 0
      ? row.costAmount / row.shares
      : null
  const gap = Math.max(2, config.columnGap || 2)

  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <VStack spacing={0} frame={{ width: nW, alignment: "leading" }}>
        <Button
          intent={OpenFundChartIntent(chartParams)}
          buttonStyle="plain"
          padding={{ top: 0, bottom: 0, leading: 0, trailing: 0 }}
        >
          <Text font={nameFont} fontWeight="medium" lineLimit={1} minScaleFactor={0.5}>
            {displayName}
          </Text>
        </Button>
      </VStack>
      <Text
        font={numFont}
        foregroundStyle="tertiaryLabel"
        frame={{ width: wShares, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {row.shares > 0 ? row.shares.toFixed(0) : "--"}
      </Text>
      <Text
        font={numFont}
        foregroundStyle="secondaryLabel"
        frame={{ width: wn, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
      >
        {costPrice != null ? formatPrice(costPrice) : "--"}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.prevChgPct, config.redUp)}
        frame={{ width: wPrev, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.7}
      >
        {row.prevChgPct != null ? formatPct(row.prevChgPct, 1) : "--"}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={todayColor}
        frame={{ width: wToday, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.7}
      >
        {todayTag}
        {formatPct(row.changePct, 1)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.dayPnl, config.redUp)}
        frame={{ width: wPnl, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatMoney(row.dayPnl, 0)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.holdPnl, config.redUp)}
        frame={{ width: wPnl, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatMoney(row.holdPnl, 0)}
      </Text>
    </HStack>
  )
}

/** 股票列头：名称 | 股数 | 成本 | 现价 | 涨跌 | 当日 | 持有 */
function StockColHeader({ config }: { config: WidgetConfig }) {
  const f = getFontSize(9, config.fontSizeList)
  // 7列：名称 | 股数 | 成本 | 现价 | 涨跌 | 当日 | 持有
  const nW = Math.max(34, scaleW(42, config.fontSizeList))
  const wq = scaleW(28, config.fontSizeList)
  const w = scaleW(26, config.fontSizeList)
  const gap = Math.max(1, config.columnGap || 2)
  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: nW, alignment: "leading" }} lineLimit={1}>
        名称
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: wq, alignment: "trailing" }} lineLimit={1}>
        股数
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        成本
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        现价
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        涨跌
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        当日
      </Text>
      <Text font={f} fontWeight="medium" foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        持有
      </Text>
    </HStack>
  )
}

/** 股票行：名称 | 股数 | 成本 | 现价 | 涨跌 | 当日¥ | 持有¥ */
function StockRow({ row, config }: { row: StockRowView; config: WidgetConfig }) {
  const displayName = (row.alias || row.name.slice(0, 6)).trim() || row.code
  const nameFont = getFontSize(10, config.fontSizeName)
  const numFont = getFontSize(9, config.fontSizeNum)
  const nW = Math.max(34, scaleW(42, config.fontSizeList))
  const wq = scaleW(28, config.fontSizeList)
  const w = scaleW(26, config.fontSizeList)
  const chartParams = `stock|${row.code}|${row.alias || row.name}|${row.secid}`
  const costPrice =
    row.costAmount > 0 && row.quantity > 0
      ? row.costAmount / row.quantity
      : null
  const gap = Math.max(2, config.columnGap || 2)
  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <VStack spacing={0} frame={{ width: nW, alignment: "leading" }}>
        <Button
          intent={OpenFundChartIntent(chartParams)}
          buttonStyle="plain"
          padding={{ top: 0, bottom: 0, leading: 0, trailing: 0 }}
        >
          <Text font={nameFont} fontWeight="medium" lineLimit={1} minScaleFactor={0.5}>
            {displayName}
          </Text>
        </Button>
      </VStack>
      <Text
        font={numFont}
        foregroundStyle="tertiaryLabel"
        frame={{ width: wq, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {row.quantity > 0 ? row.quantity.toFixed(0) : "--"}
      </Text>
      <Text
        font={numFont}
        foregroundStyle="secondaryLabel"
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
      >
        {costPrice != null ? formatPrice(costPrice) : "--"}
      </Text>
      <Text
        font={getFontSize(10, config.fontSizeList)}
        foregroundStyle="secondaryLabel"
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatPrice(row.price)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.changePct, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatPct(row.changePct, 1)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.dayPnl, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatMoney(row.dayPnl, 0)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.holdPnl, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.5}
      >
        {formatMoney(row.holdPnl, 0)}
      </Text>
    </HStack>
  )
}

/** 列表分页控制 */
function PaginationBar({
  kind,
  curPage,
  total,
  pageSize,
  config,
}: {
  kind: "fund" | "stock"
  curPage: number
  total: number
  pageSize: number
  config: WidgetConfig
}) {
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  const hasPrev = curPage > 0
  const hasNext = curPage < maxPage
  const start = curPage * pageSize + 1
  const end = Math.min((curPage + 1) * pageSize, total)
  const f = getFontSize(11, config.fontSizeList)
  return (
    <HStack spacing={Math.max(4, getFontSize(6, config.fontSizeList))} frame={{ maxWidth: "infinity" }}>
      <Button intent={ShiftListPageIntent(`${kind}:prev`)} buttonStyle="plain" disabled={!hasPrev}>
        <Text font={f} foregroundStyle={hasPrev ? "label" : "tertiaryLabel"}>
          上页
        </Text>
      </Button>
      <Text font={getFontSize(10, config.fontSizeList)} foregroundStyle="secondaryLabel">
        {start}-{end}/{total}
      </Text>
      <Button intent={ShiftListPageIntent(`${kind}:next`)} buttonStyle="plain" disabled={!hasNext}>
        <Text font={f} foregroundStyle={hasNext ? "label" : "tertiaryLabel"}>
          下页
        </Text>
      </Button>
    </HStack>
  )
}

/** 列表视图（基金/股票）：中等及以上尺寸小组件 */
export function WatchlistWidgetView({
  page,
  snap,
  config,
}: {
  page: WidgetPage
  snap: PortfolioSnapshot
  config: WidgetConfig
}) {
  const isFund = page === "fund"
  const summary = isFund ? snap.fundSummary : snap.stockSummary
  const timeLabel = formatClock(snap.updatedAt)
  const allRows = (isFund ? snap.funds : snap.stocks) as (FundRowView | StockRowView)[]

  const pageSize = isFund
    ? Math.max(1, config.maxFundRows || 6)
    : Math.max(1, config.maxStockRows || 6)
  const curPage = Math.min(getListPage(isFund ? "fund" : "stock"), Math.max(0, Math.ceil(allRows.length / pageSize) - 1))
  const rows = allRows.slice(curPage * pageSize, (curPage + 1) * pageSize)

  const pad = { leading: 10, trailing: 10, top: 8, bottom: 8 }
  const stackGap = Math.max(2, getFontSize(4, config.fontSizeList))
  const rowGap = Math.max(2, getFontSize(3, config.fontSizeList))
  return (
    <VStack
      alignment="leading"
      spacing={stackGap}
      padding={pad}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}
      widgetBackground="systemBackground"
    >
      <PageTabs page={page} config={config} />
      <SummaryBar summary={summary} timeLabel={timeLabel} config={config} />
      <Divider />
      {rows.length === 0 ? (
        <EmptyHint page={page} config={config} />
      ) : (
        <VStack alignment="leading" spacing={rowGap} frame={{ maxWidth: "infinity" }}>
          {isFund ? <FundColHeader config={config} /> : <StockColHeader config={config} />}
          {isFund
            ? (rows as FundRowView[]).map((r) => <FundRow key={r.code} row={r} config={config} />)
            : (rows as StockRowView[]).map((r) => <StockRow key={r.secid} row={r} config={config} />)}
        </VStack>
      )}
      {/* 列表撑满中间，分页固定贴底 */}
      <Spacer />
      {allRows.length > pageSize ? (
        <PaginationBar
          kind={isFund ? "fund" : "stock"}
          curPage={curPage}
          total={allRows.length}
          pageSize={pageSize}
          config={config}
        />
      ) : (
        <Text font={getFontSize(10, config.fontSizeList)} foregroundStyle="tertiaryLabel">
          共 {allRows.length} 只
        </Text>
      )}
      <Text font={getFontSize(8, config.fontSizeList)} foregroundStyle="tertiaryLabel" lineLimit={1}>
        {isFund
          ? `点名称看历史 · 估=季报持仓${snap.warnings.length ? " · " + snap.warnings[0] : ""}`
          : `点名称看历史涨跌${snap.warnings.length ? " · " + snap.warnings[0] : ""}`}
      </Text>
    </VStack>
  )
}

/** 小尺寸紧凑视图（systemSmall / accessoryRectangular）：突出当日/持有收益 */
export function CompactWidgetView({
  page,
  snap,
  config,
}: {
  page: WidgetPage
  snap: PortfolioSnapshot
  config: WidgetConfig
}) {
  const summary = page === "fund" ? snap.fundSummary : snap.stockSummary
  const kind = page === "fund" ? "基金" : "股票"
  const pad = layoutPad(config.fontSizeSummary)
  // 小尺寸主金额封顶，避免大字号溢出
  const mainF = getFontSize(16, config.fontSizeSummary)
  const subF = getFontSize(11, config.fontSizeSummary)
  const labelF = getFontSize(9, config.fontSizeSummary)
  return (
    <VStack
      alignment="leading"
      spacing={Math.max(4, getFontSize(6, config.fontSizeSummary))}
      padding={pad}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}
      widgetBackground="systemBackground"
    >
      <PageTabs page={page} config={config} />
      <Text font={getFontSize(10, config.fontSizeSummary)} foregroundStyle="secondaryLabel" lineLimit={1}>
        {kind} · 当日收益
      </Text>
      <Text
        font={mainF}
        fontWeight="bold"
        foregroundStyle={pnlColor(summary.dayPnl, config.redUp)}
        lineLimit={1}
        minScaleFactor={0.6}
      >
        {formatMoney(summary.dayPnl, 0)}
      </Text>
      <HStack spacing={Math.max(8, getFontSize(8, config.fontSizeSummary))}>
        <VStack alignment="leading" spacing={1}>
          <Text font={labelF} foregroundStyle="tertiaryLabel" lineLimit={1} minScaleFactor={0.85}>
            持有收益
          </Text>
          <Text
            font={subF}
            fontWeight="semibold"
            foregroundStyle={pnlColor(summary.holdPnl, config.redUp)}
            lineLimit={1}
            minScaleFactor={0.7}
          >
            {formatMoney(summary.holdPnl, 0)}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={1}>
          <Text font={labelF} foregroundStyle="tertiaryLabel" lineLimit={1} minScaleFactor={0.85}>
            持仓
          </Text>
          <Text font={subF} fontWeight="medium" foregroundStyle="label" lineLimit={1} minScaleFactor={0.7}>
            {formatMoney(summary.marketValue, 0)}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  )
}
