import { AppDatabaseFiles, AppResources } from "../constants/AppResources"
import { migrateAppGroupFile } from "../utils/paths/appGroupPaths"

const DB_PATH = migrateAppGroupFile(AppDatabaseFiles.icons)
const TABLE_NAME = AppResources.appIconAssets

let initPromise: Promise<SQLite.Database> | null = null

export type AppIconAssetRecord = {
  icon_url: string
  image: Data | null
  dominant_color: string | null
  updated_at: number
}

export const getAppIconAssetDB = (): Promise<SQLite.Database> => {
  if (!initPromise) {
    initPromise = Promise.try(async () => {
      const db = SQLite.open(DB_PATH, {
        foreignKeysEnabled: false,
        readonly: false,
        label: null,
        busyMode: "immediateError",
        journalMode: "default",
        maximumReaderCount: 3,
      })
      await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        icon_url TEXT PRIMARY KEY,
        image BLOB,
        dominant_color TEXT,
        updated_at INTEGER NOT NULL
      )`)

      return db
    })
  }
  return initPromise
}

export const getAppIconAsset = async (iconUrl: string): Promise<AppIconAssetRecord | null> => {
  const db = await getAppIconAssetDB()
  return db.fetchOne<AppIconAssetRecord>(
    `SELECT icon_url, image, dominant_color, updated_at FROM ${TABLE_NAME} WHERE icon_url = ?`,
    [iconUrl]
  )
}

export const putAppIconAsset = async ({
  iconUrl,
  image,
  dominantColor,
  dominantColors,
}: {
  iconUrl: string
  image: Data | null
  dominantColor?: RGBAColor | null
  dominantColors?: RGBAColor[] | null
}) => {
  const db = await getAppIconAssetDB()
  await db.execute(
    `INSERT OR IGNORE INTO ${TABLE_NAME}
      (icon_url, image, dominant_color, updated_at)
      VALUES (?, ?, ?, ?)`,
    [
      iconUrl,
      image,
      dominantColors ? JSON.stringify(dominantColors) : (dominantColor ? JSON.stringify(dominantColor) : null),
      Date.now(),
    ]
  )
}

/** 只为已有图标补充主色，不重复写入图片二进制。 */
export const updateAppIconAssetDominantColors = async (
  iconUrl: string,
  dominantColors: RGBAColor[],
) => {
  if (!dominantColors.length) return
  const db = await getAppIconAssetDB()
  await db.execute(
    `UPDATE ${TABLE_NAME}
      SET dominant_color = ?
      WHERE icon_url = ?
        AND (dominant_color IS NULL OR dominant_color = '')`,
    [JSON.stringify(dominantColors), iconUrl]
  )
}
