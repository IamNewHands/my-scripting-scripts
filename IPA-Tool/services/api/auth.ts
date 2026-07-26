import type { ApiResponse } from "../../types/appStore"
import { localApi } from "../appleStore"

interface LoginParams {
  appleId: string
  password: string
  code: string
}

export interface LoginResult {
  account: string
  username: string
  storeFront: string
  lastLogin: string
}

export interface AuthSessionSummary {
  account: string
  username: string
  storeFront: string
}

type LoginApiData = Partial<LoginResult> | {
  loginData?: {
    storeFront?: string
    accountInfo?: {
      appleId?: string
      address?: {
        firstName?: string
        lastName?: string
      }
    }
  }
}

const normalizeLoginData = (data: LoginApiData | undefined): LoginResult | undefined => {
  if (!data) return
  if ("account" in data && data.account && data.storeFront) {
    return {
      account: data.account,
      username: data.username || data.account,
      storeFront: data.storeFront,
      lastLogin: data.lastLogin || new Date().toLocaleString("zh-CN"),
    }
  }

  const loginData = "loginData" in data ? data.loginData : undefined
  const account = loginData?.accountInfo?.appleId
  const username = [
    loginData?.accountInfo?.address?.firstName,
    loginData?.accountInfo?.address?.lastName,
  ].filter(Boolean).join("") || account

  if (!account || !loginData?.storeFront) return
  return {
    account,
    username: username || account,
    storeFront: loginData.storeFront,
    lastLogin: new Date().toLocaleString("zh-CN"),
  }
}

/**
 * Apple ID 登录
 */
export const apiLogin = async ({
  appleId,
  password,
  code,
}: LoginParams): Promise<LoginResult> => {
  const { success, data, error } = await localApi<ApiResponse<LoginApiData>>("/auth/login", {
    method: "POST",
    body: { appleId, password, code },
  })
  const loginResult = normalizeLoginData(data)

  if (!success || error || !loginResult) {
    throw new Error(error || "登录失败，请检查账号、密码或验证码")
  }

  return loginResult
}

export const apiGetAuthSessions = async (): Promise<AuthSessionSummary[]> => {
  const { success, data, error } = await localApi<ApiResponse<{ sessions?: AuthSessionSummary[] }>>("/auth/sessions", {
    method: "GET",
  })

  if (!success || error) throw new Error(error || "获取缓存账号失败")
  return data?.sessions ?? []
}

export const apiSwitchAuthSession = async (account: string): Promise<AuthSessionSummary[]> => {
  const { success, data, error } = await localApi<ApiResponse<{ sessions?: AuthSessionSummary[] }>>("/auth/switch", {
    method: "POST",
    body: { account },
  })

  if (!success || error) throw new Error(error || "切换账号失败")
  return data?.sessions ?? []
}

export const apiDeleteAuthSession = async (account: string): Promise<AuthSessionSummary[]> => {
  const { success, data, error } = await localApi<ApiResponse<{ sessions?: AuthSessionSummary[] }>>("/auth/sessions/delete", {
    method: "POST",
    body: { account },
  })

  if (!success || error) throw new Error(error || "删除账号失败")
  return data?.sessions ?? []
}

export const apiReset = async () => {
  await localApi("/auth/reset", { method: "POST" })
}
