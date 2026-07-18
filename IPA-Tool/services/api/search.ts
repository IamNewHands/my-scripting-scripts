import {
  type AppSearchSuccess,
  type AppinfoResponse,
  type SearchAppParams,
} from "../../types/appStore";
import { debounce, currencyCodeToSymbol } from "../../utils";
import { fetch, AbortController } from "scripting";
import { apiGetAppInfo } from "./appInfo";

/**
 * 搜索 App Store 应用
 * @param params 搜索参数
 * @returns 搜索结果数组
 */
export const searchAppIdAbort = { current: () => {} };

interface ITunesSearchResultItem {
  trackId: number;
  trackName: string;
  trackCensoredName?: string;
  artworkUrl60: string;
  artworkUrl100?: string;
  artworkUrl512?: string;
  genres?: string[];
  primaryGenreName?: string;
  version: string;
  fileSizeBytes: number | string;
  averageUserRating?: number;
  userRatingCount?: number;
  minimumOsVersion?: string;
  price: number;
  formattedPrice?: string;
  description?: string;
  currency: string;
}

interface ITunesSearchResponse {
  resultCount?: number;
  results: ITunesSearchResultItem[];
}

const getITunesArtwork = (app: ITunesSearchResultItem) => {
  const artwork = app.artworkUrl512 ?? app.artworkUrl100 ?? app.artworkUrl60;
  return artwork.replace(/\d+x\d+bb/, "240x240bb");
}

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

export const apiSearchApp = debounce(
  async ({ term, country, entity, limit }: SearchAppParams) => {
    const controller = new AbortController();
    searchAppIdAbort.current = () => {
      controller.abort();
    };
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${encodeURIComponent(country)}&entity=${encodeURIComponent(entity)}&explicit=no&limit=${limit}`,
      { signal: controller.signal }
    );
    const { results } = await response.json() as ITunesSearchResponse;
    return results.map(mapITunesSearchResult) satisfies AppSearchSuccess[] | [];
  },
  300,
  { requestAbort: () => searchAppIdAbort.current() }
);

/**
 * 通过 APPID 搜索应用
 * @param appId 应用 ID
 * @param country 国家/地区代码
 * @returns 应用信息
 */

export const appIdSearchAbort = { current: () => {} };

const createAbortError = () => {
  const error = new Error("请求已取消");
  error.name = "AbortError";
  return error;
}

type LocalAppInfo = AppinfoResponse["data"]["appInfo"];

type AppIdSearchSource = (appId: string, signal: AbortController["signal"]) => Promise<AppSearchSuccess[]>;

const ensureAppIdResults = async (
  sourceName: string,
  promise: Promise<AppSearchSuccess[]>
) => {
  const results = await promise;
  if (!results.length) throw new Error(`${sourceName} 未找到应用`);
  return results;
}

const getAppIdSearchErrorMessage = (error: unknown) => {
  if (error instanceof AggregateError) {
    return error.errors
      .map((item: unknown) => item instanceof Error ? item.message : String(item))
      .filter(Boolean)
      .join("; ") || "请检查搜索内容是否正确";
  }
  if (error instanceof Error) return error.message;
  return "请检查搜索内容是否正确";
}

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
})

const searchAppIdFromLocalApi: AppIdSearchSource = async (appId, signal) => {
  const { appInfo } = await apiGetAppInfo(appId, undefined, { signal });
  if (signal.aborted) throw createAbortError();
  return [mapLocalAppInfo(appInfo)];
}

const searchAppIdFromITunesLookup: AppIdSearchSource = async (appId, signal) => {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}`,
    { signal }
  );
  const { results } = await response.json() as ITunesSearchResponse;
  if (signal.aborted) throw createAbortError();
  return (results ?? []).map(mapITunesSearchResult);
}

export const apiSearchAppById = debounce(
  async (appId: string, _country: string) => {
    const localController = new AbortController();
    const lookupController = new AbortController();
    appIdSearchAbort.current = () => {
      localController.abort();
      lookupController.abort();
    };

    try {
      const results = await Promise.any([
        ensureAppIdResults(
          "官方下载接口",
          searchAppIdFromLocalApi(appId, localController.signal)
        ),
        ensureAppIdResults(
          "Apple Lookup 接口",
          searchAppIdFromITunesLookup(appId, lookupController.signal)
        ),
      ]);

      localController.abort();
      lookupController.abort();
      return results;
    } catch (error) {
      if (localController.signal.aborted || lookupController.signal.aborted) {
        throw createAbortError();
      }
      throw new Error(getAppIdSearchErrorMessage(error));
    }
  },
  300,
  { requestAbort: () => appIdSearchAbort.current() }
);
