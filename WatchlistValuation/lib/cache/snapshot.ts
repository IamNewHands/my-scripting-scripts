/**
 * 组合快照本地缓存：非交易时段直接读本地，跳过网络拉取。
 *
 * 关键设计：
 * 1. 拉取成功后立即写入 Storage（"今日最后一次"快照）
 * 2. 跨自然日自动失效（防止昨天数据被当成今天的）
 * 3. 同一天内任意时刻读都返回同一份
 */
import type { PortfolioSnapshot } from "../types"

const SNAPSHOT_KEY = "watchlist.snapshot"

/** 本地缓存的快照类型（带元数据） */
export type CachedSnapshot = PortfolioSnapshot & {
  /** 缓存写入的日期 YYYY-MM-DD（用于跨日失效） */
  cachedDate: string
  /** 是否是收盘后保存（=true 时非交易时段可放心用） */
  savedAfterClose: boolean
}

function todayStr(): string {
  const now = new Date()
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`)
}

/** 读快照：跨日返回 null */
export function getCachedSnapshot(): CachedSnapshot | null {
  const raw = Storage.get<CachedSnapshot>(SNAPSHOT_KEY)
  if (!raw || !raw.funds || !raw.stocks) return null
  if (raw.cachedDate !== todayStr()) return null
  return raw
}

/** 写快照 */
export function setCachedSnapshot(
  snap: PortfolioSnapshot,
  savedAfterClose: boolean = true
): void {
  const cache: CachedSnapshot = {
    ...snap,
    cachedDate: todayStr(),
    savedAfterClose,
  }
  Storage.set(SNAPSHOT_KEY, cache)
}

/** 清空快照（用户主动刷新场景可用） */
export function clearCachedSnapshot(): void {
  Storage.remove(SNAPSHOT_KEY)
}
