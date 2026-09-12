/**
 * AppDB - sinf 二进制存储
 * SQLite 数据库，存 app_id / name / version / sinf BLOB
 * 主键 = name_version
 */

import { Path } from "scripting"
import { migrateAppGroupFile } from "../utils/paths/appGroupPaths"
import { AppDatabaseFiles, AppResources } from "../constants/AppResources"
import { databaseTableExists, renameDatabaseTable } from "./DatabaseSchema"

const DB_PATH = migrateAppGroupFile(AppDatabaseFiles.apps)
const TABLE_NAME = AppResources.appDatabase
const LEGACY_TABLE_NAME = "db_apps"
const LEGACY_ICON_TABLE_NAME = "db_app_icon_assets"

let _dbPromise: Promise<SQLite.Database> | null = null

type SinfInput = Record<string, number> | string | Uint8Array | Data

const toSinfData = (sinf?: SinfInput): Data | null => {
  if (!sinf) return null
  if (sinf instanceof Data) return sinf
  if (typeof sinf === "string") return Data.fromBase64String(sinf.replace(/\s/g, ""))

  const values = sinf instanceof Uint8Array ? Array.from(sinf) : Object.values(sinf).map(Number)
  const bytes = values.filter(value => Number.isInteger(value) && value >= 0 && value <= 255)
  return bytes.length === values.length && bytes.length ? Data.fromIntArray(bytes) : null
}

export const getDB = (): Promise<SQLite.Database> => {
  if (!_dbPromise) {
    _dbPromise = Promise.try(async () => {
      const db = SQLite.open(DB_PATH, {
        foreignKeysEnabled: false,
        readonly: false,
        label: null,
        busyMode: "immediateError",
        journalMode: "default",
        maximumReaderCount: 3,
      })
      await renameDatabaseTable(db, LEGACY_TABLE_NAME, TABLE_NAME)
      const hasLegacyIconTable = await databaseTableExists(db, LEGACY_ICON_TABLE_NAME)
      if (hasLegacyIconTable) {
        await db.execute(`DROP TABLE ${LEGACY_ICON_TABLE_NAME}`)
        await db.execute("VACUUM")
      }
      await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id TEXT PRIMARY KEY,
        app_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        bundle_id TEXT,
        sinf BLOB,
        metadata TEXT,
        icon TEXT
      )`)
      return db
    })
  }
  return _dbPromise
}

/** 写入 / 更新应用信息（sinf 转二进制存储，下载完成后才传） */
export const add = async (
  id: string,
  name: string,
  version: string,
  bundleId: string,
  sinf?: SinfInput,
  appId?: string,
  metadata?: string,
  icon?: string
): Promise<boolean> => {
  const db = await getDB()
  const sinfData = toSinfData(sinf)
  const exists = await db.fetchOne(`SELECT id FROM ${TABLE_NAME} WHERE id = ?`, [id])
  if (exists) {
    if (sinfData) {
      await db.execute(
        `UPDATE ${TABLE_NAME} SET sinf = ?, app_id = ?, metadata = ?, name = ?, version = ?, bundle_id = ?, icon = ? WHERE id = ?`,
        [sinfData, Number(appId ?? 0), metadata ?? "", name, version, bundleId, icon ?? null, id]
      )
      return true
    }
    return false
  }
  await db.execute(
    `INSERT INTO ${TABLE_NAME} (id, app_id, name, version, bundle_id, sinf, metadata, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, Number(appId ?? 0), name, version, bundleId, sinfData, metadata ?? "", icon ?? null]
  )
  return true
}

/** 写入元数据（扫描用，不动 sinf） */
export const putMeta = async (
  id: string,
  name: string,
  version: string,
  bundleId: string,
  icon?: string | null
) => {
  const db = await getDB()
  const exists = await db.fetchOne(`SELECT id FROM ${TABLE_NAME} WHERE id = ?`, [id])
  if (exists) {
    await db.execute(
      `UPDATE ${TABLE_NAME} SET name = ?, version = ?, bundle_id = ?, icon = ? WHERE id = ?`,
      [name, version, bundleId, icon ?? null, id]
    )
  } else {
    await db.execute(
      `INSERT INTO ${TABLE_NAME} (id, app_id, name, version, bundle_id, metadata, icon) VALUES (?, 0, ?, ?, ?, ?, ?)`,
      [id, name, version, bundleId, "", icon ?? null]
    )
  }
}

/** 读取 metadata（iTunesMetadata.plist XML） */
export const getMetadata = async (id: string): Promise<string | null> => {
  const db = await getDB()
  const row = await db.fetchOne<{ metadata: string }>(`SELECT metadata FROM ${TABLE_NAME} WHERE id = ?`, [id])
  return row?.metadata ?? null
}

/** 读取 sinf，返回 Data；兼容旧 JSON 字符串格式 */
export const getSinf = async (id: string): Promise<Data | null> => {
  const db = await getDB()
  const row = await db.fetchOne<{ sinf: Data | string | null }>(`SELECT sinf FROM ${TABLE_NAME} WHERE id = ?`, [id])
  if (!row?.sinf) return null
  if (typeof row.sinf !== "string") return row.sinf
  const parsed = JSON.parse(row.sinf) as Record<string, number>
  return Data.fromIntArray(Object.values(parsed))
}

/** 查询单个应用元数据 */
export const getApp = async (id: string): Promise<{
  name: string
  version: string
  bundle_id: string | null
  icon: string | null
} | null> => {
  const db = await getDB()
  return db.fetchOne(`SELECT name, version, bundle_id, icon FROM ${TABLE_NAME} WHERE id = ?`, [id])
}


/** 批量查询多个应用元数据，返回 id -> 元数据 的映射 */
export const getAllAppsByIds = async (ids: string[]) => {
  if (ids.length === 0) return {} as Record<string, { name: string; version: string; bundle_id: string | null; icon: string | null }>
  const db = await getDB()
  const placeholders = ids.map(() => "?").join(",")
  const rows = await db.fetchAll(
    `SELECT id, name, version, bundle_id, icon FROM ${TABLE_NAME} WHERE id IN (${placeholders})`,
    ids
  ) as { id: string; name: string; version: string; bundle_id: string | null; icon: string | null }[]
  const result: Record<string, { name: string; version: string; bundle_id: string | null; icon: string | null }> = {}
  for (const row of rows) {
    result[row.id] = { name: row.name, version: row.version, bundle_id: row.bundle_id, icon: row.icon }
  }
  return result
}

/** 删除一行 */
export const remove = async (id: string) => {
  const db = await getDB()
  await db.execute(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id])
}

/** 清理与 .ipa 文件不匹配的孤儿行，当前下载任务对应行不删 */
export const cleanupOrphanRows = async (folder: string, protectedIds: string[] = []) => {
  const db = await getDB()
  const protectedSet = new Set(protectedIds)
  const rows = await db.fetchAll<{ id: string; name: string; version: string }>(
    `SELECT id, name, version FROM ${TABLE_NAME}`
  )
  const dir = Path.join(FileManager.documentsDirectory, folder)
  for (const row of rows) {
    if (protectedSet.has(row.id)) continue
    const ipaPath = Path.join(dir, `${row.name}_${row.version}.ipa`)
    if (!FileManager.existsSync(ipaPath)) {
      await db.execute(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [row.id])
    }
  }
}
