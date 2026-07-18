import { $cache } from "../../runtime"
import { appleStoreConfig } from "./config"

export const getMac = () => {
  const key = appleStoreConfig.keys.appleStoreMac
  const cached = $cache.get(key)
  if (cached) return cached
  const mac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("").toUpperCase()
  $cache.set(key, mac)
  return mac
}
