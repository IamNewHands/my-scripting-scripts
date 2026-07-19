import type { TranslateEngine } from "./settings"

const AI_SYSTEM_PROMPT =
  "你是个专业的中文翻译,负责将其他文本翻译为中文,若文本为中文则不作任何修改直接返回"

export type TranslateOptions = {
  text: string
  engine: TranslateEngine
  /** 系统翻译时建议传入带 translationHost 的实例 */
  translation?: Translation
  /** 流式/渐进更新回调（AI 会多次触发，系统翻译通常一次） */
  onPartial?: (text: string) => void
}

/** 使用当前引擎将文本翻译为中文 */
export async function translateText(options: TranslateOptions): Promise<string> {
  const text = String(options.text ?? "")
  if (!text) return ""

  if (options.engine === "system") {
    return await translateWithSystem(text, options.translation, options.onPartial)
  }
  return await translateWithAI(text, options.onPartial)
}

async function translateWithSystem(
  text: string,
  translation?: Translation,
  onPartial?: (text: string) => void
) {
  const host = translation ?? Translation.shared
  const translated = await host.translate({
    text,
    target: "zh",
  })
  const result = String(translated ?? "").trim()
  if (!result) throw new Error("系统翻译没有返回可用译文")
  onPartial?.(result)
  return result
}

async function translateWithAI(text: string, onPartial?: (text: string) => void) {
  const stream = await Assistant.requestStreaming({
    systemPrompt: AI_SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  })

  let result = ""
  // 兼容 ReadableStream 与 async iterable 两种返回
  if (stream && typeof (stream as any).getReader === "function") {
    const reader = (stream as any).getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value && value.type === "text") {
        result += String(value.content ?? "")
        onPartial?.(result)
      }
    }
  } else {
    for await (const chunk of stream as any) {
      if (chunk?.type !== "text") continue
      result += String(chunk.content ?? "")
      onPartial?.(result)
    }
  }

  const normalized = result.trim()
  if (!normalized) throw new Error("AI 翻译没有返回可用译文")
  return normalized
}
