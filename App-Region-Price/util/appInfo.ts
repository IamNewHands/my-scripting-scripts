/** App 元数据提取与按需翻译 */

export type AppInfo = {
  name: string
  version: string
  releaseDate: string
  description: string
  releaseNotes: string
  descTranslated: boolean
  notesTranslated: boolean
}

/** 判断文本是否已含中文字符（CJK） */
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)
}

/** 格式化版本发布日期：ISO → YYYY年MM月DD日 */
function formatReleaseDate(raw: string): string {
  if (!raw) return ""
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 从 lookup 结果提取元数据（同步，先展示原文；翻译另行异步） */
export function extractAppInfo(r: any): AppInfo {
  return {
    name: String(r?.trackName || ""),
    version: String(r?.version || ""),
    releaseDate: formatReleaseDate(String(r?.currentVersionReleaseDate || "")),
    description: String(r?.description || ""),
    releaseNotes: String(r?.releaseNotes || ""),
    descTranslated: false,
    notesTranslated: false,
  }
}

/** 单段文本译为简体中文；已是中文则跳过；失败返回原文 */
async function toChinese(
  text: string
): Promise<{ text: string; translated: boolean }> {
  if (!text || hasChinese(text)) return { text, translated: false }
  try {
    const result = await Translation.shared.translate({
      text,
      source: undefined,
      target: "zh-Hans",
    })
    return { text: result || text, translated: true }
  } catch {
    return { text, translated: false }
  }
}

/** 对 AppInfo 的简介/更新说明按需翻译并返回新的 AppInfo */
export async function translateAppInfo(info: AppInfo): Promise<AppInfo> {
  const [desc, notes] = await Promise.all([
    toChinese(info.description),
    toChinese(info.releaseNotes),
  ])
  return {
    ...info,
    description: desc.text,
    releaseNotes: notes.text,
    descTranslated: desc.translated,
    notesTranslated: notes.translated,
  }
}

/**
 * 从多区 lookup 结果中分别选最佳描述源和最佳更新说明源。
 * 各自独立判断：有中文优先，其次 CN → US → 其它。
 */
export function pickBestFields(
  items: { region: string; result: any }[]
): { desc: any | null; notes: any | null; version: any | null } {
  const valid = items.filter((i) => i?.result)
  if (!valid.length) return { desc: null, notes: null, version: null }

  // 选最佳描述源
  let desc = null as any | null
  const descSources = valid.filter((i) => i.result.description)
  if (descSources.length) {
    const zh = descSources.find((i) =>
      hasChinese(String(i.result.description || ""))
    )
    if (zh) desc = zh.result
    else {
      for (const code of ["CN", "US"]) {
        const hit = descSources.find((i) => i.region.toUpperCase() === code)
        if (hit) { desc = hit.result; break }
      }
      if (!desc) desc = descSources[0].result
    }
  }

  // 选最佳更新说明源（独立判断）
  let notes = null as any | null
  const notesSources = valid.filter((i) => i.result.releaseNotes)
  if (notesSources.length) {
    const zh = notesSources.find((i) =>
      hasChinese(String(i.result.releaseNotes || ""))
    )
    if (zh) notes = zh.result
    else {
      for (const code of ["CN", "US"]) {
        const hit = notesSources.find((i) => i.region.toUpperCase() === code)
        if (hit) { notes = hit.result; break }
      }
      if (!notes) notes = notesSources[0].result
    }
  }

  // 版本元数据优先 CN → US → 第一个
  let version = null as any | null
  for (const code of ["CN", "US"]) {
    const hit = valid.find((i) => i.region.toUpperCase() === code)
    if (hit) { version = hit.result; break }
  }
  if (!version) version = valid[0].result

  return { desc, notes, version }
}