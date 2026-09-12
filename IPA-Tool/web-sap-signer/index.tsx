import sapSignCache from "./sapSignCache"
import { startSignerServer } from "./server"
import { getMac } from "../services/appleStore/runtime"

export * from "./dmap"

export type SapSignBody = string | Data | Uint8Array

export type SapSignerSessionOptions = {
  /** 缓存策略在初始化时固定。 */
  useCache?: boolean
}

type SignerServer = ReturnType<typeof startSignerServer>
type SapSignerState = "created" | "initializing" | "ready" | "closing" | "closed"

const bodyToBase64 = (body: SapSignBody) => {
  const data = typeof body === "string"
    ? Data.fromRawString(body)
    : body instanceof Uint8Array
      ? Data.fromUint8Array(body)
      : body

  if (!data) throw new Error("SAP 签名 body 不能为空")
  return data.toBase64String()
}

/**
 * SAP 签名会话。
 * initialize() 只保存配置；第一次缓存未命中的 sign() 才会创建 WebView、代理和 WASM。
 */
export class SapSignerSession {
  readonly guid: string
  readonly useCache: boolean
  private state: SapSignerState = "created"
  private server: SignerServer | undefined
  private web: WebViewController | undefined
  private presentation: Promise<void> | undefined
  private initializationPromise: Promise<void> | undefined
  private queue: Promise<unknown> = Promise.resolve()

  private constructor(guid: string, options: SapSignerSessionOptions) {
    if (!guid.trim()) throw new TypeError("guid 不能为空")
    this.guid = guid
    this.useCache = options.useCache === true
  }

  static initialize(guid = getMac(), options: SapSignerSessionOptions = {}) {
    return new SapSignerSession(guid, options)
  }

  private async ensureInitialized(): Promise<void> {
    if (this.state === "ready") return
    if (this.initializationPromise) return this.initializationPromise
    if (this.state !== "created") throw new Error(`SAP 签名会话状态无效: ${this.state}`)

    this.state = "initializing"
    this.initializationPromise = (async () => {
      const server = startSignerServer()
      const web = new WebViewController()
      this.server = server
      this.web = web

      try {
        if (!await web.loadURL(server.url)) throw new Error("加载签名资源失败")
        this.presentation = web.present({ navigationTitle: "SAP 签名" })

        const options = { proxyURL: server.proxyURL }
        await web.evaluateJavaScript<boolean>(`
          setSigningStatus("正在准备签名", "正在加载 SAP 签名引擎，请稍候")
          return sapInitialize(${JSON.stringify(this.guid)}, ${JSON.stringify(options)}).then(() => true)
        `)
        this.state = "ready"
      } catch (error) {
        await this.releaseResources()
        this.state = "closed"
        throw error
      } finally {
        this.initializationPromise = undefined
      }
    })()

    return this.initializationPromise
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.catch(() => undefined)
    return result
  }

  private async signNow(bodyBase64: string): Promise<string> {
    if (this.useCache) {
      const cachedSignature = sapSignCache.get(this.guid, bodyBase64)
      if (cachedSignature !== null) return cachedSignature
    }

    await this.ensureInitialized()
    if (!this.web) throw new Error("SAP WebView 未初始化")

    const operation = this.web.evaluateJavaScript<string>(`
      setSigningStatus("正在安全签名", "正在生成 SAP 签名数据，请勿关闭页面")
      return sapSign(${JSON.stringify(bodyBase64)})
    `)
    const result = await operation.catch(async error => {
      const message = error instanceof Error ? error.message : String(error)
      try {
        await this.web?.evaluateJavaScript(`setSigningError(${JSON.stringify(message)})`)
      } catch {
        // 页面退出时无需再更新状态。
      }
      throw error
    })

    if (this.useCache) sapSignCache.set(this.guid, bodyBase64, result)
    return result
  }

  sign(body: SapSignBody): Promise<string> {
    if (this.state === "closing" || this.state === "closed") {
      return Promise.reject(new Error("SAP 签名会话已关闭"))
    }
    const bodyBase64 = bodyToBase64(body)
    return this.enqueue(() => this.signNow(bodyBase64))
  }

  private async releaseResources() {
    try {
      await this.web?.evaluateJavaScript(`return sapClose()`)
    } catch {
      // 初始化失败或页面已退出时，继续释放宿主资源。
    }
    this.web?.dismiss()
    if (this.presentation) await this.presentation
    this.web?.dispose()
    this.server?.stop()
    this.web = undefined
    this.server = undefined
    this.presentation = undefined
  }

  async close(): Promise<void> {
    if (this.state === "closed" || this.state === "closing") return
    this.state = "closing"
    await this.queue.catch(() => undefined)
    await this.initializationPromise?.catch(() => undefined)
    await this.releaseResources()
    this.state = "closed"
  }
}

let activeSession: SapSignerSession | null = null
let closingSession: Promise<void> | null = null

/** 同步创建或复用逻辑会话；不会触发 Web/WASM 初始化。 */
export const initializeSapSigner = (
  guid = getMac(),
  options: SapSignerSessionOptions = {},
) => {
  if (closingSession) {
    throw new Error("SAP 签名会话正在关闭，请稍后再初始化")
  }
  const useCache = options.useCache === true
  if (activeSession) {
    if (activeSession.guid !== guid || activeSession.useCache !== useCache) {
      throw new Error("已有 SAP 签名会话，请先调用 closeSapSigner()")
    }
    return activeSession
  }
  activeSession = SapSignerSession.initialize(guid, options)
  return activeSession
}

export const closeSapSigner = async () => {
  const session = activeSession
  activeSession = null
  if (!session) return
  closingSession = session.close()
  try {
    await closingSession
  } finally {
    closingSession = null
  }
}

/** 旧单次入口：独立创建、签名并关闭；缓存命中时不会触发物理初始化。 */
const signSap = async (body: SapSignBody, useCache = false, guid = getMac()) => {
  const session = SapSignerSession.initialize(guid, { useCache })
  try {
    return await session.sign(body)
  } finally {
    await session.close()
  }
}

export default signSap
