import {
  AppResources,
  DatabaseResourceOwners,
  ResettableResources,
} from "../constants/AppResources"
import type {
  AppDatabaseName,
  RegisteredResourceKey,
  RegisteredDatabaseResourceKey,
  KeychainResourceKey,
} from "../constants/AppResources"
import { getDB } from "../modules/AppDB"
import { getAppIconAssetDB } from "../modules/AppIconAssetDB"
import { databaseTableExists } from "../modules/DatabaseSchema"

const getResourceDatabase = (databaseName: AppDatabaseName) => {
  switch (databaseName) {
    case "apps":
      return getDB()
    case "icons":
      return getAppIconAssetDB()
  }
}

const clearDatabaseResource = async (key: RegisteredDatabaseResourceKey) => {
  const databaseName = DatabaseResourceOwners[key]
  const db = await getResourceDatabase(databaseName)
  if (!await databaseTableExists(db, key)) return

  await db.execute(`DELETE FROM ${key}`)
}

const isDatabaseResource = (
  key: RegisteredResourceKey,
): key is RegisteredDatabaseResourceKey => Object.hasOwn(DatabaseResourceOwners, key)

const clearResource = async (key: RegisteredResourceKey) => {
  if (isDatabaseResource(key)) {
    await clearDatabaseResource(key)
    return
  }

  const prefix = key.split("_")[0]

  switch (prefix) {
    case "storage":
      Storage.remove(key)
      return
    case "keychain":
      Keychain.remove(key as KeychainResourceKey)
      return
    default:
      // 利用 never 类型进行前瞻性兜底：未来如有新资源前缀却忘写 case，此处会告警
      const _exhaustiveCheck: never = prefix as never
      throw new Error(`不支持的本地资源类型: ${_exhaustiveCheck}`)
  }
}

/** 按资源 key 前缀清理全部登记的可重置本地资源。 */
export const clearResettableResources = async () => {
  // 保持极简的遍历即可，因为底层 API 均有良好的静默容错机制
  for (const name of ResettableResources) {
    await clearResource(AppResources[name])
  }
}
