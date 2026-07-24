import { fetchJson, fetchText, parseNumber } from "../http"
import type { StockMarket, StockQuote, StockSearchHit } from "../types"

/**
 * 根据 A 股 6 位代码推断东财 secid。
 * 1. 沪市 / 0. 深市（含创业板/北交所常见规则的简化版）
 * 预留：港股 116. / 美股 105. 等后续扩展。
 */
export function resolveCnSecid(code: string): string | null {
  const c = code.trim()
  if (!/^\d{6}$/.test(c)) return null
  // 北交所 8xxxxx、4xxxxx 在东财多为 0. 前缀（与持仓 NEWTEXCH 可能不同，P0 简化）
  if (c.startsWith("6") || c.startsWith("5") || c.startsWith("9")) {
    return `1.${c}`
  }
  // 0/1/2/3 开头深市；8/4 北交所按 0. 尝试
  return `0.${c}`
}

export function marketFromSecid(secid: string): StockMarket {
  // 预留：港股/美股 secid 前缀判断
  if (secid.startsWith("116.") || secid.startsWith("128.")) return "HK"
  if (secid.startsWith("105.") || secid.startsWith("106.") || secid.startsWith("107.")) {
    return "US"
  }
  return "CN"
}

type EmUlistResp = {
  data?: {
    diff?: Array<{
      f2?: number | string
      f3?: number | string
      f4?: number | string
      f12?: string
      f13?: number | string
      f14?: string
    }>
  }
}

function mapEmDiff(
  rows: NonNullable<NonNullable<EmUlistResp["data"]>["diff"]>
): StockQuote[] {
  return rows.map((r) => {
    const code = String(r.f12 ?? "")
    const mkt = r.f13 != null ? String(r.f13) : ""
    const secid = mkt && code ? `${mkt}.${code}` : code
    return {
      code,
      name: String(r.f14 ?? code),
      secid,
      price: parseNumber(r.f2),
      changePct: parseNumber(r.f3),
      change: parseNumber(r.f4),
    }
  })
}

/** 批量拉股票行情；优先 delay 节点，失败再试 push2 */
export async function fetchStockQuotes(secids: string[]): Promise<StockQuote[]> {
  const unique = [...new Set(secids.filter(Boolean))]
  if (unique.length === 0) return []

  const fields = "f2,f3,f4,f12,f13,f14"
  const q = unique.join(",")
  const urls = [
    `https://push2delay.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=${fields}&secids=${q}`,
    `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=${fields}&secids=${q}`,
  ]

  for (const url of urls) {
    const json = await fetchJson<EmUlistResp>(url, { timeout: 10 })
    const diff = json?.data?.diff
    if (Array.isArray(diff) && diff.length > 0) {
      return mapEmDiff(diff)
    }
  }

  // 备用：新浪（仅 A 股 sh/sz）
  return fetchSinaQuotesFallback(unique)
}

async function fetchSinaQuotesFallback(secids: string[]): Promise<StockQuote[]> {
  const list: string[] = []
  const secidToSina: Record<string, string> = {}
  for (const sid of secids) {
    const [mkt, code] = sid.split(".")
    if (!code || !/^\d{6}$/.test(code)) continue
    // 仅 CN
    if (mkt !== "0" && mkt !== "1") continue
    const sina = mkt === "1" ? `sh${code}` : `sz${code}`
    secidToSina[sid] = sina
    list.push(sina)
  }
  if (list.length === 0) return []

  const url = `https://hq.sinajs.cn/list=${list.join(",")}`
  const { ok, text } = await fetchText(url, {
    timeout: 10,
    headers: { Referer: "https://finance.sina.com.cn" },
  })
  if (!ok || !text) return []

  const out: StockQuote[] = []
  for (const [secid, sina] of Object.entries(secidToSina)) {
    const re = new RegExp(`hq_str_${sina}="([^"]*)"`)
    const m = text.match(re)
    if (!m || !m[1]) continue
    const parts = m[1].split(",")
    // 名称,今开,昨收,现价,最高,最低,...
    const name = parts[0] || secid
    const preClose = parseNumber(parts[2])
    const price = parseNumber(parts[3])
    let change: number | null = null
    let changePct: number | null = null
    if (price != null && preClose != null && preClose !== 0) {
      change = price - preClose
      changePct = (change / preClose) * 100
    }
    out.push({
      code: secid.split(".")[1] || "",
      name,
      secid,
      price,
      changePct,
      change,
    })
  }
  return out
}

type TqHintEntry = {
  market: string // sh/sz/hk/us/N
  code: string
  name: string
  py: string
  type: string // GP-A/GP/ETF/LOF/FJ 等
}

/** 解析腾讯 v_hint 单条："sh~600519~贵州茅台~gzmt~GP-A"。
 * 重要：腾讯 jsonp 包装会把 CJK 字符转义为 \\uXXXX，需要 JSON.parse 反转义。
 * （unescape 在部分运行时不生效，统一用 JSON.parse）
 */
function unescapeTqField(s: string): string {
  if (!s) return ""
  if (!s.includes("\\u")) return s
  try {
    return JSON.parse('"' + s + '"') as string
  } catch {
    return s
  }
}

function parseTqHint(entry: string): TqHintEntry | null {
  const parts = entry.split("~")
  if (parts.length < 4) return null
  const market = parts[0]?.trim() || ""
  const code = parts[1]?.trim() || ""
  if (!market || !code) return null
  // A 股 6 位数字；港股 5 位数字；美股 1-5 位字母
  const cn = /^\d{6}$/.test(code)
  const hk = market === "hk" && /^\d{5}$/.test(code)
  const us = market === "us" && /^[A-Za-z]{1,5}$/.test(code)
  if (!cn && !hk && !us) return null
  const name = unescapeTqField(parts[2] || "") || code
  const py = unescapeTqField(parts[3] || "")
  const type = unescapeTqField(parts[4] || "")
  return { market, code, name, py, type }
}

/**
 * 腾讯市场 → 东财 secid 前缀。
 * A 股：sh → 1.，sz → 0.
 * 港股：hk → 116. 5 位数字代码
 * 美股：us → 105. (NASDAQ/NYSE 通用) / 106. PINK / 107. NYSE
 * 默认为 105.（覆盖多数美股）
 */
function tqMarketToSecid(market: string, code: string): string | null {
  if (market === "sh") return `1.${code}`
  if (market === "sz") return `0.${code}`
  if (market === "hk") return `116.${code}`
  if (market === "us") {
    // 腾讯 us 后缀 .oq (NASDAQ) / .ps (PINK) / .n (NYSE) 等。股票代码作为 secid 主体。
    // 东财 105. 作为默认大盘股。
    return `105.${code.toUpperCase()}`
  }
  return null
}

/** 腾讯市场枚举 → StockMarket */
function tqMarketToStockMarket(market: string): "CN" | "HK" | "US" | null {
  if (market === "sh" || market === "sz") return "CN"
  if (market === "hk") return "HK"
  if (market === "us") return "US"
  return null
}

/**
 * 股票搜索：腾讯 smartbox suggest（中文/拼音/代码都能搜，支持 A 股/港股/美股）。
 * 1) 任何关键字 -> 腾讯 suggest
 * 2) 腾讯无结果 -> 纯 6 位代码兑底走东财行情拿名称
 */
export async function searchStock(keyword: string): Promise<StockSearchHit[]> {
  const kw = keyword.trim()
  if (!kw) return []

  // 先走腾讯 suggest（支持中文/拼音/代码 / 港股 / 美股）
  try {
    const url =
      `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(kw)}&t=all&c=20`
    const { ok, text } = await fetchText(url, { timeout: 8 })
    if (ok && text) {
      const m = text.match(/v_hint="([^"]*)"/)
      const data = m?.[1] || ""
      if (data && data !== "N") {
        const hits: StockSearchHit[] = []
        const seen = new Set<string>()
        const entries = data.split("^")
        for (const raw of entries) {
          const e = parseTqHint(raw)
          if (!e) continue
          const secid = tqMarketToSecid(e.market, e.code)
          const market = tqMarketToStockMarket(e.market)
          if (!secid || !market) continue
          if (seen.has(secid)) continue
          seen.add(secid)
          hits.push({
            code: e.code,
            name: e.name,
            market,
            secid,
          })
          if (hits.length >= 12) break
        }
        if (hits.length > 0) return hits
      }
    }
  } catch {
    // 腾讯 suggest 失败走代码兑底
  }

  // 兑底 1：纯 6 位 A 股代码 → 解析 secid 并拉一次行情拿名称
  if (/^\d{6}$/.test(kw)) {
    const secid = resolveCnSecid(kw)
    if (!secid) return []
    const quotes = await fetchStockQuotes([secid])
    const q = quotes[0]
    return [
      {
        code: kw,
        name: q?.name || kw,
        market: "CN",
        secid,
      },
    ]
  }

  // 兑底 2：5 位数字 → 港股（腾讯未收录的股）
  if (/^\d{5}$/.test(kw)) {
    const sid = `116.${kw}`
    const quotes = await fetchStockQuotes([sid])
    const q = quotes[0]
    if (q && q.price != null) {
      return [{ code: kw, name: q.name || kw, market: "HK", secid: sid }]
    }
  }

  // 兑底 3：1-5 位字母 → 美股 ticker
  if (/^[A-Za-z]{1,5}$/.test(kw)) {
    const sid = `105.${kw.toUpperCase()}`
    const quotes = await fetchStockQuotes([sid])
    const q = quotes[0]
    if (q && q.price != null) {
      return [{ code: kw.toUpperCase(), name: q.name || kw.toUpperCase(), market: "US", secid: sid }]
    }
  }

  return []
}

/** 按 secid 建索引 */
export function indexQuotes(quotes: StockQuote[]): Map<string, StockQuote> {
  const map = new Map<string, StockQuote>()
  for (const q of quotes) {
    if (q.secid) map.set(q.secid, q)
    // 兼容仅代码匹配
    if (q.code) map.set(q.code, q)
  }
  return map
}

/** 股票日K一行（与基金历史表对齐） */
export type StockHistoryPoint = {
  date: string
  close: number
  chgPct: number
}

type KlineResp = {
  data?: {
    klines?: string[]
  }
}

type TqFqKline = {
  data?: Record<string, {
    qfqday?: string[][]
    day?: string[][]
  }>
}

/**
 * 拉取股票日 K 历史（收盘价 + 涨跌幅）。
 *
 * 重要：东财 push2his.kline / push2.kline 在 iOS scripting runtime 下被网络层阻断
 * （返回「网络连接已中断」）。统一走腾讯 web.ifzq.gtimg.cn fqkline，可服务 A 股 + 港股。
 * 美股腾讯没接口，返回空。
 */
export async function fetchStockHistory(
  secid: string,
  days: 7 | 15 | 30 = 30
): Promise<StockHistoryPoint[]> {
  const sid = String(secid || "").trim()
  if (!sid || !sid.includes(".")) return []

  const lmt = Math.min(Math.max(days + 5, 10), 60)
  const market = sid.split(".")[0] || ""
  const code = sid.split(".")[1] || ""

  // 腾讯市场前缀：sh/sz/hk
  let tqMarket: "sh" | "sz" | "hk" | null = null
  if (market === "1") tqMarket = "sh"
  else if (market === "0") tqMarket = "sz"
  else if (market === "116") tqMarket = "hk"

  if (!tqMarket) {
    // 105./106./107. 美股：腾讯不服务，返回空
    return []
  }

  return fetchTqStockHistory(tqMarket, code, lmt, days)
}

/**
 * 腾讯日 K 通用接口（A 股/港股）。
 * param: {market}{code},day,,,{lmt},qfq
 * 响应：data.{market}{code}.qfqday = [[date, open, close, high, low, volume], ...]
 * A 股返回 qfqday（带前复权），港股返回 day（腾讯未提供港股复权）。
 */
async function fetchTqStockHistory(
  market: "sh" | "sz" | "hk",
  code: string,
  lmt: number,
  days: number
): Promise<StockHistoryPoint[]> {
  if (!code) return []
  // A 股需为 6 位数字，港股 5 位数字
  if (market !== "hk" && !/^\d{6}$/.test(code)) return []
  if (market === "hk" && !/^\d{5}$/.test(code)) return []

  const url =
    `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get` +
    `?param=${market}${code},day,,,${lmt},qfq`

  const json = await fetchJson<TqFqKline>(url, { timeout: 12 })
  // 优先取 qfqday（A 股前复权）；无则取 day（港股）
  const list = json?.data?.[`${market}${code}`]?.qfqday
    ?? json?.data?.[`${market}${code}`]?.day
  if (!Array.isArray(list) || list.length === 0) return []

  return parseTqKlines(list, days)
}

/** 解析腾讯 K 线：[date, open, close, high, low, volume] */
function parseTqKlines(
  list: string[][],
  days: number
): StockHistoryPoint[] {
  const points: StockHistoryPoint[] = []
  let prevClose: number | null = null
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 3) continue
    const date = String(row[0]).slice(0, 10)
    const close = parseNumber(row[2])
    if (!date || close == null || close <= 0) continue
    let chgPct = 0
    if (prevClose != null && prevClose > 0) {
      chgPct = ((close - prevClose) / prevClose) * 100
    }
    points.push({ date, close, chgPct })
    prevClose = close
  }
  return points.length > days ? points.slice(points.length - days) : points
}
