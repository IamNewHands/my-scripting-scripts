import { Picker, Section, Text } from "scripting"
import type { WidgetConfig, WidgetFontSize } from "../lib/types"

export type SettingsSectionProps = {
  widgetConfig: WidgetConfig
  persistWidgetConfig: (next: WidgetConfig) => void
  setStatus: (s: string) => void
}

/** 控制台「设置」Tab：字号档位、列表行数、历史表行数 */
export function SettingsSection(props: SettingsSectionProps) {
  const { widgetConfig, persistWidgetConfig, setStatus } = props
  return (
    <>
      <Section
        header={<Text>字体（全局）</Text>}
        footer={
          <Text>
            作用于小组件列表、汇总、历史净值表格等全部文字，保存后自动刷新。
          </Text>
        }
      >
        <Picker
          title="字号档位"
          value={widgetConfig.fontSize}
          onChanged={(v: string) => {
            persistWidgetConfig({ ...widgetConfig, fontSize: v as WidgetFontSize })
            setStatus("已保存，小组件将自适应新字号")
          }}
        >
          <Text tag="xsmall">特小</Text>
          <Text tag="small">小</Text>
          <Text tag="medium">中</Text>
          <Text tag="large">大</Text>
          <Text tag="xlarge">特大</Text>
        </Picker>
      </Section>

      <Section header={<Text>列表每页行数</Text>}>
        <Picker
          title="基金每页"
          value={String(widgetConfig.maxFundRows)}
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
          value={String(widgetConfig.maxStockRows)}
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
          · 字号：特小～特大，列表与历史页同步。{"\n"}
          · 列表/历史超出每页行数时用上页/下页翻页。{"\n"}
          · 修改后会自动刷新小组件，也可点「刷小组件」。
        </Text>
      </Section>
    </>
  )
}
