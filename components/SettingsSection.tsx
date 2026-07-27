import { HStack, Picker, Section, Slider, Spacer, Text, VStack } from "scripting"
import type { WidgetConfig } from "../lib/types"

export type SettingsSectionProps = {
  widgetConfig: WidgetConfig
  persistWidgetConfig: (next: WidgetConfig) => void
  setStatus: (s: string) => void
}

/** 将配置中的缩放比安全转成 80–150 的整数百分比（Slider 用） */
function toPercent(scale: unknown): number {
  const n = typeof scale === "number" ? scale : Number(scale)
  if (!Number.isFinite(n)) return 100
  // 兼容误存成 80–150 整数的情况
  const ratio = n > 3 ? n / 100 : n
  return Math.max(80, Math.min(150, Math.round(ratio * 100)))
}

/** 百分比 → 缩放比 */
function toScale(percent: number): number {
  const p = Math.max(80, Math.min(150, Math.round(percent)))
  return Math.round(p) / 100
}

/** 控制台「设置」Tab：字号滑块、列表行数、历史表行数 */
export function SettingsSection(props: SettingsSectionProps) {
  const { widgetConfig, persistWidgetConfig, setStatus } = props

  // 用 80–150 整数驱动 Slider（step 默认为 1，小数范围极易崩溃）
  const summaryPct = toPercent(widgetConfig?.fontSizeSummary)
  const namePct = toPercent(widgetConfig?.fontSizeName)
  const numPct = toPercent(widgetConfig?.fontSizeNum)
  const listPct = toPercent(widgetConfig?.fontSizeList)
  const detailPct = toPercent(widgetConfig?.fontSizeDetail)

  function patchScale(
    key: "fontSizeSummary" | "fontSizeName" | "fontSizeNum" | "fontSizeList" | "fontSizeDetail",
    percent: number,
    label: string,
  ) {
    const nextScale = toScale(percent)
    const next: WidgetConfig = {
      ...widgetConfig,
      [key]: nextScale,
    }
    persistWidgetConfig(next)
    setStatus(`${label}字号已调整为 ${Math.round(nextScale * 100)}%`)
  }

  return (
    <>
      <Section
        header={<Text>小组件字号设置</Text>}
        footer={
          <Text>
            分区域无级调整（80%–150%）。顶部=汇总栏，名称=基金/股票名称，数值=价格/涨跌金额，列表=表头/说明，明细=点开后的历史/持仓。拖动后自动刷新小组件。
          </Text>
        }
      >
        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>顶部汇总栏</Text>
            <Spacer />
            <Text font="headline">{summaryPct}%</Text>
          </HStack>
          <Slider
            min={80}
            max={150}
            step={1}
            value={summaryPct}
            label={<Text>顶部汇总栏字号</Text>}
            minValueLabel={<Text font="caption">80</Text>}
            maxValueLabel={<Text font="caption">150</Text>}
            onChanged={(v: number) => patchScale("fontSizeSummary", v, "顶部")}
          />
        </VStack>

        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>名称字号</Text>
            <Spacer />
            <Text font="headline">{namePct}%</Text>
          </HStack>
          <Slider
            min={80}
            max={150}
            step={1}
            value={namePct}
            label={<Text>名称字号</Text>}
            minValueLabel={<Text font="caption">80</Text>}
            maxValueLabel={<Text font="caption">150</Text>}
            onChanged={(v: number) => patchScale("fontSizeName", v, "名称")}
          />
        </VStack>

        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>数值字号</Text>
            <Spacer />
            <Text font="headline">{numPct}%</Text>
          </HStack>
          <Slider
            min={80}
            max={150}
            step={1}
            value={numPct}
            label={<Text>数值字号</Text>}
            minValueLabel={<Text font="caption">80</Text>}
            maxValueLabel={<Text font="caption">150</Text>}
            onChanged={(v: number) => patchScale("fontSizeNum", v, "数值")}
          />
        </VStack>

        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>列表区域</Text>
            <Spacer />
            <Text font="headline">{listPct}%</Text>
          </HStack>
          <Slider
            min={80}
            max={150}
            step={1}
            value={listPct}
            label={<Text>列表区域字号</Text>}
            minValueLabel={<Text font="caption">80</Text>}
            maxValueLabel={<Text font="caption">150</Text>}
            onChanged={(v: number) => patchScale("fontSizeList", v, "列表")}
          />
        </VStack>

        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>明细区域</Text>
            <Spacer />
            <Text font="headline">{detailPct}%</Text>
          </HStack>
          <Slider
            min={80}
            max={150}
            step={1}
            value={detailPct}
            label={<Text>明细区域字号</Text>}
            minValueLabel={<Text font="caption">80</Text>}
            maxValueLabel={<Text font="caption">150</Text>}
            onChanged={(v: number) => patchScale("fontSizeDetail", v, "明细")}
          />
        </VStack>
      </Section>

      <Section
        header={<Text>列表列间距</Text>}
        footer={
          <Text>
            基金/股票列表各列之间的间隔（名称|成本|昨涨|今涨|当日|持有）。数值越大，每列之间空隙越大。
          </Text>
        }
      >
        <VStack spacing={8} alignment="leading">
          <HStack>
            <Text>列间距</Text>
            <Spacer />
            <Text font="headline">{widgetConfig.columnGap ?? 2}px</Text>
          </HStack>
          <Slider
            min={0}
            max={20}
            step={1}
            value={widgetConfig.columnGap ?? 2}
            label={<Text>列间距</Text>}
            minValueLabel={<Text font="caption">0</Text>}
            maxValueLabel={<Text font="caption">20</Text>}
            onChanged={(v: number) => {
              persistWidgetConfig({ ...widgetConfig, columnGap: Math.round(v) })
              setStatus(`列间距已调整为 ${Math.round(v)}px`)
            }}
          />
        </VStack>
      </Section>

      <Section header={<Text>列表每页行数</Text>}>
        <Picker
          title="基金每页"
          value={String(widgetConfig.maxFundRows ?? 6)}
          onChanged={(v: string) => {
            persistWidgetConfig({ ...widgetConfig, maxFundRows: Number(v) })
            setStatus("已保存，小组件将自动刷新")
          }}
        >
          <Text tag="4">4 行</Text>
          <Text tag="5">5 行</Text>
          <Text tag="6">6 行</Text>
          <Text tag="7">7 行</Text>
          <Text tag="8">8 行</Text>
          <Text tag="10">10 行</Text>
          <Text tag="12">12 行</Text>
        </Picker>
        <Picker
          title="股票每页"
          value={String(widgetConfig.maxStockRows ?? 6)}
          onChanged={(v: string) => {
            persistWidgetConfig({ ...widgetConfig, maxStockRows: Number(v) })
            setStatus("已保存，小组件将自动刷新")
          }}
        >
          <Text tag="4">4 行</Text>
          <Text tag="5">5 行</Text>
          <Text tag="6">6 行</Text>
          <Text tag="7">7 行</Text>
          <Text tag="8">8 行</Text>
          <Text tag="10">10 行</Text>
          <Text tag="12">12 行</Text>
        </Picker>
      </Section>

      <Section
        header={<Text>历史净值表格</Text>}
        footer={
          <Text>
            打开基金历史默认 7 日。15/30 日数据完整保留，超出每页行数可点上页/下页浏览。
          </Text>
        }
      >
        <Picker
          title="每页行数"
          value={String(widgetConfig.maxChartRows ?? 7)}
          onChanged={(v: string) => {
            persistWidgetConfig({ ...widgetConfig, maxChartRows: Number(v) })
            setStatus("已保存，历史表格分页已更新")
          }}
        >
          <Text tag="5">5 行</Text>
          <Text tag="6">6 行</Text>
          <Text tag="7">7 行（默认）</Text>
          <Text tag="8">8 行</Text>
          <Text tag="10">10 行</Text>
          <Text tag="12">12 行</Text>
        </Picker>
      </Section>

      <Section
        header={<Text>涨跌色方向</Text>}
        footer={
          <Text>
            影响小组件内所有 PnL / 涨跌色：红涨绿跌（中国习惯）或绿涨红跌（海外习惯）。保存后自动刷新。
          </Text>
        }
      >
        <Picker
          title="方向"
          value={widgetConfig.redUp ? "red" : "green"}
          onChanged={(v: string) => {
            persistWidgetConfig({ ...widgetConfig, redUp: v === "red" })
            setStatus(v === "red" ? "已保存：红涨绿跌" : "已保存：绿涨红跌")
          }}
        >
          <Text tag="red">红涨绿跌（默认）</Text>
          <Text tag="green">绿涨红跌</Text>
        </Picker>
      </Section>

      <Section header={<Text>说明</Text>}>
        <Text font="caption" foregroundStyle="secondaryLabel">
          · 字号：顶部 / 列表 / 明细三个区域独立调节（80%–150%）。{"\n"}
          · 列表/历史超出每页行数时用上页/下页翻页。{"\n"}
          · 修改后会自动刷新小组件，也可点「刷小组件」。
        </Text>
      </Section>
    </>
  )
}
