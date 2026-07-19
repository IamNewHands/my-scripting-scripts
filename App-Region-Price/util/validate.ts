/** 输入校验：App ID / 地区代码 / 货币代码 / 分享链接 */

/** 纯数字 App ID（一般 6 位以上） */
export function isValidAppId(id: string): boolean {
  return /^\d{6,}$/.test(String(id || "").trim())
}

/** 两位字母地区代码，如 CN/US */
export function isValidRegion(code: string): boolean {
  return /^[A-Za-z]{2}$/.test(String(code || "").trim())
}

/** 三位字母货币代码，如 CNY/USD */
export function isValidCurrency(code: string): boolean {
  return /^[A-Za-z]{3}$/.test(String(code || "").trim())
}

/**
 * 从 App Store 链接或纯 ID 中解析 appid。
 * 支持 .../id123456、末段 id123456、纯数字；失败返回 null。
 */
export function parseAppId(input: string): string | null {
  const raw = String(input || "").trim()
  if (!raw) return null
  if (isValidAppId(raw)) return raw

  // 去掉 query/hash
  const noQuery = raw.split(/[?#]/)[0]
  // 优先匹配 /id数字
  const m =
    noQuery.match(/\/id(\d{6,})(?:\/|$)/i) ||
    noQuery.match(/(?:^|\/)id(\d{6,})$/i)
  if (m?.[1] && isValidAppId(m[1])) return m[1]

  // 末路径段去掉前缀 "id"
  const parts = noQuery.split("/").filter(Boolean)
  const last = parts[parts.length - 1] || ""
  const cleaned = last.replace(/^id/i, "")
  if (isValidAppId(cleaned)) return cleaned
  return null
}
