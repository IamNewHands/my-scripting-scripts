import { getDB } from "../../../modules/AppDB"
import { renameDatabaseTable } from "../../../modules/DatabaseSchema"
import type { AppVersionTuple } from "../../../types/appStore"

/** 返回本地日期，用于判断缓存是否仍是当天数据。 */
export const getCacheDate = () => new Date().toLocaleDateString("sv-SE")

/** 按更新时间清理超过容量的缓存表记录。 */
export const pruneCacheTable = async (tableName: string, maxRows: number) => {
  const db = await getDB()
  await db.execute(
    `DELETE FROM ${tableName}
     WHERE app_id NOT IN (
       SELECT app_id FROM ${tableName}
       ORDER BY updated_at DESC
       LIMIT ?
     )`,
    [maxRows]
  )
}

type VersionCacheRow = {
  app_id: string
  versions: string
  cache_date: string
  updated_at: number
}

type VersionCacheRepositoryOptions = {
  tableName: string
  legacyTableName?: string
  invalidVersionMessage: string
  includeClear?: boolean
}

/** 创建使用独立数据表的版本缓存仓库。 */
export const createVersionCacheRepository = ({
  tableName,
  legacyTableName,
  invalidVersionMessage,
  includeClear = false,
}: VersionCacheRepositoryOptions) => {
  const maxRows = 100
  let initPromise: Promise<void> | null = null

  const init = async () => {
    if (!initPromise) {
      initPromise = Promise.try(async () => {
        const db = await getDB()
        if (legacyTableName) {
          await renameDatabaseTable(db, legacyTableName, tableName)
        }
        const expectedColumns = ["app_id", "versions", "cache_date", "updated_at"]
        const columns = await db.fetchAll<{ name: string }>(`PRAGMA table_info(${tableName})`)
        if (columns.length && columns.map(({ name }) => name).join(",") !== expectedColumns.join(",")) {
          await db.execute(`DROP TABLE ${tableName}`)
        }
        await db.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (
          app_id TEXT PRIMARY KEY,
          versions TEXT NOT NULL,
          cache_date TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )`)
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName}(updated_at)`)
      })
    }
    return initPromise
  }

  const parseVersions = async (appId: string | number, raw: string | null | undefined) => {
    if (!raw) return [] as AppVersionTuple[]
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) throw new Error(invalidVersionMessage)
      return parsed.map(item => {
        if (!Array.isArray(item) || item.length < 2) throw new Error(invalidVersionMessage)
        return [String(item[0]), String(item[1])] as AppVersionTuple
      })
    } catch {
      const db = await getDB()
      await db.execute(`DELETE FROM ${tableName} WHERE app_id = ?`, [String(appId)])
      return [] as AppVersionTuple[]
    }
  }

  const repository = {
    init,

    async get(appId: string | number) {
      await init()
      const db = await getDB()
      return db.fetchOne<VersionCacheRow>(`SELECT * FROM ${tableName} WHERE app_id = ?`, [String(appId)])
    },

    async read(appId: string | number) {
      const row = await this.get(appId)
      const versions = await parseVersions(appId, row?.versions)
      return {
        cacheDate: row?.cache_date,
        versions,
      }
    },

    async set(appId: string | number, versions: AppVersionTuple[]) {
      await init()
      const normalized = versions.map(([externalVersionId, bundleVersion]) => [
        String(externalVersionId), bundleVersion || "????",
      ] satisfies AppVersionTuple)
      const db = await getDB()
      await db.execute(
        `INSERT OR REPLACE INTO ${tableName} (app_id, versions, cache_date, updated_at)
         VALUES (?, ?, ?, ?)`,
        [String(appId), JSON.stringify(normalized), getCacheDate(), Date.now()]
      )
      await pruneCacheTable(tableName, maxRows)
    },
  }

  if (includeClear) {
    Object.assign(repository, {
      async clear() {
        await init()
        const db = await getDB()
        await db.execute(`DELETE FROM ${tableName}`)
      },
    })
  }

  return repository
}
