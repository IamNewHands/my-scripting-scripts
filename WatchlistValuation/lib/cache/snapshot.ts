/**
 * 组合快照本地缓存：非交易时段直接读本地，跳过网络拉取。
 *
 * 关键设计：
 * 1. 拉取成功后立即写入 Storage（"今日最后一次"快照）
 * 2. 跨自然日自动失效（防止昨天数据被当成今天的）
 * 3. 同一天内任意时刻读都返回同一份
 * 4. 手动调整成本/持仓后，fundsHash/stocksHash 会变化，
 *    下次加载时检测到不匹配则自动重算（用缓存价格 + 最新用户数据）
 */
import type { FundItem, PortfolioSnapshot, StockItem } from "../types"

const SNAPSHOT_KEY = "watchlist.snapshot"

/** 本地缓存的快照类型（带元数据） */
export type CachedSnapshot = PortfolioSnapshot & {
  /** 缓存写入的日期 YYYY-MM-DD（用于跨日失效） */
  cachedDate: string
  /** 是否是收盘后保存（=true 时非交易时段可放心用） */
  savedAfterClose: boolean
  /** 缓存时基金项的代码+成本金额拼接，用于检测手工调整 */
  fundsHash: string
  /** 缓存时股票项的 secid+成本金额拼接，用于检测手工调整 */
  stocksHash: string
}

function todayStr(): string {
  const now = new Date()
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`)
}

/** 计算基金项哈希：代码+成本金额+买入净值+份额，检测变动 */
export function computeFundsHash(items: FundItem[]): string {
  return items
    .map((f) => `${f.code}:${f.costAmount}:${f.buyNav}:${f.shares ?? 0}`)
    .join("|")
}

/** 计算股票项哈希：secid+成本金额+买入价+股数，检测变动 */
export function computeStocksHash(items: StockItem[]): string {
  return items
    .map((s) => `${s.secid}:${s.costAmount}:${s.buyPrice}:${s.quantity ?? 0}`)
    .join("|")
}

/** 读快照：跨日返回 null */
export function getCachedSnapshot(): CachedSnapshot | null {
  const raw = Storage.get<CachedSnapshot>(SNAPSHOT_KEY)
  if (!raw || !raw.funds || !raw.stocks) return null
  if (raw.cachedDate !== todayStr()) return null
  return raw
}

/** 写快照（同时保存用户数据哈希，用于检测手工调整） */
export function setCachedSnapshot(
  snap: PortfolioSnapshot,
  savedAfterClose: boolean = true,
  funds?: FundItem[],
  stocks?: StockItem[]
): void {
  const cache: CachedSnapshot = {
    ...snap,
    cachedDate: todayStr(),
    savedAfterClose,
    fundsHash: funds ? computeFundsHash(funds) : "",
    stocksHash: stocks ? computeStocksHash(stocks) : "",
  }
  Storage.set(SNAPSHOT_KEY, cache)
}

/** 清空快照（用户主动刷新场景可用） */
export function clearCachedSnapshot(): void {
  Storage.remove(SNAPSHOT_KEY)
}
