import { migrateAppGroupFile } from "../../../utils/paths/appGroupPaths"

const PATH = migrateAppGroupFile("searchHistory.json")

type CacheEntry = [string, number]
type LegacyEntry = string | Entry | CacheEntry

export interface Entry {
  id: string
  query: string
  count: number
}

class LRUCache<K, V> {
  readonly capacity: number
  #cache: Map<K, V>

  constructor(capacity: number, cache?: Iterable<readonly [K, V]>) {
    this.capacity = capacity
    this.#cache = new Map(cache || [])
  }

  has(key: K) {
    return this.#cache.has(key)
  }

  get(key: K) {
    if (!this.#cache.has(key)) return undefined
    const value = this.#cache.get(key)
    this.#cache.delete(key)
    this.#cache.set(key, value as V)
    return value
  }

  put(key: K, value: V) {
    if (this.#cache.has(key)) {
      this.#cache.delete(key)
    } else if (this.#cache.size >= this.capacity) {
      const oldest = this.#cache.keys().next()
      if (!oldest.done) this.#cache.delete(oldest.value)
    }

    this.#cache.set(key, value)
  }

  remove(key: K) {
    this.#cache.delete(key)
  }

  toArray() {
    return [...this.#cache.entries()]
  }
}

class SearchHistoryStore {
  private max: number
  private cache: LRUCache<string, number> | null = null

  constructor(max = 20) {
    this.max = max
  }

  /** 添加一条或多条搜索记录，自动去重、增加次数、最新在前 */
  add(...queries: string[]) {
    const trimmed = queries.map(q => q.trim()).filter(Boolean)
    if (!trimmed.length) return this.getAll()

    const cache = this.getCache()
    trimmed.forEach(query => {
      const count = cache.get(query) ?? 0
      cache.put(query, count + 1)
    })
    this.write(cache)
    return this.toEntries(cache)
  }

  /** 删除指定记录 */
  remove(query: string) {
    const cache = this.getCache()
    cache.remove(query)
    this.write(cache)
    return this.toEntries(cache)
  }

  /** 清空所有记录 */
  clear() {
    const cache = new LRUCache<string, number>(this.max)
    this.write(cache)
    return []
  }

  /** 读取全部记录 */
  getAll(): Entry[] {
    return this.toEntries(this.getCache())
  }

  private getCache() {
    if (!this.cache) this.cache = this.readCache()
    return this.cache
  }

  private toEntries(cache: LRUCache<string, number>): Entry[] {
    return cache.toArray().reverse().map(([query, count]) => ({
      id: query,
      query,
      count,
    }))
  }

  private readCache() {
    try {
      if (!FileManager.existsSync(PATH)) return new LRUCache<string, number>(this.max)
      const raw = FileManager.readAsStringSync(PATH)
      if (!raw) return new LRUCache<string, number>(this.max)
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) return new LRUCache<string, number>(this.max)
      return new LRUCache<string, number>(this.max, this.normalize(data))
    } catch {
      return new LRUCache<string, number>(this.max)
    }
  }

  private normalize(data: LegacyEntry[]): CacheEntry[] {
    const isLRUData = data.every(Array.isArray)
    const entries = isLRUData ? data : [...data].reverse()

    return entries.flatMap(entry => {
      if (typeof entry === "string") return [[entry, 1] as CacheEntry]
      if (Array.isArray(entry)) {
        const [query, count] = entry
        return typeof query === "string" ? [[query.trim(), Number(count) || 1] as CacheEntry] : []
      }
      return [[entry.query.trim(), Number(entry.count) || 1] as CacheEntry]
    }).filter(([query]) => query).slice(-this.max)
  }

  private write(cache: LRUCache<string, number>) {
    this.cache = cache
    try {
      FileManager.writeAsStringSync(PATH, JSON.stringify(cache.toArray()))
    } catch { /* ignore */ }
  }
}

export const searchHistory = new SearchHistoryStore()
