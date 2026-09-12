import { fetch, type RequestInit } from "scripting"

export type RequestOptions = RequestInit

/** 发起原生请求，并保留项目现有的 200–307 状态检查。 */
export const request = async (url: string, options: RequestOptions = {}) => {
  const response = await fetch(url, options)
  if (response.status >= 200 && response.status <= 307) return response

  const statusText = response.statusText ? ` ${response.statusText}` : ""
  throw new Error(`HTTP ${response.status}${statusText}: ${url}`)
}
