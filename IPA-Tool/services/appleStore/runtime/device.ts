import { AppResources } from "../../../constants/AppResources"

/** 读取或生成 Apple 请求共用的持久化设备标识。 */
export const getMac = () => {
  const key = AppResources.appleStoreMac
  const cached = Storage.get<string>(key)
  if (cached) return cached

  const mac = Array.from(
    { length: 6 },
    () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("").toUpperCase()
  Storage.set(key, mac)
  return mac
}
