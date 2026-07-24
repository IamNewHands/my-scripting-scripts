import { fetchFundPrevNav } from "../api/fund"

type PrevNavCache = {
  [code: string]: {
    date: string // 数据日期（如"2026-07-23"）
    prevNav: number
    prevChgPct: number
    cachedAt: number // 缓存时间戳
  }
}

type NegCache = {
  [code: string]: number // 失败时间戳
}

const CACHE_KEY = "fund_prevnav_cache"
const NEG_CACHE_KEY = "fund_prevnav_negcache"
/** 正向缓存有效期：48h（覆盖一个完整交易日 + 周末对冲） */
const TTL_MS = 48 * 60 * 60 * 1000
/** 负缓存有效期：5 分钟内不再重试同 code（避免网络抖动时反复打 API） */
const NEG_TTL_MS = 5 * 60 * 1000

function todayStr(): string {
  const now = new Date()
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`
  )
}

function readCache(): PrevNavCache {
  return (Storage.get<PrevNavCache>(CACHE_KEY) as PrevNavCache) || {}
}

function writeCache(cache: PrevNavCache): void {
  Storage.set(CACHE_KEY, cache)
}

function readNegCache(): NegCache {
  return (Storage.get<NegCache>(NEG_CACHE_KEY) as NegCache) || {}
}

function writeNegCache(neg: NegCache): void {
  Storage.set(NEG_CACHE_KEY, neg)
}

/**
 * 获取基金昨日净值（带缓存）
 * 缓存策略：
 * 1) 跨自然日失效（list[1] 的含义会变） + 48h TTL
 * 2) 失败负缓存 5 分钟（避免网络抖动反复打接口）
 */
export async function fetchPrevNavCached(
  code: string
): Promise<{ prevNav: number; prevChgPct: number } | null> {
  const today = todayStr()
  const now = Date.now()
  const cache = readCache()
  const neg = readNegCache()

  // 1) 失败负缓存：5 分钟内直接返回 null
  const failAt = neg[code]
  if (failAt && now - failAt < NEG_TTL_MS) {
    return null
  }

  // 2) 正向缓存：同日 + 48h 内 + 数据有效
  const cached = cache[code]
  if (
    cached &&
    cached.date === today &&
    now - (cached.cachedAt || 0) < TTL_MS &&
    Number.isFinite(cached.prevChgPct) &&
    cached.prevNav > 0
  ) {
    return { prevNav: cached.prevNav, prevChgPct: cached.prevChgPct }
  }

  // 3) 拉新数据
  try {
    const fresh = await fetchFundPrevNav(code)
    if (fresh && fresh.prevNav > 0) {
      cache[code] = {
        date: today,
        prevNav: fresh.prevNav,
        prevChgPct: fresh.prevChgPct,
        cachedAt: now,
      }
      writeCache(cache)
      // 成功后清除负缓存
      if (neg[code]) {
        delete neg[code]
        writeNegCache(neg)
      }
      return fresh
    }
    // 拉取成功但无数据 → 写负缓存
    neg[code] = now
    writeNegCache(neg)
    return null
  } catch {
    // 网络失败 → 写负缓存
    neg[code] = now
    writeNegCache(neg)
    return null
  }
}

/** 清除所有昨日净值缓存（正向 + 负向） */
export function clearPrevNavCache() {
  Storage.set(CACHE_KEY, {})
  Storage.set(NEG_CACHE_KEY, {})
}
