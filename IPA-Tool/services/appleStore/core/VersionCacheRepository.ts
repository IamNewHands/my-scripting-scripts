import { getDB } from "../../../modules/AppDB"
import { $cache } from "../runtime"
import { appleStoreConfig, today } from "./shared"

export type VersionTuple = [string | number, string, string?]

type VersionCacheItem = {
  externalVersionId: string
  bundleVersion: string
  fetchedDate: string
  source: string
}

type VersionCacheRow = {
  app_id: string
  versions: string
  cache_date: string
  updated_at: number
  source: string
}

type LegacyVersionCache = Array<[string | number, VersionTuple[]]>

const keys = appleStoreConfig.keys
const sqlMigratedKey = "AppVersionsMigratedToSQL"
const maxAppCache = 100
let initPromise: Promise<void> | null = null

const toItems = (versions: VersionTuple[], source: string): VersionCacheItem[] => versions.map(([externalVersionId, bundleVersion, fetchedDate]) => ({
  externalVersionId: String(externalVersionId),
  bundleVersion: bundleVersion || "????",
  fetchedDate: fetchedDate || today(),
  source,
}))

const toTuple = ({ externalVersionId, bundleVersion, fetchedDate }: VersionCacheItem): VersionTuple => [
  externalVersionId,
  bundleVersion,
  fetchedDate,
]

const parseVersions = (raw: string | null | undefined): VersionCacheItem[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as VersionCacheItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const prune = async () => {
  const db = await getDB()
  await db.execute(
    `DELETE FROM app_version_cache
     WHERE app_id NOT IN (
       SELECT app_id FROM app_version_cache
       ORDER BY updated_at DESC
       LIMIT ?
     )`,
    [maxAppCache]
  )
}

const init = async () => {
  if (!initPromise) {
    initPromise = Promise.try(async () => {
      const db = await getDB()
      await db.execute(`CREATE TABLE IF NOT EXISTS app_version_cache (
        app_id TEXT PRIMARY KEY,
        versions TEXT NOT NULL,
        cache_date TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        source TEXT NOT NULL
      )`)
      await db.execute("CREATE INDEX IF NOT EXISTS idx_app_version_cache_updated_at ON app_version_cache(updated_at)")
      await migrateLegacyIfNeeded()
    })
  }
  return initPromise
}

const migrateLegacyIfNeeded = async () => {
  if ($cache.get(sqlMigratedKey)) return

  const rawDB = $cache.get(keys.appleStoreVersionsDB)
  const rawLegacy = $cache.get(keys.appleStoreVersionsLegacy)
  const db = await getDB()

  if (rawDB) {
    try {
      const storageDB = JSON.parse(rawDB) as Record<string, { versions?: VersionCacheItem[]; source?: string; cacheDate?: string; updatedAt?: number }>
      for (const [appId, record] of Object.entries(storageDB)) {
        const versions = Array.isArray(record.versions) ? record.versions : []
        await db.execute(
          `INSERT OR REPLACE INTO app_version_cache (app_id, versions, cache_date, updated_at, source)
           VALUES (?, ?, ?, ?, ?)`,
          [appId, JSON.stringify(versions), record.cacheDate || versions[0]?.fetchedDate || today(), record.updatedAt || Date.now(), record.source || "storage-db"]
        )
      }
    } catch {
    }
  }

  if (rawLegacy) {
    try {
      const legacy = JSON.parse(rawLegacy) as LegacyVersionCache
      for (const [appId, versions] of legacy) {
        if (!Array.isArray(versions)) continue
        const items = toItems(versions, "legacy-cache")
        await db.execute(
          `INSERT OR REPLACE INTO app_version_cache (app_id, versions, cache_date, updated_at, source)
           VALUES (?, ?, ?, ?, ?)`,
          [String(appId), JSON.stringify(items), items[0]?.fetchedDate || today(), Date.now(), "legacy-cache"]
        )
      }
    } catch {
    }
  }

  await prune()
  $cache.set(sqlMigratedKey, "1")
}

export const VersionCacheRepository = {
  init,

  async get(appId: string | number) {
    await init()
    const db = await getDB()
    return db.fetchOne<VersionCacheRow>("SELECT * FROM app_version_cache WHERE app_id = ?", [String(appId)])
  },

  async isFresh(appId: string | number) {
    return (await this.get(appId))?.cache_date === today()
  },

  async getVersionList(appId: string | number) {
    const row = await this.get(appId)
    return parseVersions(row?.versions).map(toTuple)
  },

  async set(appId: string | number, versions: VersionTuple[], source: string) {
    await init()
    const items = toItems(versions, source)
    const db = await getDB()
    await db.execute(
      `INSERT OR REPLACE INTO app_version_cache (app_id, versions, cache_date, updated_at, source)
       VALUES (?, ?, ?, ?, ?)`,
      [String(appId), JSON.stringify(items), items[0]?.fetchedDate || today(), Date.now(), source]
    )
    await prune()
  },

  async clear() {
    await init()
    const db = await getDB()
    await db.execute("DELETE FROM app_version_cache")
    $cache.remove(keys.appleStoreVersionsLegacy)
    $cache.remove(keys.appleStoreVersionsDB)
    $cache.remove(sqlMigratedKey)
  },
}
