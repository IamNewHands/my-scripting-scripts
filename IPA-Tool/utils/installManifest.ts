/**
 * 安装用 itms-services / plist URL 拼装。
 * 正确做法：先拼好 https plist 地址（查询参数分别编码），
 * 再把整段 manifest URL 做 encodeURIComponent 后塞进 itms-services 的 url=。
 */

export type InstallManifestItem = {
  name: string
  bundleId: string
  displayVersion: string
  fileName: string
}

/** 规范化用户填写的 plist 服务基址 */
export const normalizePlistServer = (raw: string) => {
  let base = (raw ?? "").trim()
  // 去掉末尾多余 /
  while (base.endsWith("/") && !base.endsWith("://")) {
    base = base.slice(0, -1)
  }
  return base
}

export const validatePlistServer = (raw: string) => {
  const base = normalizePlistServer(raw)
  if (!base) {
    return { ok: false as const, message: "未配置 Plist 服务：设置 → 安装配置 → 自定义 URL" }
  }
  if (!/^https:\/\//i.test(base)) {
    return { ok: false as const, message: "Plist 服务必须是 https:// 开头" }
  }
  try {
    // eslint-disable-next-line no-new
    new URL(base)
  } catch {
    return { ok: false as const, message: "Plist 服务 URL 无效" }
  }
  return { ok: true as const, base }
}

/** 生成可被 Worker/Scripting 解析的 https plist 地址 */
export const buildPlistManifestHttpUrl = (
  plistServer: string,
  item: InstallManifestItem
) => {
  const checked = validatePlistServer(plistServer)
  if (!checked.ok) throw new Error(checked.message)

  const url = new URL(checked.base)
  url.searchParams.set("name", item.name ?? "")
  url.searchParams.set("bundleId", item.bundleId ?? "")
  url.searchParams.set("displayVersion", item.displayVersion ?? "")
  url.searchParams.set("fileName", item.fileName ?? "")
  return url.toString()
}

/** 生成系统安装用的 itms-services 链接 */
export const buildItmsServicesUrl = (manifestHttpUrl: string) =>
  `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestHttpUrl)}`

/** 内置预设：Scripting 云端 / 代理模块（后者依赖 MitM，App 内直连探测会误失败） */
export const PRESET_PLIST_SERVERS = [
  "https://api.scripting.fun/ipa-plist",
  "https://xiaobai.app/install",
] as const

export const isPresetPlistServer = (raw: string) => {
  const base = normalizePlistServer(raw)
  return (PRESET_PLIST_SERVERS as readonly string[]).includes(base)
}

/**
 * 探测 plist 服务是否可达（仅建议用于自定义服务）。
 * 不抛敏感内容；仅状态与简短文案。
 */
export const probePlistManifest = async (manifestHttpUrl: string, timeoutSec = 12) => {
  const resp = await fetch(manifestHttpUrl, {
    method: "GET",
    timeout: timeoutSec,
  } as any)
  if (!resp.ok) {
    throw new Error(`Plist 服务返回 HTTP ${resp.status}`)
  }
  const text = await resp.text()
  if (!text || text.trim().length < 20) {
    throw new Error("Plist 服务返回空内容")
  }
  // 粗检：常见 manifest / 错误页
  const lower = text.toLowerCase()
  if (lower.includes("<html") && !lower.includes("plist")) {
    throw new Error("Plist 服务返回了网页而非安装描述文件，请检查路径")
  }
  return true
}
