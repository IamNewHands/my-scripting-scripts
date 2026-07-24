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
import { getFontSize, layoutPad, nameMinW, scaleW } from "../common/fontScale"

/** 页标签：基金 / 股票 切换 + 刷新 */
export function PageTabs({ page, config }: { page: WidgetPage; config: WidgetConfig }) {
  if (page === "chart") return null
  const fundActive = page === "fund"
  const stockActive = page === "stock"
  const f = getFontSize(13, config.fontSize)
  const gap = Math.max(10, getFontSize(10, config.fontSize))
  const btnPad = { top: 4, bottom: 4, leading: 8, trailing: 8 }
  return (
    <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
      <Button intent={SwitchToFundPageIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text
          font={f}
          fontWeight={fundActive ? "bold" : "regular"}
          foregroundStyle={fundActive ? "red" : "secondaryLabel"}
        >
          {fundActive ? "基金●" : "基金"}
        </Text>
      </Button>
      <Button intent={SwitchToStockPageIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text
          font={f}
          fontWeight={stockActive ? "bold" : "regular"}
          foregroundStyle={stockActive ? "red" : "secondaryLabel"}
        >
          {stockActive ? "股票●" : "股票"}
        </Text>
      </Button>
      <Spacer />
      <Button intent={RefreshWatchlistIntent(undefined)} buttonStyle="plain" padding={btnPad}>
        <Text font={getFontSize(11, config.fontSize)} foregroundStyle="secondaryLabel">
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
  const labelF = getFontSize(10, config.fontSize)
  // 收益主数字：醒目但上限 20，避免特大档占满整屏
  const valueF = Math.min(20, getFontSize(17, config.fontSize))
  const subF = getFontSize(11, config.fontSize)
  const gap = Math.max(8, getFontSize(10, config.fontSize))
  return (
    <VStack alignment="leading" spacing={Math.max(3, getFontSize(4, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={labelF} fontWeight="medium" foregroundStyle="secondaryLabel" lineLimit={1}>
          自选估值
        </Text>
        <Spacer />
        <Text font={getFontSize(9, config.fontSize)} foregroundStyle="tertiaryLabel" lineLimit={1}>
          {timeLabel}
        </Text>
      </HStack>
      <HStack spacing={gap} frame={{ maxWidth: "infinity" }}>
        <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font={labelF} foregroundStyle="secondaryLabel" lineLimit={1}>
            当日收益
          </Text>
          <Text font={valueF} fontWeight="bold" foregroundStyle={pnlColor(summary.dayPnl, config.redUp)} lineLimit={1} minScaleFactor={0.7}>
            {formatMoney(summary.dayPnl, 0)}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={1} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font={labelF} foregroundStyle="secondaryLabel" lineLimit={1}>
            持有收益
          </Text>
          <Text font={valueF} fontWeight="bold" foregroundStyle={pnlColor(summary.holdPnl, config.redUp)} lineLimit={1} minScaleFactor={0.7}>
            {formatMoney(summary.holdPnl, 0)}
          </Text>
        </VStack>
        <VStack alignment="trailing" spacing={1}>
          <Text font={getFontSize(9, config.fontSize)} foregroundStyle="tertiaryLabel" lineLimit={1}>
            持仓
          </Text>
          <Text font={subF} fontWeight="semibold" foregroundStyle="label" lineLimit={1} minScaleFactor={0.7}>
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
    <Text font={getFontSize(11, config.fontSize)} foregroundStyle="secondaryLabel">
      还没有{label}，去控制台添加
    </Text>
  )
}

/** 基金列头：名称 | 昨涨 | 今涨 | 当日¥ | 持有¥ */
function FundColHeader({ config }: { config: WidgetConfig }) {
  const f = getFontSize(9, config.fontSize)
  const wPrev = scaleW(38, config.fontSize)
  const wToday = scaleW(44, config.fontSize)
  const wPnl = scaleW(42, config.fontSize)
  const nMin = nameMinW(config.fontSize)
  return (
    <HStack spacing={Math.max(2, scaleW(3, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <Text
        font={f}
        foregroundStyle="secondaryLabel"
        frame={{ minWidth: nMin, maxWidth: "infinity", alignment: "leading" }}
        lineLimit={1}
      >
        名称
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: wPrev, alignment: "trailing" }} lineLimit={1}>
        昨涨
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: wToday, alignment: "trailing" }} lineLimit={1}>
        今涨
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: wPnl, alignment: "trailing" }} lineLimit={1}>
        当日
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: wPnl, alignment: "trailing" }} lineLimit={1}>
        持有
      </Text>
    </HStack>
  )
}

/** 基金行：名称弹性宽度，点名称打开小组件内图表 */
function FundRow({ row, config }: { row: FundRowView; config: WidgetConfig }) {
  const todayTag = row.isOfficial ? "净" : "估"
  const todayColor = pnlColor(row.changePct, config.redUp)
  const displayName = (row.alias || abbreviateFundName(row.name, 8)).trim() || row.code
  const nameFont = Math.min(13, getFontSize(12, config.fontSize))
  const numFont = Math.min(12, getFontSize(11, config.fontSize))
  const wPrev = scaleW(38, config.fontSize)
  const wToday = scaleW(44, config.fontSize)
  const wPnl = scaleW(42, config.fontSize)
  const nMin = nameMinW(config.fontSize)
  const chartParams = `fund|${row.code}|${row.alias || row.name}`

  return (
    <HStack spacing={Math.max(2, scaleW(3, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <Button
        intent={OpenFundChartIntent(chartParams)}
        buttonStyle="plain"
        frame={{ minWidth: nMin, maxWidth: "infinity", alignment: "leading" }}
      >
        <Text font={nameFont} fontWeight="medium" lineLimit={1} minScaleFactor={0.65}>
          {displayName}
        </Text>
      </Button>
      <Text
        font={numFont}
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
        foregroundStyle={pnlColor(row.dayPnl, config.redUp)}
        frame={{ width: wPnl, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.7}
      >
        {formatMoney(row.dayPnl, 0)}
      </Text>
      <Text
        font={numFont}
        foregroundStyle={pnlColor(row.holdPnl, config.redUp)}
        frame={{ width: wPnl, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.7}
      >
        {formatMoney(row.holdPnl, 0)}
      </Text>
    </HStack>
  )
}

/** 股票列头 */
function StockColHeader({ config }: { config: WidgetConfig }) {
  const f = getFontSize(9, config.fontSize)
  const w = scaleW(42, config.fontSize)
  const nMin = nameMinW(config.fontSize)
  return (
    <HStack spacing={Math.max(2, scaleW(3, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <Text
        font={f}
        foregroundStyle="secondaryLabel"
        frame={{ minWidth: nMin, maxWidth: "infinity", alignment: "leading" }}
        lineLimit={1}
      >
        名称
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        现价
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        涨跌
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        当日
      </Text>
      <Text font={f} foregroundStyle="secondaryLabel" frame={{ width: w, alignment: "trailing" }} lineLimit={1}>
        持有
      </Text>
    </HStack>
  )
}

/** 股票行：点名称打开历史涨跌表 */
function StockRow({ row, config }: { row: StockRowView; config: WidgetConfig }) {
  const displayName = (row.alias || row.name.slice(0, 8)).trim() || row.code
  const nameFont = Math.min(13, getFontSize(12, config.fontSize))
  const numFont = Math.min(12, getFontSize(11, config.fontSize))
  const w = scaleW(42, config.fontSize)
  const nMin = nameMinW(config.fontSize)
  const chartParams = `stock|${row.code}|${row.alias || row.name}|${row.secid}`
  return (
    <HStack spacing={Math.max(2, scaleW(3, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <Button
        intent={OpenFundChartIntent(chartParams)}
        buttonStyle="plain"
        frame={{ minWidth: nMin, maxWidth: "infinity", alignment: "leading" }}
      >
        <Text font={nameFont} fontWeight="medium" lineLimit={1} minScaleFactor={0.65}>
          {displayName}
        </Text>
      </Button>
      <Text
        font={getFontSize(10, config.fontSize)}
        foregroundStyle="secondaryLabel"
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
      >
        {formatPrice(row.price)}
      </Text>
      <Text
        font={numFont}
        fontWeight="semibold"
        foregroundStyle={pnlColor(row.changePct, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
      >
        {formatPct(row.changePct, 1)}
      </Text>
      <Text
        font={numFont}
        foregroundStyle={pnlColor(row.dayPnl, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
      >
        {formatMoney(row.dayPnl, 0)}
      </Text>
      <Text
        font={numFont}
        foregroundStyle={pnlColor(row.holdPnl, config.redUp)}
        frame={{ width: w, alignment: "trailing" }}
        lineLimit={1}
        minScaleFactor={0.65}
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
  const f = getFontSize(11, config.fontSize)
  return (
    <HStack spacing={Math.max(4, getFontSize(6, config.fontSize))} frame={{ maxWidth: "infinity" }}>
      <Button intent={ShiftListPageIntent(`${kind}:prev`)} buttonStyle="plain" disabled={!hasPrev}>
        <Text font={f} foregroundStyle={hasPrev ? "label" : "tertiaryLabel"}>
          上页
        </Text>
      </Button>
      <Text font={getFontSize(10, config.fontSize)} foregroundStyle="secondaryLabel">
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

  const pad = layoutPad(config.fontSize)
  const stackGap = Math.max(4, getFontSize(6, config.fontSize))
  const rowGap = Math.max(3, getFontSize(5, config.fontSize))
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
        <Text font={getFontSize(10, config.fontSize)} foregroundStyle="tertiaryLabel">
          共 {allRows.length} 只
        </Text>
      )}
      <Text font={getFontSize(8, config.fontSize)} foregroundStyle="tertiaryLabel" lineLimit={1}>
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
  const pad = layoutPad(config.fontSize)
  return (
    <VStack
      alignment="leading"
      spacing={Math.max(4, getFontSize(6, config.fontSize))}
      padding={pad}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}
      widgetBackground="systemBackground"
    >
      <PageTabs page={page} config={config} />
      <Text font={getFontSize(10, config.fontSize)} foregroundStyle="secondaryLabel">
        {kind} · 当日收益
      </Text>
      <Text font={getFontSize(22, config.fontSize)} fontWeight="bold" foregroundStyle={pnlColor(summary.dayPnl)}>
        {formatMoney(summary.dayPnl, 0)}
      </Text>
      <HStack spacing={12}>
        <VStack alignment="leading" spacing={1}>
          <Text font={getFontSize(9, config.fontSize)} foregroundStyle="tertiaryLabel">
            持有收益
          </Text>
          <Text font={getFontSize(13, config.fontSize)} fontWeight="semibold" foregroundStyle={pnlColor(summary.holdPnl)}>
            {formatMoney(summary.holdPnl, 0)}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={1}>
          <Text font={getFontSize(9, config.fontSize)} foregroundStyle="tertiaryLabel">
            持仓
          </Text>
          <Text font={getFontSize(13, config.fontSize)} fontWeight="medium" foregroundStyle="label">
            {formatMoney(summary.marketValue, 0)}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  )
}
