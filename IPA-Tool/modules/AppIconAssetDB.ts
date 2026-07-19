import { ipaToolAppGroupPath } from "../utils/paths/appGroupPaths"
import type { RGBAColor } from "../types/utils"

const DB_PATH = ipaToolAppGroupPath("app_icon_assets.db")

const MAX_APP_ICON_ASSET_COUNT = 100

let _dbPromise: Promise<SQLite.Database> | null = null

export type AppIconAssetRecord = {
  icon_url: string
  image: Data | null
  dominant_color: string | null
  updated_at: number
}

export const getAppIconAssetDB = (): Promise<SQLite.Database> => {
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

      await db.execute(`CREATE TABLE IF NOT EXISTS app_icon_assets (
        icon_url TEXT PRIMARY KEY,
        image BLOB,
        dominant_color TEXT,
        updated_at INTEGER NOT NULL
      )`)

      return db
    })
  }
  return _dbPromise
}

export const getAppIconAsset = async (iconUrl: string): Promise<AppIconAssetRecord | null> => {
  const db = await getAppIconAssetDB()
  return db.fetchOne<AppIconAssetRecord>(
    "SELECT icon_url, image, dominant_color, updated_at FROM app_icon_assets WHERE icon_url = ?",
    [iconUrl]
  )
}

export const putAppIconAsset = async ({
  iconUrl,
  image,
  dominantColor,
}: {
  iconUrl: string
  image: Data | null
  dominantColor?: RGBAColor | null
}) => {
  const db = await getAppIconAssetDB()
  await db.execute(
    `INSERT OR REPLACE INTO app_icon_assets
      (icon_url, image, dominant_color, updated_at)
      VALUES (?, ?, ?, ?)`,
    [
      iconUrl,
      image,
      dominantColor ? JSON.stringify(dominantColor) : null,
      Date.now(),
    ]
  )

  await db.execute(
    `DELETE FROM app_icon_assets
      WHERE icon_url NOT IN (
        SELECT icon_url
        FROM app_icon_assets
        ORDER BY updated_at DESC
        LIMIT ?
      )`,
    [MAX_APP_ICON_ASSET_COUNT]
  )
}
