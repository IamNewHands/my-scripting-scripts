/** 统一网络请求：默认超时，避免慢区拖死整页 */
import { fetch, RequestInit, Response } from "scripting"

/** 默认请求超时（秒） */
export const REQUEST_TIMEOUT_SEC = 10

/**
 * 带超时的 fetch。
 * Scripting 的 RequestInit.timeout 单位为秒。
 */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit & { timeout?: number }
): Promise<Response> {
  const timeout = init?.timeout ?? REQUEST_TIMEOUT_SEC
  return fetch(url, { ...(init || {}), timeout })
}
