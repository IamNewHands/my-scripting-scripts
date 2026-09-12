import { AbortController } from "scripting"
import { getAuthStateSnapshot } from "../../hooks/useAuth"
import { PLATFORM, type Store } from "../../constants/Platform"
import { debounce } from "../tool"
import { formatLookupApp, StoreService } from "../appleStore"
import { getAppCardCache, putAppCardCache } from "../../modules/AppCardCacheDB"

import type { AppInfo, AppSearchSuccess } from "../../types/appStore"

interface ApiGetAppInfoOptions {
  signal?: AbortController["signal"]
}

type VersionId = string | number | undefined

const appInfoCache: Record<string, import("../../types/appStore").AppInfo> = {}
const platformAppCache: Record<string, AppSearchSuccess | null> = {}

/** 将底层 AppInfo 转换为卡片展示数据。 */
const formatAppInfoCard = (appInfo: AppInfo): AppSearchSuccess => ({
  id: String(appInfo.appId),
  name: appInfo.name,
  description: appInfo.bundleId,
  icon: appInfo.icon,
  category: appInfo.bundleId,
  version: appInfo.displayVersion,
  size: appInfo.fileSize,
  price: "Free",
  averageUserRating: 0,
  userRatingCount: 0,
  minimumOsVersion: appInfo.minimumOsVersion,
  currency: appInfo.currency,
  externalVersionId: appInfo.externalVersionId,
})

/** 通过 App ID、平台和国家获取平台卡片数据，并缓存成功结果或 null。 */
export const apiGetPlatformApp = async ({
  appId,
  store,
  signal,
}: {
  appId: string
  store: Store
  signal?: AbortController["signal"]
}): Promise<AppSearchSuccess | null> => {
  const cacheKey = `${appId}_${store.platform}_${store.country}`
  if (Object.hasOwn(platformAppCache, cacheKey)) return platformAppCache[cacheKey]

  const data = await StoreService.getPlatformApp({ appId, store, signal })
  platformAppCache[cacheKey] = data
  return data
}

/** 按 App ID 读取卡片缓存；Lookup 原始 results 为空时使用 AppInfo 兜底。 */
export const apiGetLookupApp = async (
  appId: string,
  country: string,
  signal?: AbortController["signal"],
): Promise<AppSearchSuccess> => {
  const cached = await getAppCardCache(appId, country)
  if (cached) return cached

  const results = await StoreService.lookupApp(appId, country, signal)
  const data = results.length
    ? formatLookupApp(results[0], appId)
    : formatAppInfoCard(await StoreService.getAppInfo({
      salableAdamId: appId,
      externalVersionId: undefined,
      options: { signal },
    }))
  await putAppCardCache(data, country)
  return data
}

/** 通过 App ID 和版本 ID 获取官方 AppInfo，并缓存成功结果。 */
const appCacheInfo = async (
  id: string,
  versionId: VersionId,
  options?: ApiGetAppInfoOptions,
) => {
  if (!getAuthStateSnapshot().isLoggedIn) {
    throw new Error("❌请先登录，官方接口需要登录；未登录时仅支持查询第三方信息")
  }

  const cacheKey = `${id}_${versionId}`
  const cached = appInfoCache[cacheKey]

  if (cached) return cached

  const data = await StoreService.getAppInfo({
    salableAdamId: Number(id),
    externalVersionId: versionId,
    options,
  })

  appInfoCache[cacheKey] = data
  return data
}

/** 安静地从平台接口获取最新版本 ID。 */
const getPlatformVersionIdSafely = async (
  appId: string,
  store: Store,
  signal?: AbortController["signal"],
): Promise<VersionId> => {
  try {
    const data = await apiGetPlatformApp({ appId, store, signal })
    const versionId = data?.externalVersionId
    return versionId
  } catch (error) {
    // 竞速胜出后必须继续传播取消，不能把取消当成平台接口失败。
    if (signal?.aborted) throw error
    return undefined
  }
}

/** 校验指定版本 ID 的实际平台是否与当前目标平台一致。 */
const validateVersionIdPlatform = async (
  appId: string,
  versionId: VersionId,
  targetPlatform: Store["platform"],
  options?: ApiGetAppInfoOptions,
) => {
  // 官方接口错误直接向外传播，保留无效版本 ID 的原始错误。
  const data = await appCacheInfo(appId, versionId, options)
  const isIosVersion = data.softwarePlatform === "ios"
  const expectsIosVersion = targetPlatform === PLATFORM.IOS

  // 指定版本的平台与当前目标平台一致。
  if (isIosVersion === expectsIosVersion) return

  // 官方返回的平台与当前搜索平台不一致。
  throw new Error(`❌指定版本 ID ${versionId} 不属于当前 ${expectsIosVersion ? "iOS" : "tvOS"} 平台`)
}

/** 获取最终交给官方 AppInfo 请求使用的版本 ID。 */
const guardVersionId = async (
  appId: string,
  versionId: VersionId,
  store: Store,
  options?: ApiGetAppInfoOptions,
): Promise<VersionId> => {
  const isIos = store.platform === PLATFORM.IOS

  // 指定版本必须先确认实际平台与当前目标平台一致。
  if (versionId) {
    await validateVersionIdPlatform(appId, versionId, store.platform, options)
    return versionId
  }

  // iOS 没有版本 ID 时直接请求官方接口，以支持下架应用。
  if (isIos) return

  // tvOS 没有版本 ID 时，通过平台接口获取当前平台的版本 ID。
  const platformVersionId = await getPlatformVersionIdSafely(
    appId,
    store,
    options?.signal,
  )

  // 平台接口获取到版本 ID，说明当前平台存在可用版本。
  if (platformVersionId) return platformVersionId

  // tvOS 没有有效版本 ID 时无法继续请求官方接口。
  throw new Error(
    `❌未能获取 App ID ${appId} 的 tvOS 版本信息，如果是下架 App 请指定版本 ID 搜索`,
  )
}

/** 立即获取指定 App 的下载信息。 */
const fetchAppInfo = async (
  id: string,
  appVerId: VersionId,
  options: ApiGetAppInfoOptions | undefined,
  store: Store,
) => {
  const versionId = await guardVersionId(id, appVerId, store, options)
  const appInfo = await appCacheInfo(id, versionId, options)
  return { appId: id, appInfo }
}

export const apiGetAppInfo = debounce(fetchAppInfo, 300)
