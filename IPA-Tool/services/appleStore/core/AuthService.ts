import { $cache, $http, plist } from "../runtime"
import { appleStoreConfig, configureAppleHttp, CustomError, getMac } from "./shared"
import { getPassword, deletePassword as deleteLoginPassword } from "../../../utils/loginHistoryStorage"

type LoginParams = {
  appleId: string
  password: string
  code?: string
}

export type AppleLoginResponse = Record<string, any> & {
  accountInfo?: {
    appleId?: string
    address?: {
      firstName?: string
      lastName?: string
    }
  }
  Cookie?: string
  storeFront?: string
  dsPersonId?: string | number
  passwordToken?: string
}

export type AuthSessionSummary = {
  account: string
  username: string
  storeFront: string
}

const loginKey = appleStoreConfig.keys.appleStoreLogin

const getAppleId = (session: AppleLoginResponse | undefined | null) => session?.accountInfo?.appleId

const parseLoginCache = () => {
  const cache = $cache.getJson<AppleLoginResponse | AppleLoginResponse[]>(loginKey)
  if (!cache) return []
  return Array.isArray(cache) ? cache : [cache]
}

const saveLoginCache = (sessions: AppleLoginResponse[]) => {
  $cache.setJson(loginKey, sessions)
}

const getActiveLogin = () => parseLoginCache()[0]

const upsertActiveLogin = (session: AppleLoginResponse) => {
  const appleId = getAppleId(session)
  if (!appleId) throw new CustomError("Login", "❌登录响应缺少 Apple ID")

  const sessions = parseLoginCache()
  const nextSessions = [
    session,
    ...sessions.filter(item => getAppleId(item) !== appleId),
  ]
  saveLoginCache(nextSessions)
  return session
}

const getDisplayName = (session: AppleLoginResponse) => {
  const account = getAppleId(session)
  const address = session.accountInfo?.address
  const name = [
    address?.firstName,
    address?.lastName,
  ].filter(Boolean).join("")
  return name || account || ""
}

const toSessionSummary = (session: AppleLoginResponse): AuthSessionSummary | null => {
  const account = getAppleId(session)
  if (!account) return null
  return {
    account,
    username: getDisplayName(session),
    storeFront: session.storeFront ?? "",
  }
}

export class AuthService {
  static async #login({ appleId, password, code }: LoginParams): Promise<AppleLoginResponse> {
    configureAppleHttp()
    const dataJson = {
      attempt: code ? 2 : 4,
      createSession: "true",
      guid: getMac(),
      rmp: 0,
      why: "signIn",
      appleId,
      password: `${password}${code ?? ""}`,
    }
    const body = plist.build(dataJson)
    const url = `https://auth.itunes.apple.com/auth/v1/native/fast/?guid=${dataJson.guid}`
    const resp = await $http.post({ url, body: String(body), timeout: 6 })
    const parsedResp = plist.parse(String(resp.body)) as AppleLoginResponse

    this.validate(parsedResp)

    const Cookie = resp.headers["set-cookie"]
    const storeFront = resp.headers["x-set-apple-store-front"]?.split("-")?.[0]
    // 密码不入 Storage；Keychain 由 useAuth.login() 侧写入
    const loginResp = { ...parsedResp, Cookie, storeFront } as AppleLoginResponse
    upsertActiveLogin(loginResp)
    return loginResp
  }

  static async login(op?: LoginParams): Promise<AppleLoginResponse> {
    const loginResp = getActiveLogin()
    if (op && !loginResp) return await this.#login(op)

    if (op && op.appleId !== loginResp?.accountInfo?.appleId) {
      return await this.#login(op)
    }

    // 与 Keychain 存取的密码对比，若不一致则重新登录
    if (op) {
      const cachedPwd = getPassword(op.appleId)
      if (op.password !== cachedPwd) return await this.#login(op)
    }

    this.validate(loginResp)
    return loginResp!
  }

  static getSessions(): AuthSessionSummary[] {
    return parseLoginCache()
      .map(toSessionSummary)
      .filter((item): item is AuthSessionSummary => !!item)
  }

  static switchSession(account: string): AuthSessionSummary[] {
    const sessions = parseLoginCache()
    const index = sessions.findIndex(item => getAppleId(item) === account)
    if (index < 0) throw new CustomError("Login", "❌未找到缓存账号，请重新登录")

    const [target] = sessions.splice(index, 1)
    sessions.unshift(target)
    saveLoginCache(sessions)
    return this.getSessions()
  }

  static removeSession(account: string): AuthSessionSummary[] {
    const sessions = parseLoginCache()
    const nextSessions = sessions.filter(item => getAppleId(item) !== account)
    if (nextSessions.length === sessions.length) {
      throw new CustomError("Login", "❌未找到要删除的缓存账号")
    }

    saveLoginCache(nextSessions)
    return this.getSessions()
  }

  static async refreshCookie(): Promise<AppleLoginResponse> {
    const { accountInfo = {} } = getActiveLogin() ?? {}
    const appleId = accountInfo.appleId
    if (!appleId) throw new CustomError("Login", "❌未登录,刷新Cookie失败,请重新登录")
    const password = getPassword(appleId)
    if (!password) throw new CustomError("Login", "❌未找到 Keychain 密码,请重新登录")
    return await this.#login({ appleId, password })
  }

  static reset() {
    // 清理所有缓存 session 对应的 Keychain 密码
    const sessions = parseLoginCache()
    for (const s of sessions) {
      const id = getAppleId(s)
      if (id) deleteLoginPassword(id)
    }
    $cache.remove(appleStoreConfig.keys.appleStoreLogin)
    $cache.remove(appleStoreConfig.keys.appleStoreMac)
    return {
      success: true,
      message: "重置成功，已清除登录信息、GUID缓存和Keychain密码",
      clearedKeys: [appleStoreConfig.keys.appleStoreLogin, appleStoreConfig.keys.appleStoreMac],
    }
  }

  static validate(loginResp: AppleLoginResponse | undefined | null) {
    if (!loginResp) throw new CustomError("Login", "❌未登录, 请先登录")

    if (!loginResp.accountInfo && !loginResp.customerMessage) {
      throw new CustomError("Login", "❌缓存数据异常， 请重新登陆")
    }

    if (Object.hasOwn(loginResp, "failureType")) {
      const { failureType, customerMessage } = loginResp
      throw new CustomError("Login", ["❌登录失败", failureType, customerMessage].join(","))
    }

    return true
  }
}
