import { Button, Divider, HStack, Spacer, Text, VStack } from "scripting"
import {
  CloseFundChartIntent,
  SetChartDaysIntent,
  SetChartTabIntent,
  ShiftChartPageIntent,
} from "../../app_intents"
import { formatPct, formatPrice, pnlColor } from "../../lib/format"
import type {
  FundHoldingRow,
  HistoryTableRow,
  WidgetChartState,
  WidgetConfig,
} from "../../lib/types"
import { formatYmd, getFontSize, isETF, layoutPad, scaleW } from "../common/fontScale"

/** 图表视图：标题 + Tab 切换 + 当前 tab 内容 */
export function ChartWidgetView({
  chartState,
  chartData,
  holdingsData,
  holdingsQuotes,
  holdingsUpdatedAt,
  config,
}: {
  chartState: WidgetChartState
  chartData: HistoryTableRow[]
  holdingsData: FundHoldingRow[]
  holdingsQuotes: Map<string, { price: number | null; changePct: number | null }>
  holdingsUpdatedAt?: number
  config: WidgetConfig
}) {
  const isStock = chartState.kind === "stock"
  const currentTab = chartState.tab || "history"
  // 基金总是支持持仓；股票仅 ETF 支持
  const supportsHoldings = !isStock || (chartState.code && isETF(chartState.code))

  const fTitle = getFontSize(12, config.fontSize)
  const fTab = getFontSize(12, config.fontSize)
  const pad = layoutPad(config.fontSize)
  const gap = Math.max(3, getFontSize(4, config.fontSize))

  return (
    <VStack
      alignment="leading"
      spacing={gap}
      padding={pad}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}
      widgetBackground="systemBackground"
    >
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Button intent={CloseFundChartIntent(undefined)} buttonStyle="plain">
          <Text font={fTab} foregroundStyle="secondaryLabel">
            返回
          </Text>
        </Button>
        <Spacer />
        <Text font={fTitle} fontWeight="medium" lineLimit={1} minScaleFactor={0.75}>
          {chartState.name}
        </Text>
      </HStack>

      {/* Tab 切换 */}
      <HStack spacing={Math.max(6, getFontSize(8, config.fontSize))} frame={{ maxWidth: "infinity" }}>
        <Button
          intent={SetChartTabIntent("history")}
          buttonStyle="plain"
          padding={{ top: 4, bottom: 4, leading: 8, trailing: 8 }}
        >
          <Text
            font={fTab}
            fontWeight={currentTab === "history" ? "bold" : "regular"}
            foregroundStyle={currentTab === "history" ? "red" : "secondaryLabel"}
          >
            历史
          </Text>
        </Button>
        {supportsHoldings ? (
          <Button
            intent={SetChartTabIntent("holdings")}
            buttonStyle="plain"
            padding={{ top: 4, bottom: 4, leading: 8, trailing: 8 }}
          >
            <Text
              font={fTab}
              fontWeight={currentTab === "holdings" ? "bold" : "regular"}
              foregroundStyle={currentTab === "holdings" ? "red" : "secondaryLabel"}
            >
              持仓
            </Text>
          </Button>
        ) : null}
        <Spacer />
      </HStack>

      {currentTab === "history" ? (
        <HistoryTabView chartState={chartState} chartData={chartData} config={config} />
      ) : (
        <HoldingsTabView
          holdingsData={holdingsData}
          holdingsQuotes={holdingsQuotes}
          updatedAt={holdingsUpdatedAt}
          config={config}
        />
      )}
    </VStack>
  )
}

/** 历史 tab：7/15/30 切换 + 区间涨跌 + 表格 + 翻页 */
function HistoryTabView({
  chartState,
  chartData,
  config,
}: {
  chartState: WidgetChartState
  chartData: HistoryTableRow[]
  config: WidgetConfig
}) {
  const isStock = chartState.kind === "stock"
  const sorted = chartData.slice().reverse()
  const pageSize = Math.max(4, config.maxChartRows || 7)
  const total = sorted.length
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)
  const curPage = Math.min(Math.max(0, Math.floor(Number(chartState.page) || 0)), maxPage)
  const rows = sorted.slice(curPage * pageSize, (curPage + 1) * pageSize)
  const start = total === 0 ? 0 : curPage * pageSize + 1
  const end = Math.min((curPage + 1) * pageSize, total)

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null
  const first = chartData.length > 0 ? chartData[0] : null
  const totalChange =
    latest && first && first.value > 0
      ? ((latest.value - first.value) / first.value) * 100
      : 0

  const f = getFontSize(9, config.fontSize)
  const fSmall = getFontSize(8, config.fontSize)
  const fTab = getFontSize(12, config.fontSize)
  const needPager = total > pageSize
  const wDate = scaleW(44, config.fontSize)
  const wChg = scaleW(48, config.fontSize)

  return (
    <>
      <HStack spacing={Math.max(4, getFontSize(6, config.fontSize))} frame={{ maxWidth: "infinity" }}>
        <Button intent={SetChartDaysIntent("7")} buttonStyle="plain">
          <Text
            font={fTab}
            fontWeight={chartState.days === 7 ? "bold" : "regular"}
            foregroundStyle={chartState.days === 7 ? "red" : "secondaryLabel"}
          >
            7日
          </Text>
        </Button>
        <Button intent={SetChartDaysIntent("15")} buttonStyle="plain">
          <Text
            font={fTab}
            fontWeight={chartState.days === 15 ? "bold" : "regular"}
            foregroundStyle={chartState.days === 15 ? "red" : "secondaryLabel"}
          >
            15日
          </Text>
        </Button>
        <Button intent={SetChartDaysIntent("30")} buttonStyle="plain">
          <Text
            font={fTab}
            fontWeight={chartState.days === 30 ? "bold" : "regular"}
            foregroundStyle={chartState.days === 30 ? "red" : "secondaryLabel"}
          >
            30日
          </Text>
        </Button>
        <Spacer />
        {latest ? (
          <Text font={fSmall} foregroundStyle={(totalChange >= 0) === config.redUp ? "red" : "green"} lineLimit={1} minScaleFactor={0.7}>
            区间 {totalChange >= 0 ? "+" : ""}
            {totalChange.toFixed(2)}%
          </Text>
        ) : null}
      </HStack>

      {rows.length > 0 ? (
        <VStack alignment="leading" spacing={Math.max(1, getFontSize(2, config.fontSize))} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={Math.max(3, scaleW(4, config.fontSize))} frame={{ maxWidth: "infinity" }}>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ width: wDate, alignment: "leading" }}
              lineLimit={1}
            >
              日期
            </Text>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: "infinity", alignment: "trailing" }}
              lineLimit={1}
            >
              {isStock ? "收盘" : "净值"}
            </Text>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ width: wChg, alignment: "trailing" }}
              lineLimit={1}
            >
              涨跌
            </Text>
          </HStack>
          <Divider />
          {rows.map((d, i) => (
            <HStack key={`${d.date}-${i}`} spacing={Math.max(3, scaleW(4, config.fontSize))} frame={{ maxWidth: "infinity" }}>
              <Text
                font={f}
                foregroundStyle="secondaryLabel"
                frame={{ width: wDate, alignment: "leading" }}
                lineLimit={1}
              >
                {d.date.length >= 10 ? d.date.slice(5) : d.date}
              </Text>
              <Text
                font={f}
                fontWeight="medium"
                frame={{ maxWidth: "infinity", alignment: "trailing" }}
                lineLimit={1}
                minScaleFactor={0.7}
              >
                {isStock ? d.value.toFixed(2) : d.value.toFixed(4)}
              </Text>
              <Text
                font={f}
                foregroundStyle={(d.chgPct >= 0) === config.redUp ? "red" : "green"}
                frame={{ width: wChg, alignment: "trailing" }}
                lineLimit={1}
                minScaleFactor={0.7}
              >
                {((d.chgPct >= 0) === config.redUp) ? "+" : ""}
                {d.chgPct.toFixed(2)}%
              </Text>
            </HStack>
          ))}
        </VStack>
      ) : (
        <Text font={getFontSize(10, config.fontSize)} foregroundStyle="secondaryLabel">
          暂无数据
        </Text>
      )}

      <Spacer />
      {needPager ? (
        <HStack spacing={Math.max(4, getFontSize(6, config.fontSize))}>
          <Button intent={ShiftChartPageIntent("prev")} buttonStyle="plain" disabled={curPage <= 0}>
            <Text font={fTab} foregroundStyle={curPage <= 0 ? "tertiaryLabel" : "label"}>
              上页
            </Text>
          </Button>
          <Text font={fSmall} foregroundStyle="secondaryLabel">
            {start}-{end}/{total}
          </Text>
          <Button intent={ShiftChartPageIntent("next")} buttonStyle="plain" disabled={curPage >= maxPage}>
            <Text font={fTab} foregroundStyle={curPage >= maxPage ? "tertiaryLabel" : "label"}>
              下页
            </Text>
          </Button>
        </HStack>
      ) : (
        <Text font={fSmall} foregroundStyle="tertiaryLabel">
          共 {total} 条
        </Text>
      )}

      <Text font={fSmall} foregroundStyle="tertiaryLabel" lineLimit={1}>
        {chartState.code}
        {latest ? ` · 最新 ${isStock ? latest.value.toFixed(2) : latest.value.toFixed(4)}` : ""} · 近{chartState.days}日共{total}条
      </Text>
    </>
  )
}

/** 持仓 tab：基金/ETF 前 10 大重仓 + 实时行情 */
function HoldingsTabView({
  holdingsData,
  holdingsQuotes,
  updatedAt,
  config,
}: {
  holdingsData: FundHoldingRow[]
  holdingsQuotes: Map<string, { price: number | null; changePct: number | null }>
  updatedAt?: number
  config: WidgetConfig
}) {
  const f = getFontSize(9, config.fontSize)
  const fSmall = getFontSize(8, config.fontSize)
  const rows = holdingsData.slice(0, 10) // 只显示前 10
  const wPrice = scaleW(40, config.fontSize)
  const wChg = scaleW(46, config.fontSize)

  return (
    <>
      {rows.length > 0 ? (
        <VStack alignment="leading" spacing={Math.max(1, getFontSize(2, config.fontSize))} frame={{ maxWidth: "infinity" }}>
          {/* 表头：名称(代码) | 价格 | 涨跌 */}
          <HStack spacing={Math.max(3, scaleW(4, config.fontSize))} frame={{ maxWidth: "infinity" }}>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ maxWidth: "infinity", alignment: "leading" }}
              lineLimit={1}
            >
              名称（代码）
            </Text>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ width: wPrice, alignment: "trailing" }}
              lineLimit={1}
            >
              价格
            </Text>
            <Text
              font={fSmall}
              foregroundStyle="secondaryLabel"
              frame={{ width: wChg, alignment: "trailing" }}
              lineLimit={1}
            >
              涨跌
            </Text>
          </HStack>
          <Divider />
          {rows.map((h, i) => {
            const q = holdingsQuotes.get(h.secid) ?? holdingsQuotes.get(h.code)
            const price = q?.price ?? null
            const chg = q?.changePct ?? null
            return (
              <HStack key={`${h.code}-${i}`} spacing={Math.max(3, scaleW(4, config.fontSize))} frame={{ maxWidth: "infinity" }}>
                <VStack alignment="leading" spacing={0} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                  <Text
                    font={f}
                    fontWeight="medium"
                    lineLimit={1}
                    minScaleFactor={0.7}
                  >
                    {h.name}
                  </Text>
                  <Text
                    font={fSmall}
                    foregroundStyle="tertiaryLabel"
                    lineLimit={1}
                  >
                    {h.code} · {h.weightPct.toFixed(2)}%
                  </Text>
                </VStack>
                <Text
                  font={f}
                  fontWeight="medium"
                  frame={{ width: wPrice, alignment: "trailing" }}
                  lineLimit={1}
                  minScaleFactor={0.75}
                >
                  {price != null ? formatPrice(price) : "--"}
                </Text>
                <Text
                  font={f}
                  fontWeight="semibold"
                  foregroundStyle={
                    chg == null
                      ? "secondaryLabel"
                      : (chg >= 0) === config.redUp
                        ? "red"
                        : "green"
                  }
                  frame={{ width: wChg, alignment: "trailing" }}
                  lineLimit={1}
                  minScaleFactor={0.7}
                >
                  {chg == null
                  ? "--"
                  : `${(chg >= 0) === config.redUp ? "+" : ""}${chg.toFixed(2)}%`}
                </Text>
              </HStack>
            )
          })}
        </VStack>
      ) : (
        <Text font={getFontSize(10, config.fontSize)} foregroundStyle="secondaryLabel">
          暂无持仓数据
        </Text>
      )}

      <Spacer />
      <Text font={fSmall} foregroundStyle="tertiaryLabel" lineLimit={2}>
        前 {rows.length} 大重仓 · 数据来源季报
        {updatedAt
          ? ` · 报告日期：${formatYmd(updatedAt)}`
          : ""}
      </Text>
    </>
  )
}
