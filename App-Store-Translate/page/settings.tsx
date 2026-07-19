import { List, Picker, Section, Text, useState } from "scripting"
import {
  getTranslateEngine,
  getTranslateEngineLabel,
  setTranslateEngine,
  type TranslateEngine,
} from "../util/settings"

export function SettingsView() {
  const [engine, setEngine] = useState<TranslateEngine>(() => getTranslateEngine())

  return (
    <List navigationTitle="设置">
      <Section
        header={<Text>翻译引擎</Text>}
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {engine === "system"
              ? "使用 iOS 系统翻译（需 iOS 18+，必要时会提示下载语言包）。目标语言为中文。"
              : "使用 Scripting 已配置的 AI 助手模型流式翻译为中文。需在设置中配置可用模型。"}
          </Text>
        }
      >
        <Picker
          title="引擎"
          value={engine}
          onChanged={(value: string) => {
            const next: TranslateEngine = value === "system" ? "system" : "ai"
            setEngine(next)
            setTranslateEngine(next)
          }}
        >
          <Text tag="system">{getTranslateEngineLabel("system")}</Text>
          <Text tag="ai">{getTranslateEngineLabel("ai")}</Text>
        </Picker>
      </Section>
    </List>
  )
}
