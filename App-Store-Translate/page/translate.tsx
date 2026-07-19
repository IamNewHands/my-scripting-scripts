import {
  Button,
  ProgressView,
  Section,
  Text,
  useEffect,
  useObservable,
} from "scripting"
import type { TranslateEngine } from "../util/settings"
import { translateText } from "../util/translate"

export function TranslateSection({
  content,
  engine,
  translation,
}: {
  content: string
  engine: TranslateEngine
  translation?: Translation
}) {
  const text = useObservable("")
  const error = useObservable("")
  const loading = useObservable(false)

  async function translateContent() {
    text.setValue("")
    error.setValue("")
    if (!content) return

    loading.setValue(true)
    try {
      const result = await translateText({
        text: content,
        engine,
        translation,
        onPartial: (partial) => text.setValue(partial),
      })
      text.setValue(result)
    } catch (e: any) {
      const message = e?.message ? String(e.message) : "翻译失败"
      error.setValue(message)
      if (!text.value) text.setValue("翻译失败：" + message)
    } finally {
      loading.setValue(false)
    }
  }

  useEffect(() => {
    translateContent()
  }, [content, engine])

  if (loading.value && !text.value) return <ProgressView />
  if (!text.value && !error.value) return <ProgressView />

  return (
    <Text
      contextMenu={{
        menuItems: (
          <>
            <Section>
              <Button title="重新翻译" action={translateContent} />
            </Section>
            <Section>
              <Button title="复制译文" action={() => Pasteboard.setString(text.value!)} />
              <Button title="复制原文" action={() => Pasteboard.setString(content)} />
            </Section>
          </>
        ),
      }}
    >
      {text.value}
    </Text>
  )
}
