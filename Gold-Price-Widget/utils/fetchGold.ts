import { fetch } from "scripting"

export type GoldPriceResult = {
  buyPrice: string
  sellPrice: string
  changeValue: string
  changePercent: string  // 涨跌幅百分比，如 "-0.96"
  updateTime: string
}

function formatTimestamp(timestamp: string | number | undefined): string {
  if (timestamp == null) return "--:--"
  const ts = typeof timestamp === "number" ? timestamp : parseInt(timestamp, 10)
  if (Number.isNaN(ts)) return "--:--"

  const date = new Date(ts)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}/${month}/${day} ${hour}:${minute}:${second}`
}

// 统一更新时间格式：支持时间戳（毫秒）或已格式化的字符串
function normalizeUpdateTime(raw: string | number | undefined): string {
  if (raw == null) return "--:--"
  const num = typeof raw === "number" ? raw : parseInt(raw, 10)
  if (Number.isFinite(num) && num > 10000000000) {
    return formatTimestamp(num)
  }
  return String(raw).trim() || "--:--"
}

// 计算涨跌幅百分比
function calcChangePercent(changeValue: string, price: string): string {
  const change = Number.parseFloat(changeValue)
  const base = Number.parseFloat(price)
  if (!Number.isFinite(change) || !Number.isFinite(base) || base === 0) return ""
  return ((change / base) * 100).toFixed(2)
}

export function isValidGoldPriceResult(result: GoldPriceResult | null | undefined): result is GoldPriceResult {
  if (!result) return false
  const buyPrice = Number.parseFloat(result.buyPrice)
  const sellPrice = Number.parseFloat(result.sellPrice)
  return Number.isFinite(buyPrice) && Number.isFinite(sellPrice)
}

export async function fetchCMBGoldPrice(signal?: AbortSignal) {
  const apiUrl = "https://mbmodule-openapi.paas.cmbchina.com/product/v1/func/market-center"
  const body = "params=" + encodeURIComponent(JSON.stringify([{ prdType: "H", prdCode: "" }]))

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data?.data ?? null
  } catch (e) {
    console.error("fetchCMBGoldPrice failed:", e)
    return null
  }
}

export async function fetchZSGoldPrice(signal?: AbortSignal) {
  const apiUrl = "https://api.jdjygold.com/gw2/generic/jrm/h5/m/stdLatestPrice?productSku=1961543816"

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (e) {
    console.error("fetchZSGoldPrice failed:", e)
    return null
  }
}

// GoldMonitor 聚合 API：支持多家银行，统一 GET 接口
// 文档：https://jin.20021002.xyz/api.php?doc=1
const GOLDMONITOR_TYPES: Record<string, string> = {
  icbc: "工商银行",
  ms: "民生银行",
  cgb: "广发银行",
  cib: "兴业银行",
  jd: "京东黄金",
  gj: "国际伦敦金",
}

// 获取今天的日期前缀（用于拼合 GoldMonitor 的 HH:MM:SS 时间）
function todayDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}/${m}/${day}`
}

export async function fetchGoldMonitorPrice(type: string, signal?: AbortSignal) {
  const apiUrl = `https://jin.20021002.xyz/api.php?type=${type}`

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const json = await response.json()
    if (json?.code !== 200 || !json?.data) return null

    return json.data as {
      price: number
      change: number
      change_pct: number
      prev_close: number
      update_time: string
    }
  } catch (e) {
    console.error(`fetchGoldMonitorPrice(${type}) failed:`, e)
    return null
  }
}

export async function fetchGoldPrice(
  source: "cmb" | "zs" | "icbc" | "ms" | "cgb" | "cib" | "jd" | "gj",
  signal?: AbortSignal,
): Promise<GoldPriceResult | null> {
  // GoldMonitor 数据源（单价格，无买入/卖出区分）
  if (source !== "cmb" && source !== "zs") {
    const data = await fetchGoldMonitorPrice(source, signal)
    if (!data) return null

    const price = String(data.price ?? "")
    const changeValue = String(data.change ?? "0")
    const changePercent = String(data.change_pct ?? "")

    return {
      buyPrice: price,
      sellPrice: price,
      changeValue,
      changePercent,
      updateTime: normalizeUpdateTime(`${todayDateStr()} ${data.update_time}`),
    }
  }

  // 浙商银行（单价格，通过京东金融 API）
  if (source === "zs") {
    const data = await fetchZSGoldPrice(signal)
    const payload = data?.resultData?.datas
    if (!payload) return null

    const price = String(payload.price ?? "")
    const changeValue = String(payload.upAndDownAmt ?? "0")

    return {
      buyPrice: price,
      sellPrice: price,
      changeValue,
      changePercent: calcChangePercent(changeValue, price),
      updateTime: normalizeUpdateTime(payload.time),
    }
  }

  // 招商银行（有买入/卖出价）
  const data = await fetchCMBGoldPrice(signal)
  const goldInfo = data?.FQAMBPRCZ1
  if (!goldInfo) return null

  const buyPrice = String(goldInfo.zBuyPrc ?? "")
  const changeValue = String(goldInfo.zDvlCur ?? "0")

  return {
    buyPrice,
    sellPrice: String(goldInfo.zSelPrc ?? ""),
    changeValue,
    changePercent: calcChangePercent(changeValue, buyPrice),
    updateTime: normalizeUpdateTime(data?.NowTime),
  }
}