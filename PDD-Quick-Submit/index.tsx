import { Intent, Script } from "scripting"

declare const fetch: any
declare const AbortController: any
declare const Notification: any
declare const Dialog: any

/**
 * 拼多多快捷组队三站点提交脚本
 *
 * 使用方式：
 * 1. iOS 快捷指令调用 Scripting，并把文本作为快捷指令参数传入。
 * 2. 输入可为 9 位数字，也可为 18/27/... 位连续数字，脚本会按每 9 位切分。
 * 3. 每组码串行处理；单组内并行提交 3 个站点，任一站点成功即立即返回该组结果。
 * 4. 慢站会被取消/忽略，避免拖累反馈；运行结果通过通知和 Script.exit 回传。
 */

// 单请求默认超时（毫秒）；同时配合 fetch 原生 timeout（秒）双保险
const TIMEOUT_MS = 3000
// 单码总预算：任一成功立即返回，否则最迟到此截止
const CODE_DEADLINE_MS = 5000
const MAX_ATTEMPTS = 2
const BACKOFF_BASE_MS = 200
const BACKOFF_JITTER_MS = 100
const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
const ACCEPT_LANG = "zh-CN,zh;q=0.9,en;q=0.8"

// 新增同架构站点：复制 kind 为 "publisher" 的配置，改 name/homeUrl/submitUrl/Origin/Referer 即可自动生效。
// publisher：前端本地 publisher_token + POST /api/codes；token：先取服务端 token 再提交。
const SITES = [
  {
    name: "站点1",
    kind: "publisher",
    homeUrl: "https://pdd.xxs666.cn/pdd.html",
    submitUrl: "https://pdd.xxs666.cn/api/codes",
    extraHeaders: {
      "Origin": "https://pdd.xxs666.cn",
      "Referer": "https://pdd.xxs666.cn/pdd.html",
      "Accept": "application/json, text/plain, */*",
    },
  },
  {
    name: "站点2",
    kind: "publisher",
    homeUrl: "https://pqpdd.t6k.cn/pdd.html",
    submitUrl: "https://pqpdd.t6k.cn/api/codes",
    extraHeaders: {
      "Origin": "https://pqpdd.t6k.cn",
      "Referer": "https://pqpdd.t6k.cn/pdd.html",
      "Accept": "application/json, text/plain, */*",
    },
  },
  {
    name: "站点3",
    kind: "token",
    tokenUrl: "https://pdd.dcvx.cn/api.php?action=get_token",
    submitUrl: "https://pdd.dcvx.cn/api.php?action=add",
    // 慢站压缩预算，避免拖死整组反馈
    tokenTimeoutMs: 2500,
    submitTimeoutMs: 3000,
    maxAttempts: 2,
    extraHeaders: {
      "Origin": "https://pdd.dcvx.cn",
      "Referer": "https://pdd.dcvx.cn/",
      "Accept": "application/json, text/plain, */*",
    },
  },
]

// 调试用：非空时直接使用此值跳过快捷指令读取，正式部署前清空
const DEBUG_TEAM_CODE = ""

type SiteStatus =
  | "success"
  | "businessFail"
  | "clientError"
  | "serverTransient"
  | "timeout"
  | "network"
  | "parse"
  | "preflight"
  | "retryExhausted"
  | "exception"
  | "cancelled"
  | "deadline"

type SiteResult = {
  siteName: string
  ok: boolean
  status: SiteStatus
  message: string
  httpStatus: number | null
  attempts: number
}

type CodeResult = {
  code: string
  sites: SiteResult[]
}

type RunResult = {
  results: CodeResult[]
  totalCodes: number
  totalRequests: number
  totalSuccess: number
  ignoredTailLength: number
}

type HttpResult = {
  status: number
  headers: any
  text: string
  jsonOrNull: any
}

type AbortableContext = {
  signal?: any
  isAborted: () => boolean
}

function sleep(ms: number, signal?: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err: any = new Error("已取消")
      err.kind = "cancelled"
      reject(err)
      return
    }
    const timer = setTimeout(resolve, ms)
    if (!signal) return
    const onAbort = () => {
      clearTimeout(timer)
      const err: any = new Error("已取消")
      err.kind = "cancelled"
      reject(err)
    }
    try {
      signal.addEventListener("abort", onAbort, { once: true })
    } catch {
      // 部分运行时可能不支持 addEventListener
    }
  })
}

function shortText(value: unknown, maxLength = 60): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function randomHex(length: number): string {
  let value = ""
  for (let index = 0; index < length; index++) {
    value += Math.floor(Math.random() * 16).toString(16)
  }
  return value
}

function createPublisherToken(): string {
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`
}

const PUBLISHER_TOKEN = createPublisherToken()

function parseSetCookie(setCookie: string | null): string {
  if (!setCookie) return ""
  return setCookie
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean)
    .join("; ")
}

function compressBusinessFailMessage(text: string): string {
  const t = text ?? ""
  if (/重复|已提交/.test(t)) return "已重复"
  if (/互助码|格式不正确/.test(t)) return "码格式错"
  if (/已结束/.test(t)) return "已结束"
  if (/已满|人满/.test(t)) return "已满员"
  if (/失败/.test(t)) return "已失败"
  if (/错误|参数/.test(t)) return "参数错"
  return shortText(t, 6)
}

function containsSuccessKeyword(text: string): boolean {
  return /成功|已提交|已加入|添加成功|提交成功/.test(text ?? "")
}

function httpStatusResult(siteName: string, status: number): SiteResult | null {
  if (status >= 500 || status === 408 || status === 429) {
    return makeResult(siteName, false, "serverTransient", `HTTP${status}`, status)
  }
  if (status >= 400) {
    return makeResult(siteName, false, "clientError", `HTTP${status}`, status)
  }
  return null
}

function jsonMessage(json: any): string {
  const detail = json?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail) && detail.length > 0) return String(detail[0]?.msg ?? detail[0]?.message ?? "")
  return String(json?.message ?? json?.msg ?? json?.error ?? "")
}

function makeResult(
  siteName: string,
  ok: boolean,
  status: SiteStatus,
  message: string,
  httpStatus: number | null,
  attempts = 0,
): SiteResult {
  return {
    siteName,
    ok,
    status,
    message: shortText(message),
    httpStatus,
    attempts,
  }
}

function isAbortError(error: any): boolean {
  if (!error) return false
  if (error.name === "AbortError") return true
  if (error.kind === "timeout" || error.kind === "cancelled") return true
  const message = String(error.message ?? error)
  return /abort|timeout|超时|取消|cancel/i.test(message)
}

function throwIfAborted(ctx?: AbortableContext): void {
  if (ctx?.isAborted()) {
    const err: any = new Error("已取消")
    err.kind = "cancelled"
    throw err
  }
}

async function httpRequest(url: string, options: any = {}, ctx?: AbortableContext): Promise<HttpResult> {
  throwIfAborted(ctx)
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS
  // Scripting 原生 timeout 单位是秒；与 AbortController 双保险
  const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000))
  let timer: any = null
  let onOuterAbort: (() => void) | null = null
  const outerSignal = options.signal ?? ctx?.signal
  if (controller) {
    timer = setTimeout(() => { try { controller.abort() } catch {} }, timeoutMs)
    if (outerSignal) {
      onOuterAbort = () => { try { controller.abort() } catch {} }
      if (outerSignal.aborted) onOuterAbort()
      else { try { outerSignal.addEventListener("abort", onOuterAbort, { once: true }) } catch {} }
    }
  }
  try {
    const headers = {
      "User-Agent": UA_MOBILE,
      "Accept-Language": ACCEPT_LANG,
      ...(options.headers ?? {}),
    }
    const fetchOptions: any = {
      method: options.method,
      headers,
      body: options.body,
      timeout: timeoutSec,
    }
    if (controller) fetchOptions.signal = controller.signal
    const response = await fetch(url, fetchOptions)
    throwIfAborted(ctx)
    const text = await response.text()
    let jsonOrNull: any = null
    try { jsonOrNull = JSON.parse(text) } catch {}
    return { status: response.status, headers: response.headers, text, jsonOrNull }
  } catch (error: any) {
    if (ctx?.isAborted() || (outerSignal && outerSignal.aborted)) {
      const wrapped: any = new Error("已取消")
      wrapped.kind = "cancelled"
      throw wrapped
    }
    const isAbort = isAbortError(error)
    const message = isAbort ? "请求超时" : (error?.message ?? String(error))
    const wrapped: any = new Error(message)
    wrapped.kind = isAbort ? "timeout" : "network"
    throw wrapped
  } finally {
    if (timer) clearTimeout(timer)
    if (outerSignal && onOuterAbort) { try { outerSignal.removeEventListener("abort", onOuterAbort) } catch {} }
  }
}

async function withRetry(
  fn: () => Promise<SiteResult>,
  options: { maxAttempts?: number; label: string; ctx?: AbortableContext },
): Promise<SiteResult> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS
  let lastResult: SiteResult | null = null
  for (let index = 0; index < maxAttempts; index++) {
    throwIfAborted(options.ctx)
    try {
      const result = await fn()
      const attempts = index + 1
      lastResult = { ...result, attempts }
      if (result.ok || result.status === "businessFail" || result.status === "clientError") {
        return lastResult
      }
    } catch (error: any) {
      if (error?.kind === "cancelled" || options.ctx?.isAborted()) {
        return makeResult(options.label, false, "cancelled", "已取消", null, index + 1)
      }
      const status = (error?.kind ?? "exception") as SiteStatus
      lastResult = makeResult(options.label, false, status, error?.message ?? String(error), null, index + 1)
    }
    if (index < maxAttempts - 1) {
      if (options.ctx?.isAborted()) break
      const delay = BACKOFF_BASE_MS * 2 ** index + Math.random() * BACKOFF_JITTER_MS
      console.log(`[${options.label}] 第 ${index + 1} 次失败，${Math.round(delay)}ms 后重试：${lastResult?.message ?? ""}`)
      try { await sleep(delay, options.ctx?.signal) } catch { break }
    }
  }
  if (options.ctx?.isAborted()) {
    return makeResult(options.label, false, "cancelled", "已取消", null, lastResult?.attempts ?? maxAttempts)
  }
  const finalMessage = lastResult?.message ?? "未知错误"
  return {
    ...(lastResult ?? makeResult(options.label, false, "exception", finalMessage, null)),
    ok: false,
    status: "retryExhausted",
    message: finalMessage,
    attempts: maxAttempts,
  }
}

function parsePublisherResponse(site: any, response: HttpResult): SiteResult {
  const siteName = site.name
  const json = response.jsonOrNull
  if (json) {
    if (json.ok === true) {
      return makeResult(siteName, true, "success", json.message ?? "提交成功", response.status)
    }
    const msg = jsonMessage(json)
    if (containsSuccessKeyword(msg)) {
      return makeResult(siteName, true, "success", msg || "提交成功(message兜底)", response.status)
    }
    return makeResult(siteName, false, "businessFail", compressBusinessFailMessage(msg || "提交失败"), response.status)
  }
  const statusResult = httpStatusResult(siteName, response.status)
  if (statusResult) return statusResult
  if (/成功|已提交|已加入/.test(response.text)) {
    return makeResult(siteName, true, "success", "提交成功(文本兜底)", response.status)
  }
  if (/失败|错误|重复|已结束|已满/.test(response.text)) {
    return makeResult(siteName, false, "businessFail", compressBusinessFailMessage(response.text), response.status)
  }
  return makeResult(siteName, false, "parse", `响应格式异常: ${shortText(response.text, 40)}`, response.status)
}

function parseTokenResponse(site: any, response: HttpResult): SiteResult {
  const siteName = site.name
  const statusResult = httpStatusResult(siteName, response.status)
  if (statusResult) return statusResult
  const json = response.jsonOrNull
  if (!json) return makeResult(siteName, false, "parse", "响应不是 JSON", response.status)
  if (json.success === true || json.code === 0 || json.status === "success") {
    return makeResult(siteName, true, "success", json.msg ?? json.message ?? "提交成功", response.status)
  }
  const msg = String(json.msg ?? json.message ?? "")
  if (containsSuccessKeyword(msg)) {
    return makeResult(siteName, true, "success", msg || "提交成功(message兜底)", response.status)
  }
  return makeResult(siteName, false, "businessFail", compressBusinessFailMessage(msg || "提交失败"), response.status)
}

async function submitPublisherCode(
  site: any,
  code: string,
  ctx?: AbortableContext,
): Promise<SiteResult> {
  return withRetry(async () => {
    throwIfAborted(ctx)
    // 首页 GET 仅作为可选增强，失败不阻断提交
    let cookie = ""
    try {
      const homeResponse = await httpRequest(site.homeUrl, {
        method: "GET",
        headers: { "Accept": "text/html,*/*" },
        timeoutMs: Math.min(TIMEOUT_MS, 2000),
      }, ctx)
      if (homeResponse.status < 400) {
        cookie = parseSetCookie(homeResponse.headers.get("set-cookie"))
      }
    } catch (error: any) {
      if (error?.kind === "cancelled") throw error
      console.log(`[${site.name}] 首页预检跳过：${error?.message ?? error}`)
    }
    throwIfAborted(ctx)
    const headers: any = {
      ...site.extraHeaders,
      "Content-Type": "application/json",
      "X-Publisher-Token": PUBLISHER_TOKEN,
    }
    if (cookie) headers.Cookie = cookie
    const submitResponse = await httpRequest(site.submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ platform: "pdd", code, publisher_token: PUBLISHER_TOKEN }),
    }, ctx)
    return parsePublisherResponse(site, submitResponse)
  }, { label: site.name, ctx })
}

async function submitTokenSite(site: any, code: string, ctx?: AbortableContext): Promise<SiteResult> {
  return withRetry(async () => {
    throwIfAborted(ctx)
    const tokenResponse = await httpRequest(site.tokenUrl!, {
      method: "GET",
      headers: { "Accept": "application/json, text/plain, */*" },
      timeoutMs: site.tokenTimeoutMs,
    }, ctx)
    const tokenStatusResult = httpStatusResult(site.name, tokenResponse.status)
    if (tokenStatusResult) return tokenStatusResult
    const token = tokenResponse.jsonOrNull?.token
    if (typeof token !== "string" || token.trim() === "") {
      return makeResult(site.name, false, "preflight", "未获取到提交 Token", tokenResponse.status)
    }
    throwIfAborted(ctx)
    const cookie = parseSetCookie(tokenResponse.headers.get("set-cookie"))
    const submitResponse = await httpRequest(site.submitUrl, {
      method: "POST",
      headers: {
        ...site.extraHeaders,
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify({ number: code, token, honeypot: "" }),
      timeoutMs: site.submitTimeoutMs,
    }, ctx)
    return parseTokenResponse(site, submitResponse)
  }, { label: site.name, maxAttempts: site.maxAttempts, ctx })
}

async function submitBySite(site: any, code: string, ctx?: AbortableContext): Promise<SiteResult> {
  if (site.kind === "publisher") return submitPublisherCode(site, code, ctx)
  if (site.kind === "token") return submitTokenSite(site, code, ctx)
  return makeResult(site.name ?? "未知站点", false, "preflight", "未知站点类型", null)
}

function parseCodes(input: string): { codes: string[]; ignoredTailLength: number } {
  const digits = String(input ?? "").trim().replace(/\D/g, "")
  const completeLength = digits.length - (digits.length % 9)
  const codes = digits.slice(0, completeLength).match(/.{9}/g) ?? []
  return {
    codes,
    ignoredTailLength: digits.length % 9,
  }
}

/** 任一站点成功立即返回；其余站点取消；到总 deadline 仍无成功则汇总已有结果 */
async function submitOneCode(code: string): Promise<CodeResult> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  let finished = false
  const ctx: AbortableContext = {
    signal: controller?.signal,
    isAborted: () => finished || Boolean(controller?.signal?.aborted),
  }
  const siteResults: Array<SiteResult | null> = SITES.map(() => null)
  let settledCount = 0
  const result = await new Promise<CodeResult>((resolve) => {
    let resolved = false
    const finish = (sites: SiteResult[]) => {
      if (resolved) return
      resolved = true
      finished = true
      try { controller?.abort() } catch {}
      resolve({ code, sites })
    }
    const deadlineTimer = setTimeout(() => {
      const sites = siteResults.map((item, index) => {
        if (item) return item
        return makeResult(SITES[index].name, false, "deadline", "总时限到", null, 0)
      })
      finish(sites)
    }, CODE_DEADLINE_MS)
    SITES.forEach((site, index) => {
      submitBySite(site, code, ctx)
        .then((siteResult) => {
          if (resolved) return
          siteResults[index] = siteResult
          settledCount += 1
          if (siteResult.ok) {
            clearTimeout(deadlineTimer)
            const sites = siteResults.map((item, i) => {
              if (item) return item
              return makeResult(SITES[i].name, false, "cancelled", "已有站点成功", null, 0)
            })
            finish(sites)
            return
          }
          if (settledCount >= SITES.length) {
            clearTimeout(deadlineTimer)
            finish(siteResults.map((item, i) => item ?? makeResult(SITES[i].name, false, "exception", "无结果", null, 0)))
          }
        })
        .catch((error: any) => {
          if (resolved) return
          const kind = (error?.kind === "cancelled" ? "cancelled" : (error?.kind ?? "exception")) as SiteStatus
          siteResults[index] = makeResult(site.name, false, kind, error?.message ?? String(error), null, site.maxAttempts ?? MAX_ATTEMPTS)
          settledCount += 1
          if (settledCount >= SITES.length) {
            clearTimeout(deadlineTimer)
            finish(siteResults.map((item, i) => item ?? makeResult(SITES[i].name, false, "exception", "无结果", null, 0)))
          }
        })
    })
  })
  return result
}

function getStatusLabel(result: SiteResult): string {
  switch (result.status) {
    case "timeout":
      return "超时"
    case "network":
      return "网络错"
    case "parse":
      return "格式错"
    case "preflight":
      return "前置失败"
    case "cancelled":
      return "取消"
    case "deadline":
      return "总超时"
    case "retryExhausted":
      return result.message
    case "clientError":
    case "serverTransient":
      return result.message
    default:
      return shortText(result.message, 6)
  }
}

function formatCodeResult(result: CodeResult): string {
  const total = result.sites.length
  const okCount = result.sites.filter((site) => site.ok).length
  // 数字表示：成功站点数 / 总站点数
  const score = `${okCount}/${total}`
  if (okCount > 0) return `${result.code} ${score}`
  // 全失败时附带首个失败原因，便于排查
  const fail = result.sites.find((site) => !site.ok)
  const reason = fail ? getStatusLabel(fail) : "失败"
  return `${result.code} ${score} ${reason}`
}

function reportResults(runResult: RunResult): { exitText: string; notifyTitle: string; notifyBody: string } {
  const { results, ignoredTailLength } = runResult
  const detailLines = results.map(formatCodeResult)
  const exitParts = [...detailLines]
  if (ignoredTailLength > 0) {
    exitParts.push(`(忽略${ignoredTailLength}位)`)
  }
  const exitText = exitParts.join("\n")
  const notifyTitle = detailLines[0] ?? "提交完成"
  const notifyBody = detailLines.slice(1).join("\n")
  return { exitText, notifyTitle, notifyBody }
}

function getInputText(): string {
  if (DEBUG_TEAM_CODE) return DEBUG_TEAM_CODE
  const parameter = Intent.shortcutParameter
  if (parameter?.type === "text") return parameter.value
  if (Intent.textsParameter?.length) return Intent.textsParameter.join("\n")
  return ""
}

async function promptInputIfAvailable(): Promise<string> {
  if (typeof Dialog === "undefined" || typeof Dialog.prompt !== "function") return ""
  try {
    const result = await Dialog.prompt({
      title: "拼多多快捷组队",
      message: "请输入组队码，支持多组连写",
      placeholder: "9 位或 9N 位数字",
    })
    if (typeof result === "string") return result
    if (typeof result?.value === "string") return result.value
    if (typeof result?.text === "string") return result.text
  } catch {}
  return ""
}

async function notifyResult(title: string, body: string): Promise<void> {
  if (typeof Notification === "undefined" || typeof Notification.schedule !== "function") return
  try {
    await Notification.schedule({
      title,
      subtitle: "",
      body,
    })
  } catch (error) {
    console.log(`通知发送失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

async function run(): Promise<void> {
  let text = getInputText()
  if (text.trim() === "") text = await promptInputIfAvailable()
  if (text.trim() === "") {
    Script.exit(Intent.text("未输入组队码"))
    return
  }
  const { codes, ignoredTailLength } = parseCodes(text)
  if (codes.length === 0) {
    const suffix = ignoredTailLength > 0 ? `（输入有 ${ignoredTailLength} 位非整组数字）` : ""
    Script.exit(Intent.text(`未识别到 9 位组队码${suffix}`))
    return
  }
  const results: CodeResult[] = []
  for (const code of codes) {
    results.push(await submitOneCode(code))
  }
  const totalSuccess = results.reduce(
    (sum, result) => sum + result.sites.filter((site) => site.ok).length,
    0,
  )
  const runResult: RunResult = {
    results,
    totalCodes: codes.length,
    totalRequests: codes.length * SITES.length,
    totalSuccess,
    ignoredTailLength,
  }
  const { exitText, notifyTitle, notifyBody } = reportResults(runResult)
  await notifyResult(notifyTitle, notifyBody)
  Script.exit(Intent.text(exitText))
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  Script.exit(Intent.text(`脚本异常: ${message}`))
})

