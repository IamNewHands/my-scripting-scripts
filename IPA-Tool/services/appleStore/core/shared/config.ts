import { AppConfig } from "../../../../constants/AppConfig"

export const appleStoreConfig = {
  maxAppCache: 50,
  keys: AppConfig.storageKeys,
} as const

export const today = () => new Date().toLocaleDateString("sv-SE")
