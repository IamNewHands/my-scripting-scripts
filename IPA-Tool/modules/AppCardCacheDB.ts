import { AppResources } from "../constants/AppResources"
import type { AppSearchSuccess } from "../types/appStore"
import { getDB } from "./AppDB"
import { renameDatabaseTable } from "./DatabaseSchema"

const TABLE_NAME = AppResources.appCardCache
const LEGACY_TABLE_NAME = "db_app_card_cache"

let initPromise: Promise<void> | null = null

type AppCardCacheRow = {
  app_id: string
  country: string
  data: string
}

type AppCardCacheIdRow = {
  app_id: string
}

const normalizeCountry = (country: string) => country.trim().toUpperCase()

/** 初始化 App 卡片缓存表。 */
const initialize = () => {
  if (!initPromise) {
    initPromise = Promise.try(async () => {
      const db = await getDB()
      await renameDatabaseTable(db, LEGACY_TABLE_NAME, TABLE_NAME)
      await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        app_id TEXT NOT NULL,
        country TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (app_id, country)
      )`)
    })
  }
  return initPromise
}

/** 按 App ID 和国家单条读取卡片数据，损坏记录会被自动删除。 */
export const getAppCardCache = async (
  appId: string,
  country: string,
): Promise<AppSearchSuccess | null> => {
  await initialize()
  const db = await getDB()
  const normalizedCountry = normalizeCountry(country)
  const row = await db.fetchOne<AppCardCacheRow>(
    `SELECT app_id, country, data FROM ${TABLE_NAME}
      WHERE app_id = ? AND country = ?`,
    [appId, normalizedCountry],
  )
  if (!row?.data) return null

  try {
    const data = JSON.parse(row.data) as AppSearchSuccess
    if (!data || String(data.id) !== appId) throw new Error("无效的 App 卡片缓存")
    return data
  } catch {
    await db.execute(
      `DELETE FROM ${TABLE_NAME} WHERE app_id = ? AND country = ?`,
      [appId, normalizedCountry],
    )
    return null
  }
}

/** 按当前国家的本地化卡片名称查询 App ID。 */
export const findAppCardCacheIdsByName = async (
  keyword: string,
  country: string,
): Promise<string[]> => {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase()
  if (!normalizedKeyword || !country.trim()) return []

  await initialize()
  const db = await getDB()
  const rows = await db.fetchAll<AppCardCacheIdRow>(
    `SELECT app_id FROM ${TABLE_NAME}
      WHERE country = ?
        AND json_valid(data)
        AND instr(lower(json_extract(data, '$.name')), ?) > 0`,
    [normalizeCountry(country), normalizedKeyword],
  )
  return rows.map(row => String(row.app_id))
}

/** 写入尚未缓存的 App 卡片，同一 App ID 和国家不重复覆盖。 */
export const putAppCardCache = async (
  data: AppSearchSuccess,
  country: string,
) => {
  await initialize()
  const db = await getDB()
  const appId = String(data.id)
  const normalizedCountry = normalizeCountry(country)
  await db.execute(
    `INSERT OR IGNORE INTO ${TABLE_NAME} (app_id, country, data, updated_at)
      VALUES (?, ?, ?, ?)`,
    [appId, normalizedCountry, JSON.stringify(data), Date.now()],
  )
}
