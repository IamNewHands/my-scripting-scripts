/** 翻译引擎与本地设置 */
export type TranslateEngine = "system" | "ai"

const ENGINE_KEY = "translate_engine"

/** 读取当前翻译引擎，默认 AI（兼容原行为） */
export function getTranslateEngine(): TranslateEngine {
  const value = Storage.get<string>(ENGINE_KEY)
  return value === "system" ? "system" : "ai"
}

/** 保存翻译引擎选择 */
export function setTranslateEngine(engine: TranslateEngine) {
  Storage.set(ENGINE_KEY, engine)
}

/** 引擎展示名称 */
export function getTranslateEngineLabel(engine: TranslateEngine) {
  return engine === "system" ? "系统翻译" : "AI 翻译"
}
