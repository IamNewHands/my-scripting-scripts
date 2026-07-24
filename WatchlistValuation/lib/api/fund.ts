import { fetchJson, parseNumber } from "../http"
import { getHoldingsCache, setHoldingsCache } from "../storage"
import type {
  FundHoldingsCache,
  FundHoldingRow,
  FundNavSnap,
  FundSearchHit,
} from "../types"

const DEVICE_ID = "scripting-watchlist-p0"

type MnfResp = {
  Datas?: Array<{
    FCODE?: string
    SHORTNAME?: string
    NAV?: string | number
    PDATE?: string
    NAVCHGRT?: string | number
    GSZ?: string | number | null
    GSZZL?: string | number | null
    GZTIME?: string | null
  }>
  ErrCode?: number
}

/** 批量基金净值（GSZ 可能为空，仅用 NAV） */
export async function fetchFundNavs(codes: string[]): Promise<FundNavSnap[]> {
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))]
  if (unique.length === 0) return []

  const url =
    "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo" +
    `?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1` +
    `&deviceid=${DEVICE_ID}&Fcodes=${unique.join(",")}`

  const json = await fetchJson<MnfResp>(url, { timeout: 12 })
  const datas = json?.Datas
  if (!Array.isArray(datas)) return []

  return datas.map((row) => ({
    code: String(row.FCODE ?? ""),
    name: String(row.SHORTNAME ?? row.FCODE ?? ""),
    nav: parseNumber(row.NAV),
    navDate: String(row.PDATE ?? ""),
    navChgPct: parseNumber(row.NAVCHGRT),
    gsz: parseNumber(row.GSZ),
    gszzl: parseNumber(row.GSZZL),
    gztime: row.GZTIME ? String(row.GZTIME) : null,
  }))
}

type HisResp = {
  Datas?: Array<{
    FSRQ?: string
    DWJZ?: string
    JZZZL?: string
  }>
}

/**
 * 获取昨日净值与涨跌幅。
 * 返回 { prevNav, prevChgPct } 或 null（接口失败时）。
 * 策略：取历史列表第二条（index 1），第一条通常是今日或最新。
 */
export async function fetchFundPrevNav(
  code: string
): Promise<{ prevNav: number; prevChgPct: number } | null> {
  const url =
    "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList" +
    `?FCODE=${encodeURIComponent(code)}&pageIndex=1&pageSize=3` +
    `&deviceid=${DEVICE_ID}&plat=Android&product=EFund&appType=ttjj&Version=1`
  const json = await fetchJson<HisResp>(url, { timeout: 10 })
  const list = json?.Datas ?? []
  if (list.length < 2) return null
  const prev = list[1]
  const prevNav = parseNumber(prev.DWJZ)
  const prevChgPct = parseNumber(prev.JZZZL)
  if (prevNav == null) return null
  return { prevNav, prevChgPct: prevChgPct ?? 0 }
}

type SearchResp = {
  Datas?: Array<{
    CODE?: string
    NAME?: string
    FundBaseInfo?: { SHORTNAME?: string }
  }>
}

/** 基金搜索（代码/拼音/名称） */
export async function searchFund(keyword: string): Promise<FundSearchHit[]> {
  const key = keyword.trim()
  if (!key) return []
  const url =
    "https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=9&key=" +
    encodeURIComponent(key)
  const json = await fetchJson<SearchResp>(url, { timeout: 10 })
  const datas = json?.Datas
  if (!Array.isArray(datas)) {
    // 纯代码兜底
    if (/^\d{6}$/.test(key)) {
      const navs = await fetchFundNavs([key])
      if (navs[0]) {
        return [{ code: navs[0].code, name: navs[0].name }]
      }
    }
    return []
  }

  const hits: FundSearchHit[] = []
  for (const row of datas) {
    const code = String(row.CODE ?? "").trim()
    if (!/^\d{6}$/.test(code)) continue
    const name =
      row.FundBaseInfo?.SHORTNAME ||
      String(row.NAME ?? "").replace(code, "").trim() ||
      code
    if (!hits.some((h) => h.code === code)) {
      hits.push({ code, name })
    }
    if (hits.length >= 12) break
  }
  return hits
}

type PositionResp = {
  Datas?: {
    fundStocks?: Array<{
      GPDM?: string
      GPJC?: string
      JZBL?: string | number
      TEXCH?: string
      NEWTEXCH?: string
    }>
  }
  Expansion?: string // 季报报告日期，如 "2026-06-30"
}

const HOLDINGS_TTL_MS = 12 * 60 * 60 * 1000

/**
 * 从 A 股代码推断东财交易所前缀。
 * 沪市(1.)：6/9 开头的主板、5/56/58/59 开头的 ETF/可转债
 * 深市(0.)：0/1/2/3 开头的深市主板/创业板；4/8 开头北交所；15 开头深市 ETF
 * 返回 null 表示无法判断（依赖 API 提供的 NEWTEXCH/TEXCH）。
 */
function inferExchange(code: string): "1" | "0" | null {
  if (!code || code.length < 6) return null
  const c = code.trim()
  if (c.startsWith("6") || c.startsWith("9")) return "1"
  if (c.startsWith("51") || c.startsWith("58") || c.startsWith("56") || c.startsWith("59")) return "1"
  if (c.startsWith("15")) return "0"
  if (c.startsWith("0") || c.startsWith("1") || c.startsWith("2") || c.startsWith("3")) return "0"
  if (c.startsWith("4") || c.startsWith("8")) return "0"  // 北交所默认按深市
  return null
}

/** 解析报告日期字符串（YYYY-MM-DD → timestamp） */
function parseReportDate(s: string | undefined): number | null {
  if (!s) return null
  // 仅取日期部分（如 "2026-06-30"）
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const ts = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isFinite(ts) ? ts : null
}

/** 获取基金重仓（带本地缓存）。updatedAt 使用 API 返回的报告日期（Expansion） */
export async function fetchFundHoldings(
  code: string,
  force = false
): Promise<FundHoldingRow[]> {
  if (!force) {
    const cached = getHoldingsCache(code)
    if (cached && Date.now() - cached.updatedAt < HOLDINGS_TTL_MS) {
      return cached.rows
    }
  }

  const url =
    "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition" +
    `?FCODE=${encodeURIComponent(code)}&deviceid=${DEVICE_ID}` +
    `&plat=Android&product=EFund&appType=ttjj&Version=1`

  const json = await fetchJson<PositionResp>(url, { timeout: 12 })
  const stocks = json?.Datas?.fundStocks
  if (!Array.isArray(stocks) || stocks.length === 0) {
    // 保留旧缓存
    const cached = getHoldingsCache(code)
    return cached?.rows ?? []
  }

  const rows: FundHoldingRow[] = []
  for (const s of stocks) {
    const c = String(s.GPDM ?? "").trim()
    if (!c) continue
    const apiEx = String(s.NEWTEXCH ?? s.TEXCH ?? "").trim()
    // API 提供则用 API；缺失则按股票代码推断（修复深市 ETF 填错交易所的 bug）
    const ex = apiEx || inferExchange(c) || "1"
    const weightPct = parseNumber(s.JZBL) ?? 0
    rows.push({
      code: c,
      name: String(s.GPJC ?? c),
      weightPct,
      exchange: ex,
      secid: `${ex}.${c}`,
    })
  }

  // 优先使用 API 返回的 Expansion 报告日期；如缺失则降级为当前时间
  const reportTs = parseReportDate(json?.Expansion) ?? Date.now()
  const cache: FundHoldingsCache = {
    code,
    updatedAt: reportTs,
    rows,
  }
  setHoldingsCache(cache)
  return rows
}

/** 历史净值数据点 */
export type FundHistoryPoint = {
  date: string // YYYY-MM-DD
  nav: number // 单位净值
  chgPct: number // 涨跌幅%
}

/**
 * 获取基金历史净值（近15或30天）
 * @param code 基金代码
 * @param days 天数（15 或 30）
 * @returns 历史净值数组，按日期从旧到新排序
 */
export async function fetchFundHistory(
  code: string,
  days: 7 | 15 | 30 = 30
): Promise<FundHistoryPoint[]> {
  const c = String(code ?? "").trim()
  if (!/^\d{6}$/.test(c)) return []

  // 多拉几条，避免非交易日不足
  const pageSize = Math.min(Math.max(days + 5, 15), 40)
  const url =
    "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList" +
    `?FCODE=${encodeURIComponent(c)}&pageIndex=1&pageSize=${pageSize}` +
    `&deviceid=${DEVICE_ID}&plat=Android&product=EFund&appType=ttjj&Version=1`

  const json = await fetchJson<HisResp>(url, { timeout: 12 })
  const list = json?.Datas
  if (!Array.isArray(list) || list.length === 0) return []

  const points: FundHistoryPoint[] = []
  for (const row of list) {
    const date = String(row.FSRQ ?? "").trim().slice(0, 10)
    const nav = parseNumber(row.DWJZ)
    const chgPct = parseNumber(row.JZZZL) ?? 0
    if (date && nav != null && nav > 0) {
      points.push({ date, nav, chgPct })
    }
  }

  // 接口返回从新到旧 → 反转为从旧到新（图表左→右）
  const sorted = points.reverse()
  // 只保留最近 days 个点
  return sorted.length > days ? sorted.slice(sorted.length - days) : sorted
}
