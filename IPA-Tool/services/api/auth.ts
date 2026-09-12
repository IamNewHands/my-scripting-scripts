import { formatAccountName } from "../tool"
import type { AuthSessionSummary, LoginParams } from "../appleStore"
import { AuthService } from "../appleStore"

export type { AuthSessionSummary } from "../appleStore"

export interface LoginResult {
  account: string
  username: string
  storeFront: string
  lastLogin: string
}

/** Apple ID 登录并返回页面使用的账号信息。 */
export const apiLogin = async ({ appleId, password, code = "" }: LoginParams): Promise<LoginResult> => {
  const loginData = await AuthService.login({ appleId, password, code })
  const account = loginData.accountInfo?.appleId
  const username = formatAccountName(
    loginData.accountInfo?.address?.firstName,
    loginData.accountInfo?.address?.lastName
  ) || account
  if (!account || !loginData.storeFront) throw new Error("登录失败，请检查账号、密码或验证码")

  return {
    account,
    username: username || account,
    storeFront: loginData.storeFront,
    lastLogin: new Date().toLocaleString("zh-CN"),
  }
}

/** 返回全部缓存 Apple 账号摘要。 */
export const apiGetAuthSessions = async (): Promise<AuthSessionSummary[]> => {
  return AuthService.getSessions()
}

/** 切换活动 Apple 账号并返回账号列表。 */
export const apiSwitchAuthSession = async (account: string): Promise<AuthSessionSummary[]> => {
  return AuthService.switchSession(account)
}

/** 删除缓存 Apple 账号并返回账号列表。 */
export const apiDeleteAuthSession = async (account: string): Promise<AuthSessionSummary[]> => {
  return AuthService.removeSession(account)
}
