export const APPLE_FAILURE_CODES = {
  CK_EXPIRED: "2034",
  CK_EMPTY_OR_EXPIRED: "2042",
  LICENSE_NOT_FOUND: "9610",
} as const

const APPLE_FAILURE_MESSAGES = {
  "5002": "发生未知错误",
  "2040": "已购买过，已下架",
  "2059": "未购买过，已下架，地区未上架",
  "1010": "该地区未上架",
  "2034": "CK 失效，已过期",
  "2042": "CK 失效，已过期或为空",
  "2019": "无法直接购买付费软件",
  "9610": "未购买过或应用 ID 错误",
} as const

type AppleFailureCode = keyof typeof APPLE_FAILURE_MESSAGES | (string & {})

export const getAppleFailureMessage = (code?: AppleFailureCode) => {
  if (!code) return
  const message = (APPLE_FAILURE_MESSAGES as any)[code] ?? "apple未识别的错误码"
  return `(code: ${code}): ${message}`
}

/** 表示 Apple 登录协议返回的业务错误。 */
export class LoginError extends Error {
  name = "LoginError"
}

/** 表示 Apple 下载信息协议返回的业务错误。 */
export class AppInfoError extends Error {
  name = "AppInfoError"
}

/** 表示 Apple 购买协议返回的业务错误。 */
export class PurchaseError extends Error {
  name = "PurchaseError"
}
