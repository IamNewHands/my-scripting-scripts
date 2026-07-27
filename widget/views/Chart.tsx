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
  FundOverview,
  HistoryTableRow,
  StockOverview,
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
  overviewData,
  config,
}: {
  chartState: WidgetChartState
  chartData: HistoryTableRow[]
  holdingsData: FundHoldingRow[]
  holdingsQuotes: Map<string, { price: number | null; changePct: number | null }>
  holdingsUpdatedAt?: number
  overviewData?: FundOverview | StockOverview | null
  config: WidgetConfig
}) {
  const isStock = chartState.kind === "stock"
  const currentTab = chartState.tab || "history"
  // 基金总是支持持仓；股票仅 ETF 支持
  const supportsHoldings = !isStock || (chartState.code && isETF(chartState.code))

  const fTitle = getFontSize(12, config.fontSizeDetail)
  const fTab = getFontSize(12, config.fontSizeDetail)
  const pad = layoutPad(config.fontSizeDetail)
  const gap = Math.max(3, getFontSize(4, config.fontSizeDetail))

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
        <VStack spacing={1} alignment="trailing">
          <Text font={fTitle} fontWeight="medium" lineLimit={1} minScaleFactor={0.75}>
            {chartState.name}
          </Text>
          <Text font={getFontSize(9, config.fontSizeDetail)} foregroundStyle="secondaryLabel" lineLimit={1}>
            {chartState.code}
          </Text>
        </VStack>
      </HStack>

      {/* Tab 切换 */}
      <HStack spacing={Math.max(6, getFontSize(8, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
        <Button
          intent={SetChartTabIntent("overview")}
          buttonStyle="plain"
          padding={{ top: 4, bottom: 4, leading: 8, trailing: 8 }}
        >
          <Text
            font={fTab}
            fontWeight={currentTab === "overview" ? "bold" : "regular"}
            foregroundStyle={currentTab === "overview" ? "red" : "secondaryLabel"}
          >
            概况
          </Text>
        </Button>
        <Spacer />
      </HStack>

      {currentTab === "history" ? (
        <HistoryTabView chartState={chartState} chartData={chartData} config={config} />
      ) : currentTab === "overview" ? (
        <OverviewTabView isStock={isStock} overviewData={overviewData} config={config} />
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

  const f = getFontSize(9, config.fontSizeDetail)
  const fSmall = getFontSize(8, config.fontSizeDetail)
  const fTab = getFontSize(12, config.fontSizeDetail)
  const needPager = total > pageSize
  const wDate = scaleW(44, config.fontSizeDetail)
  const wChg = scaleW(48, config.fontSizeDetail)

  return (
    <>
      <HStack spacing={Math.max(4, getFontSize(6, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
        <VStack alignment="leading" spacing={Math.max(1, getFontSize(2, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
          <HStack spacing={Math.max(3, scaleW(4, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
            <HStack key={`${d.date}-${i}`} spacing={Math.max(3, scaleW(4, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
        <Text font={getFontSize(10, config.fontSizeDetail)} foregroundStyle="secondaryLabel">
          暂无数据
        </Text>
      )}

      <Spacer />
      {needPager ? (
        <HStack spacing={Math.max(4, getFontSize(6, config.fontSizeDetail))}>
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
  const f = getFontSize(9, config.fontSizeDetail)
  const fSmall = getFontSize(8, config.fontSizeDetail)
  const rows = holdingsData.slice(0, 10) // 只显示前 10
  const wPrice = scaleW(40, config.fontSizeDetail)
  const wChg = scaleW(46, config.fontSizeDetail)

  return (
    <>
      {rows.length > 0 ? (
        <VStack alignment="leading" spacing={Math.max(1, getFontSize(2, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
          {/* 表头：名称(代码) | 价格 | 涨跌 */}
          <HStack spacing={Math.max(3, scaleW(4, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
              <HStack key={`${h.code}-${i}`} spacing={Math.max(3, scaleW(4, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
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
        <Text font={getFontSize(10, config.fontSizeDetail)} foregroundStyle="secondaryLabel">
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

/** 概况 tab：显示基金/股票基础信息 */
function OverviewTabView({
  isStock,
  overviewData,
  config,
}: {
  isStock: boolean
  overviewData: FundOverview | StockOverview | null | undefined
  config: WidgetConfig
}) {
  const baseFont = getFontSize(11, config.fontSizeDetail)
  const labelFont = getFontSize(9, config.fontSizeDetail)

  /** 将数据行两两配对成 [标签, 值] 的二维网格 */
  function chunkRows<T>(items: T[]): T[][] {
    const result: T[][] = []
    for (let i = 0; i < items.length; i += 2) {
      result.push(items.slice(i, i + 2))
    }
    return result
  }

  /** 渲染一个数据网格单元：标签和值同行显示 */
  function DataCell({ label, value }: { label: string; value: string }) {
    return (
      <HStack spacing={3} frame={{ maxWidth: "infinity" }}>
        <Text font={labelFont} foregroundStyle="tertiaryLabel" lineLimit={1}>
          {label}：
        </Text>
        <Text font={baseFont} fontWeight="bold" foregroundStyle="label" lineLimit={1} minScaleFactor={0.7}>
          {value}
        </Text>
        <Spacer />
      </HStack>
    )
  }

  if (!overviewData) {
    return (
      <Text font={getFontSize(10, config.fontSizeDetail)} foregroundStyle="secondaryLabel">
        暂无数据
      </Text>
    )
  }

  if (isStock) {
    const d = overviewData as StockOverview
    const items = [
      { label: "最新价", value: d.price != null ? d.price.toFixed(2) : "--" },
      { label: "涨跌额", value: d.change != null ? (d.change >= 0 ? "+" : "") + d.change.toFixed(2) : "--" },
      { label: "涨跌幅", value: d.changePct != null ? (d.changePct >= 0 ? "+" : "") + d.changePct.toFixed(2) + "%" : "--" },
      { label: "最高", value: d.high != null ? d.high.toFixed(2) : "--" },
      { label: "最低", value: d.low != null ? d.low.toFixed(2) : "--" },
      { label: "今开", value: d.open != null ? d.open.toFixed(2) : "--" },
      { label: "昨收", value: d.preClose != null ? d.preClose.toFixed(2) : "--" },
      { label: "成交量", value: d.volume != null ? (d.volume / 10000).toFixed(0) + "万手" : "--" },
      { label: "成交额", value: d.amount != null ? (d.amount / 100000000).toFixed(2) + "亿" : "--" },
      { label: "市盈率(动)", value: d.pe != null ? d.pe.toFixed(2) : "--" },
      { label: "总市值", value: d.totalMarketCap != null ? (d.totalMarketCap / 100000000).toFixed(2) + "亿" : "--" },
      { label: "流通市值", value: d.circulatingMarketCap != null ? (d.circulatingMarketCap / 100000000).toFixed(2) + "亿" : "--" },
      { label: "换手率", value: d.turnoverRate != null ? d.turnoverRate.toFixed(2) + "%" : "--" },
      { label: "量比", value: d.volumeRatio != null ? d.volumeRatio.toFixed(2) : "--" },
    ]
    return (
      <VStack alignment="leading" spacing={Math.max(4, getFontSize(4, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
        {chunkRows(items).map((pair, i) => (
          <HStack spacing={8} frame={{ maxWidth: "infinity" }} key={i}>
            {pair.map((item) => (
              <DataCell key={item.label} label={item.label} value={item.value} />
            ))}
            {pair.length === 1 ? <VStack frame={{ maxWidth: "infinity" }} /> : null}
          </HStack>
        ))}
      </VStack>
    )
  }

  // 基金概况
  const d = overviewData as FundOverview
  const total = d.assetAllocation
  const ret = d.returns
  const sections = [
    { title: "费率", rows: [
      { label: "申购费率", value: d.subscribeRate != null ? d.subscribeRate + "%" : "--" },
      { label: "管理费率", value: d.manageFee != null ? d.manageFee + "%" : "--" },
      { label: "托管费率", value: d.custodianFee != null ? d.custodianFee + "%" : "--" },
      { label: "销售服务费", value: d.serviceFee != null ? d.serviceFee + "%" : "--" },
    ]},
    { title: "资产配置", rows: [
      { label: "股票占比", value: total?.stock != null ? total.stock.toFixed(2) + "%" : "--" },
      { label: "债券占比", value: total?.bond != null ? total.bond.toFixed(2) + "%" : "--" },
      { label: "现金占比", value: total?.cash != null ? total.cash.toFixed(2) + "%" : "--" },
    ]},
    { title: "阶段收益", rows: [
      { label: "近1月", value: ret?.m1 != null ? (ret.m1 >= 0 ? "+" : "") + ret.m1.toFixed(2) + "%" : "--" },
      { label: "近3月", value: ret?.m3 != null ? (ret.m3 >= 0 ? "+" : "") + ret.m3.toFixed(2) + "%" : "--" },
      { label: "近6月", value: ret?.m6 != null ? (ret.m6 >= 0 ? "+" : "") + ret.m6.toFixed(2) + "%" : "--" },
      { label: "近1年", value: ret?.y1 != null ? (ret.y1 >= 0 ? "+" : "") + ret.y1.toFixed(2) + "%" : "--" },
    ]},
    { title: "基本信息", rows: [
      { label: "基金规模", value: d.fundSize != null ? d.fundSize.toFixed(2) + "亿" : "--" },
      { label: "基金经理", value: d.fundManager?.name ?? "--" },
      { label: "任职时长", value: d.fundManager?.workTime ?? "--" },
      { label: "管理规模", value: d.fundManager?.fundSize ?? "--" },
    ]},
  ]

  return (
    <VStack alignment="leading" spacing={Math.max(6, getFontSize(6, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }}>
      {sections.map((s) => (
        <VStack alignment="leading" spacing={Math.max(2, getFontSize(3, config.fontSizeDetail))} frame={{ maxWidth: "infinity" }} key={s.title}>
          <Text font={labelFont} fontWeight="medium" foregroundStyle="secondaryLabel">
            {s.title}
          </Text>
          {chunkRows(s.rows).map((pair, i) => (
            <HStack spacing={8} frame={{ maxWidth: "infinity" }} key={i}>
              {pair.map((item) => (
                <DataCell key={item.label} label={item.label} value={item.value} />
              ))}
              {pair.length === 1 ? <VStack frame={{ maxWidth: "infinity" }} /> : null}
            </HStack>
          ))}
        </VStack>
      ))}
    </VStack>
  )
}
