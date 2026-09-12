import { AuthService, type AppleLoginResponse } from "./AuthService"
import { fetch } from "scripting"
import { getMac, request } from "../runtime"
import { APPLE_COMMON_HEADERS } from "../runtime/appleHeaders"
import {
  dmapConcat,
  dmapString,
  dmapTag,
  dmapText,
  dmapUint8,
  dmapUint32,
  dmapUintValue,
  firstDMapUint,
  walkDMap,
} from "../../../web-sap-signer/dmap"
import type { SapSignBody } from "../../../web-sap-signer"

const PURCHASE_DAAP_BASE_URL =
  "https://pd.itunes.apple.com/WebObjects/MZPurchaseDaap.woa/purchase"
const OWNED_APPS_QUERY = "('com.apple.itunes.extended\\-media\\-kind:131072')"

type SapSignerLike = {
  sign(body: SapSignBody): Promise<string>
}

export type PurchaseHistoryLoginResult = {
  sessionID: number
  data: Uint8Array
}

export type PurchaseHistoryUpdateResult = {
  revision: number
  data: Uint8Array
}

export type OwnedAppRecord = {
  id: string
  bundleID: string
  name: string
  version: string
  purchaseDate?: Date
}

export type PurchaseHistoryRequest = {
  url: string
  bodyBase64: string
  signature: string
  revision: number
}

const secondPrecisionDate = (value: Date) =>
  new Date(Math.floor(value.getTime() / 1000) * 1000)

const purchaseHistoryHeaders = (
  account: AppleLoginResponse,
  guid: string,
  now: Date,
) => {
  const date = secondPrecisionDate(now)
  const headers: Record<string, string> = {
    ...APPLE_COMMON_HEADERS,
    Accept: "*/*",
    "Accept-Language": "en-us",
    "Client-Cloud-DAAP-Request-Reason": "5",
    "Client-Cloud-Purchase-Daap-Version": "1.1/Configurator-2.0",
    "Client-DAAP-Version": "3.12",
    Date: date.toUTCString(),
    "iCloud-DSID": String(account.dsPersonId ?? ""),
    "X-Apple-I-Client-Time": date.toISOString().replace(".000Z", "Z"),
    "X-Apple-I-Locale": "en_US",
    "X-Apple-I-TimeZone": "Local",
    "X-Apple-Store-Front": String(account.storeFrontAll ?? account.storeFront ?? ""),
    "X-Apple-TZ": String(-date.getTimezoneOffset()),
    "X-Dsid": String(account.dsPersonId ?? ""),
    "X-Guid": guid,
    "X-Token": String(account.passwordToken ?? ""),
  }

  if (account.Cookie) headers.Cookie = account.Cookie
  return headers
}

const validateDMAPStatus = (label: string, data: Uint8Array) => {
  const status = firstDMapUint(data, "mstt")
  if (status !== undefined && status !== 200) {
    throw new Error(`${label} returned DAAP status ${status}`)
  }
}

const responseBody = (data: Uint8Array) => {
  const body = Data.fromArrayBuffer(data.slice().buffer as ArrayBuffer)
  if (!body) throw new Error("DMAP body cannot be converted to Data")
  return body
}

const responseErrorDetail = (data: Uint8Array) => {
  const text = Data.fromArrayBuffer(data.slice().buffer as ArrayBuffer)?.toRawString()
  if (text?.trim()) return text.trim().slice(0, 500)
  return Array.from(data.slice(0, 96), byte => byte.toString(16).padStart(2, "0")).join("")
}

const stringBody = (value: string) => {
  const body = Data.fromRawString(value)
  if (!body) throw new Error("URL-form body cannot be converted to Data")
  return body
}

const buildUpdateBody = (sessionID: number, query = OWNED_APPS_QUERY) =>
  `session-id=${sessionID}&revision-number=(null)&query=${query}`

const buildItemsBody = (
  sessionID: number,
  revision: number,
  now: Date,
  query = OWNED_APPS_QUERY,
) => {
  const payload = dmapConcat(
    dmapUint32("mstc", Math.floor(now.getTime() / 1000)),
    dmapUint32("mlid", sessionID),
    dmapUint8("mikd", 2),
    dmapUint32("musr", revision),
    dmapUint32("mder", 0),
    dmapString("mque", query),
    dmapTag("aetl"),
  )
  return dmapTag("adsr", payload)
}

const parseOwnedApp = (data: Uint8Array): OwnedAppRecord => {
  const app: OwnedAppRecord = {
    id: "",
    bundleID: "",
    name: "",
    version: "",
  }

  walkDMap(data, tag => {
    switch (tag.name) {
      case "aeSI":
        app.id = String(dmapUintValue(tag.payload, tag.name))
        break
      case "aeBI":
        app.bundleID = dmapText(tag.payload)
        break
      case "aeLN":
        app.name = dmapText(tag.payload)
        break
      case "minm":
        if (!app.name) app.name = dmapText(tag.payload)
        break
      case "aePd":
        app.version = dmapText(tag.payload)
        break
      case "asdp":
        app.purchaseDate = new Date(dmapUintValue(tag.payload, tag.name) * 1000)
        break
    }
  })

  return app
}

export const parseOwnedApps = (data: Uint8Array): OwnedAppRecord[] => {
  const apps: OwnedAppRecord[] = []
  const seen = new Set<string>()

  walkDMap(data, tag => {
    if (tag.name !== "mlit") return
    const app = parseOwnedApp(tag.payload)
    if (!app.id || seen.has(app.id)) return
    seen.add(app.id)
    apps.push(app)
  })

  apps.sort((left, right) => {
    return (right.purchaseDate?.getTime() ?? 0) - (left.purchaseDate?.getTime() ?? 0)
  })

  return apps
}

/**
 * 购买历史 DAAP 的基础领域服务。
 * 负责登录态、三个基础请求和 DMAP 数据转换。
 */
export class PurchaseHistoryService {
  readonly guid: string
  private account: AppleLoginResponse | undefined
  private lastItemsRequest: PurchaseHistoryRequest | null = null

  /** 创建购买历史服务，并绑定当前设备的签名 GUID。 */
  constructor(guid = getMac()) {
    if (!guid.trim()) throw new TypeError("guid 不能为空")
    this.guid = guid
  }

  /** 读取当前活动 Apple 账号，并保存到领域服务上下文。 */
  async loadAccount(): Promise<AppleLoginResponse> {
    this.account = await AuthService.login()
    return this.account
  }

  /** 执行购买历史的登录、更新和 items 查询流程。 */
  async query(signer: SapSignerLike): Promise<OwnedAppRecord[]> {
    if (!this.account) await this.loadAccount()

    const login = await this.#login()
    const update = await this.update(login.sessionID, signer)
    const items = await this.items(
      login.sessionID,
      update.revision,
      signer,
      new Date(),
    )
    return parseOwnedApps(items)
  }

  /** 返回最近一次成功生成的 items 请求，供 API 层持久化。 */
  getLastItemsRequest(): PurchaseHistoryRequest | null {
    return this.lastItemsRequest
  }

  /** 使用缓存的 items 请求重放购买历史，并解析返回的 DMAP 数据。 */
  async replay(request: PurchaseHistoryRequest): Promise<OwnedAppRecord[]> {
    if (!this.account) await this.loadAccount()
    if (!this.account) throw new Error("Apple 账号尚未登录")

    const body = Data.fromBase64String(request.bodyBase64)
    if (!body) throw new Error("缓存的 items request body 无法还原")

    const response = await fetch(request.url, {
      method: "POST",
      headers: {
        ...purchaseHistoryHeaders(this.account, this.guid, new Date()),
        "content-type": "application/x-dmap-tagged",
        "X-Apple-ActionSignature": request.signature,
      },
      body: body,
    })
    const data = await response.bytes()
    if (response.status < 200 || response.status >= 308) {
      throw new Error(`items 重放失败: HTTP ${response.status}`)
    }
    validateDMAPStatus("purchase history items", data)
    return parseOwnedApps(data)
  }

  /** 登录 PurchaseDaap，获取本次查询使用的 session ID。 */
  async #login(): Promise<PurchaseHistoryLoginResult> {
    if (!this.account) throw new Error("Apple 账号尚未登录")
    const response = await request(`${PURCHASE_DAAP_BASE_URL}/login`, {
      method: "POST",
      headers: purchaseHistoryHeaders(
        this.account,
        this.guid,
        new Date(),
      ),
    })
    const data = await response.bytes()
    validateDMAPStatus("purchase history login", data)
    const sessionID = firstDMapUint(data, "mlid")
    if (sessionID === undefined || sessionID > 0xffffffff) {
      throw new Error("purchase history login response did not contain a valid session ID")
    }

    return { sessionID, data }
  }

  /** 使用 URL-form body 请求 Apple 的购买历史 revision。 */
  async update(
    sessionID: number,
    signer: SapSignerLike,
    query = OWNED_APPS_QUERY,
  ): Promise<PurchaseHistoryUpdateResult> {
    if (!this.account) throw new Error("Apple 账号尚未登录")
    const body = buildUpdateBody(sessionID, query)
    const signature = await signer.sign(body)
    const response = await request(`${PURCHASE_DAAP_BASE_URL}/update`, {
      method: "POST",
      headers: {
        ...purchaseHistoryHeaders(
          this.account,
          this.guid,
          new Date(),
        ),
        "content-type": "application/x-www-form-urlencoded",
        "X-Apple-ActionSignature": signature,
      },
      body: stringBody(body),
    })
    const data = await response.bytes()
    validateDMAPStatus("purchase history update", data)
    const revision = firstDMapUint(data, "musr")
    if (revision === undefined || revision > 0xffffffff) {
      throw new Error("purchase history update response did not contain a valid revision")
    }

    return { revision, data }
  }

  /** 使用 DMAP body 请求指定 revision 的全部购买记录。 */
  async items(
    sessionID: number,
    revision: number,
    signer: SapSignerLike,
    now = new Date(),
    query = OWNED_APPS_QUERY,
  ): Promise<Uint8Array> {
    if (!this.account) throw new Error("Apple 账号尚未登录")
    const body = buildItemsBody(sessionID, revision, now, query)
    const signature = await signer.sign(body)
    const bodyData = Data.fromUint8Array(body)
    if (!bodyData) throw new Error("items request body 无法转换为 Data")
    this.lastItemsRequest = {
      url: `${PURCHASE_DAAP_BASE_URL}/databases/${revision}/items`,
      bodyBase64: bodyData.toBase64String(),
      signature,
      revision,
    }
    const response = await fetch(`${PURCHASE_DAAP_BASE_URL}/databases/${revision}/items`, {
      method: "POST",
      headers: {
        ...purchaseHistoryHeaders(
          this.account,
          this.guid,
          now,
        ),
        "content-type": "application/x-dmap-tagged",
        "X-Apple-ActionSignature": signature,
      },
      body: responseBody(body),
    })
    const data = await response.bytes()
    if (response.status < 200 || response.status >= 308) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseErrorDetail(data)}`)
    }
    validateDMAPStatus("purchase history items", data)
    return data
  }
}
