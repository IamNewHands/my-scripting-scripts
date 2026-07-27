import { fetch } from "scripting"

/** 统一超时 fetch；timeout 单位为秒 */
export async function fetchText(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> }
): Promise<{ ok: boolean; status: number; text: string }> {
  const timeout = options?.timeout ?? 10
  try {
    const res = await fetch(url, {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        ...(options?.headers ?? {}),
      },
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  } catch {
    return { ok: false, status: 0, text: "" }
  }
}

export async function fetchJson<T>(
  url: string,
  options?: { timeout?: number; headers?: Record<string, string> }
): Promise<T | null> {
  const { ok, text } = await fetchText(url, options)
  if (!ok || !text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === "--") return null
  const n = typeof v === "number" ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
