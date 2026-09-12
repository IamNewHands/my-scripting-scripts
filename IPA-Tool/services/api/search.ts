import { AbortController } from "scripting"
import type { AppSearchSuccess, ITunesSearchResultItem, SearchAppParams } from "../../types/appStore"
import { debounce, currencyCodeToSymbol, raceWithAbort } from "../tool"
import { PLATFORM, type Store } from "../../constants/Platform"
import { getAppCardCache, putAppCardCache } from "../../modules/AppCardCacheDB"
import { StoreService } from "../appleStore"
import { formatAppIconUrl } from "../appleStore/runtime/artwork"
import { apiGetAppInfo, apiGetPlatformApp } from "./appInfo"

export type SearchQuery =
  | { type: "keyword"; term: string }
  | { type: "appId"; appId: string }
  | { type: "appId + versionId"; appId: string; versionId: string }

export const searchAbort = { current: () => {} }

type LocalAppInfo = Awaited<ReturnType<typeof apiGetAppInfo>>["appInfo"]
type SearchOptions = {
  store: Store
  country: string
  entity: SearchAppParams["entity"]
  limit: number
}

/** 后台逐条保存当前 iOS 卡片结果，不阻塞搜索结果展示。 */
const cacheSearchResults = (results: AppSearchSuccess[], store: Store) => {
  if (store.platform !== PLATFORM.IOS) return results

  Promise.try(async () => {
    for (const result of results) {
      await putAppCardCache(result, store.country)
    }
  }).catch(() => {})

  return results
}

/** 普通 iOS App ID 搜索优先读取卡片缓存。 */
const getCachedAppIdResult = async (query: SearchQuery, store: Store) => {
  if (query.type !== "appId" || store.platform !== PLATFORM.IOS) return null
  return getAppCardCache(query.appId, store.country).catch(() => null)
}

/** 返回 iTunes 结果中可用的最大尺寸图标。 */
const getITunesArtwork = (app: ITunesSearchResultItem) => {
  const artwork = app.artworkUrl512 ?? app.artworkUrl100 ?? app.artworkUrl60
  return formatAppIconUrl(artwork)
}

/** 将 iTunes 协议结果映射为公开搜索结果。 */
const mapITunesSearchResult = (app: ITunesSearchResultItem): AppSearchSuccess => ({
  id: String(app.trackId),
  name: app.trackName ?? app.trackCensoredName ?? "",
  icon: getITunesArtwork(app),
  category: app.genres?.join(" • ") ?? app.primaryGenreName ?? "",
  version: app.version,
  size: Number(app.fileSizeBytes) || 0,
  currency: app.currency,
  price: app.formattedPrice ?? (app.price > 0
    ? `${currencyCodeToSymbol(app.currency)}${app.price.toFixed(2)}`
    : "Free"),
  averageUserRating: Number((app.averageUserRating ?? 0).toFixed(1)),
  userRatingCount: app.userRatingCount ?? 0,
  minimumOsVersion: app.minimumOsVersion ?? "",
  description: app.description ?? "",
})

/** 创建业务可识别并静默处理的主动取消错误。 */
const createAbortError = () => {
  const error = new Error("请求已取消")
  error.name = "AbortError"
  return error
}

/** 确保 App ID 搜索来源返回非空结果。 */
const ensureAppIdResults = async (sourceName: string, promise: Promise<AppSearchSuccess[]>) => {
  const results = await promise
  if (!results.length) throw new Error(`${sourceName} 未找到应用`)
  return results
}

/** 汇总 App ID 双来源全部失败后的错误信息。 */
const getAppIdSearchErrorMessage = (error: unknown) => {
  if (error instanceof AggregateError) {
    return error.errors
      .map((item: unknown) => item instanceof Error ? item.message : String(item))
      .filter(Boolean)
      .join("; ") || "请检查搜索内容是否正确"
  }
  if (error instanceof Error) return error.message
  return "请检查搜索内容是否正确"
}

/** 将官方下载信息映射为 App ID 搜索结果。 */
const mapLocalAppInfo = (appInfo: LocalAppInfo): AppSearchSuccess => ({
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

/** 执行关键字搜索。 */
const searchKeyword = async (
  query: Extract<SearchQuery, { type: "keyword" }>,
  options: SearchOptions,
  signal: AbortController["signal"],
) => {
  const results = await StoreService.searchApps({
    term: query.term,
    country: options.country,
    entity: options.entity,
    limit: options.limit,
  }, signal)
  return results.map(mapITunesSearchResult)
}

/** 执行 App ID 的官方下载信息搜索。 */
const searchAppInfo = async (
  appId: string,
  versionId: string | undefined,
  store: Store,
  signal: AbortController["signal"],
) => {
  const { appInfo } = await apiGetAppInfo(appId, versionId, { signal }, store)
  if (signal.aborted) throw createAbortError()
  return [mapLocalAppInfo(appInfo)]
}

/** 将平台完整数据直接转换为搜索结果。 */
const searchPlatformApp = async (
  appId: string,
  store: Store,
  signal: AbortController["signal"],
) => {
  const data = await apiGetPlatformApp({ appId, store, signal })
  if (signal.aborted) throw createAbortError()
  return data ? [data] : []
}

/** 按关键字、App ID 或 App ID 加版本 ID 执行搜索。 */
export const apiSearch = debounce(
  async (query: SearchQuery, options: SearchOptions) => {
    const officialController = new AbortController()
    const platformController = new AbortController()
    searchAbort.current = () => {
      officialController.abort()
      platformController.abort()
    }

    try {
      const cached = await getCachedAppIdResult(query, options.store)
      if (cached) return [cached]

      switch (query.type) {
        case "keyword":
          // 关键字搜索只请求搜索接口。
          return cacheSearchResults(
            await searchKeyword(query, options, officialController.signal),
            options.store,
          )

        case "appId + versionId":
          // App ID 加版本 ID 搜索直接请求 AppInfo，内部经过版本 ID 守卫。
          return await ensureAppIdResults(
            "官方下载接口",
            searchAppInfo(query.appId, query.versionId, options.store, officialController.signal),
          )

        case "appId":
          // App ID 搜索由平台数据和 AppInfo 竞速；tvOS 无版本 ID 时由版本守卫获取平台版本 ID。
          return cacheSearchResults(await raceWithAbort([
            {
              promise: ensureAppIdResults(
                "官方下载接口",
                searchAppInfo(query.appId, undefined, options.store, officialController.signal),
              ),
              controller: officialController,
            },
            {
              promise: ensureAppIdResults(
                "Apple 平台接口",
                searchPlatformApp(query.appId, options.store, platformController.signal),
              ),
              controller: platformController,
            },
          ]), options.store)
      }
    } catch (error) {
      if (officialController.signal.aborted || platformController.signal.aborted) {
        throw createAbortError()
      }
      throw new Error(getAppIdSearchErrorMessage(error))
    }
  },
  300,
  { requestAbort: () => searchAbort.current() },
)
