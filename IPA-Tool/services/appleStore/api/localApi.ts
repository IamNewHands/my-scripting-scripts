import { AuthService } from "../core/AuthService"
import { StoreService } from "../core/StoreService"
import { VersionService } from "../core/VersionService"
import { createResponse, getErrorMessage, validate } from "../core/shared"

type LocalApiOptions = {
  method?: "GET" | "POST"
  body?: Record<string, any>
  query?: Record<string, string | number | undefined>
}

const match = (path: string, pattern: RegExp) => path.match(pattern)

export const localApi = async <T = any>(path: string, options: LocalApiOptions = {}) => {
  try {
    const method = options.method ?? "GET"
    const query = options.query ?? {}

    if (method === "POST" && path === "/auth/login") {
      const { appleId, password, code } = options.body ?? {}
      validate(appleId && password, "缺少必要参数: appleId 和 password")
      const result = await AuthService.login({ appleId, password, code })
      return createResponse(true, { message: "登录成功", loginData: result }) as T
    }

    if (method === "GET" && path === "/auth/sessions") {
      return createResponse(true, { sessions: AuthService.getSessions() }) as T
    }

    if (method === "POST" && path === "/auth/switch") {
      const { account } = options.body ?? {}
      validate(account, "缺少必要参数: account")
      return createResponse(true, { sessions: AuthService.switchSession(account) }) as T
    }

    if (method === "POST" && path === "/auth/sessions/delete") {
      const { account } = options.body ?? {}
      validate(account, "缺少必要参数: account")
      return createResponse(true, { sessions: AuthService.removeSession(account) }) as T
    }

    if (method === "POST" && path === "/auth/reset") {
      return createResponse(true, AuthService.reset()) as T
    }

    if (method === "POST" && path === "/auth/refresh") {
      await AuthService.refreshCookie()
      return createResponse(true, { message: "Cookie 刷新成功" }) as T
    }

    const appInfoMatch = match(path, /^\/apps\/(\d+)$/)
    if (method === "GET" && appInfoMatch) {
      const id = appInfoMatch[1]
      const appInfo = await StoreService.getAppInfo(Number(id), query.appVerId)
      return createResponse(true, { appId: id, appInfo }) as T
    }

    const versionsMatch = match(path, /^\/apps\/(\d+)\/versions$/)
    if (method === "GET" && versionsMatch) {
      const id = versionsMatch[1]
      const versions = await StoreService.getVersions({
        salableAdamId: Number(id),
        startVersionId: query.appVerId ? Number(query.appVerId) : undefined,
      })
      return createResponse(true, { appId: id, ...versions, appVerId: query.appVerId }) as T
    }

    const legacyMatch = match(path, /^\/apps\/(\d+)\/versions\/legacy$/)
    if (method === "GET" && legacyMatch) {
      const id = legacyMatch[1]
      const data = query.selset
        ? await VersionService.getAppVersionList(id, String(query.selset))
        : await VersionService.concurrentGetVersionList(id).catch(({ errors = [], error }) => {
            throw errors.length ? errors.map((e: Error) => e.message).join("\n") : error
          })
      return createResponse(true, data) as T
    }

    const purchaseMatch = match(path, /^\/apps\/(\d+)\/purchase$/)
    if (method === "POST" && purchaseMatch) {
      const id = purchaseMatch[1]
      const result = await StoreService.purchaseApp(id)
      return createResponse(true, { appId: id, message: "购买请求已提交", purchaseResult: result }) as T
    }

    throw new Error(`本地 API 未实现: ${method} ${path}`)
  } catch (error) {
    return createResponse(false, null, getErrorMessage(error)) as T
  }
}
