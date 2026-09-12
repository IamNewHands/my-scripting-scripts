import type { AbortController, RedirectRequest } from "scripting";
import type {
  AppVersionTuple,
  AppSearchSuccess,
  ITunesSearchResultItem,
  SearchAppParams,
  AppInfo,
} from "../../../types/appStore";
import {
  PLATFORM,
  type Platform,
  type Store,
} from "../../../constants/Platform";
import { getMac, request } from "../runtime";
import { plist } from "../../../utils/plist";
import { AuthService } from "./AuthService";
import { formatAppInfo } from "../runtime/appInfoFormatter";
import { APPLE_COMMON_HEADERS } from "../runtime/appleHeaders";
import {
  AppInfoError,
  PurchaseError,
  getAppleFailureMessage,
  APPLE_FAILURE_CODES,
} from "../runtime/errors";
import { VersionCacheRepository } from "../runtime/VersionCacheRepository";
import { TvVersionCacheRepository } from "../runtime/TvVersionCacheRepository";
import type {
  AppleAppInfoResponse,
  AppleAppInfoResponseWithData,
  ApplePurchaseResponse,
} from "../types";
import { VersionService } from "./VersionService";
import { getCacheDate } from "../runtime/versionCacheSupport";
import { formatAppIconUrl } from "../runtime/artwork";

export type GetAppInfoOptions = {
  signal?: AbortController["signal"];
};

export type GetAppInfoParams = {
  salableAdamId: string | number;
  externalVersionId: string | number | undefined;
  options?: GetAppInfoOptions;
  rootUrl?: string;
};

type ITunesSearchResponse = {
  resultCount?: number;
  results?: ITunesSearchResultItem[];
};

type VersionCacheRepositoryLike = Pick<
  typeof VersionCacheRepository,
  "read" | "set"
>;

const getVersionCacheRepository = (
  platform: Platform
): VersionCacheRepositoryLike =>
  platform === PLATFORM.TV ? TvVersionCacheRepository : VersionCacheRepository;

type RawPlatformApp = {
  id?: string | number;
  name?: string;
  description?: { standard?: string };
  artwork?: { url?: string };
  genreNames?: string[];
  minimumOSVersion?: string;
  userRating?: { ratingCount?: number; value?: number };
  offers?: Array<{
    priceFormatted?: string;
    assets?: Array<{ size?: number }>;
    version?: { display?: string; externalId?: string | number };
  }>;
};

type PlatformAppResponse = {
  results?: Record<string, RawPlatformApp>;
};

export type PlatformAppRequest = {
  appId: string;
  store: Store;
  signal?: AbortController["signal"];
};

const formatPlatformApp = (
  app: RawPlatformApp,
  appId: string
): AppSearchSuccess => {
  const offer = app.offers?.[0];
  const version = offer?.version;

  return {
    id: String(app.id ?? appId),
    name: app.name ?? "",
    description: app.description?.standard ?? "",
    icon: formatAppIconUrl(app.artwork?.url),
    category: app.genreNames?.join(" • ") ?? "",
    version: version?.display ?? "",
    size: offer?.assets?.[0]?.size ?? 0,
    price: offer?.priceFormatted ?? "Free",
    averageUserRating: Number((app.userRating?.value ?? 0).toFixed(1)),
    userRatingCount: app.userRating?.ratingCount ?? 0,
    minimumOsVersion: app.minimumOSVersion ?? "",
    currency: "",
    externalVersionId: version?.externalId
      ? String(version.externalId)
      : undefined,
  };
};

/** 将 iTunes Lookup 结果转换为搜索卡片使用的统一数据。 */
export const formatLookupApp = (
  app: ITunesSearchResultItem,
  appId: string,
): AppSearchSuccess => {
  const artwork = app.artworkUrl512 ?? app.artworkUrl100 ?? app.artworkUrl60;
  const icon = formatAppIconUrl(artwork);
  const price = app.formattedPrice ?? (app.price > 0 ? String(app.price) : "Free");

  return {
    id: String(app.trackId ?? appId),
    name: app.trackName ?? app.trackCensoredName ?? "",
    description: app.description ?? "",
    icon,
    category: app.genres?.join(" • ") ?? app.primaryGenreName ?? "",
    version: app.version ?? "",
    size: Number(app.fileSizeBytes) || 0,
    price,
    averageUserRating: Number((app.averageUserRating ?? 0).toFixed(1)),
    userRatingCount: app.userRatingCount ?? 0,
    minimumOsVersion: app.minimumOsVersion ?? "",
    currency: app.currency ?? "",
  };
};

const mergeVersionList = (
  primary: AppVersionTuple[],
  fallback: AppVersionTuple[]
): AppVersionTuple[] =>
  primary.map(([externalVersionId, bundleVersion]) => {
    const matched = fallback.find(item => item[0] === externalVersionId);
    return [
      externalVersionId,
      bundleVersion === "????" && matched ? matched[1] : bundleVersion,
    ];
  });

const processVersionIdList = (appInfo: AppInfo): AppVersionTuple[] => {
  const { externalVersionIdList, externalVersionId, displayVersion } = appInfo;
  if (!externalVersionIdList.length) {
    return [[String(externalVersionId), displayVersion]];
  }
  return [...externalVersionIdList]
    .reverse()
    .map(id => [
      String(id),
      String(externalVersionId) === String(id) ? displayVersion : "????",
    ]);
};

export class StoreService {
  /** 请求 Apple 下载信息，并保留 CK 刷新和自动购买恢复出口。 */
  static async getAppInfo(params: GetAppInfoParams): Promise<AppInfo> {
    const {
      salableAdamId,
      externalVersionId,
      options,
      rootUrl = "https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct",
    } = params;
    const { dsPersonId, Cookie, storeFront } = await AuthService.login();
    const data = {
      guid: getMac(),
      salableAdamId,
      externalVersionId,
    };
    const body = String(plist.build(data));
    const headers = {
      ...APPLE_COMMON_HEADERS,
      Cookie: String(Cookie ?? ""),
      "X-Apple-Store-Front": String(storeFront ?? ""),
      "X-Dsid": String(dsPersonId ?? ""),
      "iCloud-DSID": String(dsPersonId ?? ""),
    };

    const firstUrl = `${rootUrl}?guid=${data.guid}`;
    let redirectRequest: RedirectRequest | undefined;
    const requestOptions = {
      method: "POST",
      body,
      signal: options?.signal,
      headers,
      handleRedirect: async (nextRequest: RedirectRequest) => {
        redirectRequest = nextRequest;
        return null;
      },
    };

    let response = await request(firstUrl, requestOptions);
    if (response.status === 302) {
      if (!redirectRequest?.url)
        throw new AppInfoError("❌下载信息重定向地址为空");
      response = await request(redirectRequest.url, {
        method: requestOptions.method,
        body,
        signal: options?.signal,
        headers,
      });
    }

    const dataText = await response.text();
    const responseData = plist.parse(dataText) as AppleAppInfoResponse | null;

    return this.#processAppInfoData(responseData, params);
  }

  /** 处理 Apple 下载信息响应。 */
  static async #processAppInfoData(
    data: AppleAppInfoResponse | null,
    params: GetAppInfoParams
  ): Promise<AppInfo> {
    const { salableAdamId, rootUrl } = params;
    // Apple 没有返回任何数据。
    if (!data) throw new AppInfoError("❌应用信息为空");

    const { failureType } = data;

    const errorMessage = getAppleFailureMessage(data.failureType);

    // CK 失效，刷新登录态后重试当前接口。
    if (
      failureType === APPLE_FAILURE_CODES.CK_EXPIRED ||
      failureType === APPLE_FAILURE_CODES.CK_EMPTY_OR_EXPIRED
    ) {
      await AuthService.refreshCookie();
      return this.getAppInfo(params);
    }

    // 未找到许可，购买应用后重试当前接口。
    if (failureType === APPLE_FAILURE_CODES.LICENSE_NOT_FOUND) {
      await this.purchaseApp(salableAdamId);
      return this.getAppInfo(params);
    }

    // 其他 Apple 业务错误直接抛出。
    if (errorMessage) {
      throw new AppInfoError(errorMessage);
    }

    // 主接口没有版本数据时，切换到兜底接口重试。
    const fallbackUrl = "https://downloaddispatch.itunes.apple.com/up/backgroundUpdateProduct";
    if (!data.songList?.length && rootUrl !== fallbackUrl) {
      return this.getAppInfo({ ...params, rootUrl: fallbackUrl });
    }

    // 兜底接口仍然没有版本数据，直接抛出错误。
    if (!data.songList?.length) {
      throw new AppInfoError("❌这个版本 ID 的应用信息为空");
    }

    // 数据有效，格式化后返回。
    const formatData = await formatAppInfo(
      data as AppleAppInfoResponseWithData
    );
    return formatData;
  }

  /** 搜索 Apple 应用并返回搜索结果。 */
  static async searchApps(
    { term, country, entity, limit }: SearchAppParams,
    signal?: AbortController["signal"]
  ) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${encodeURIComponent(country)}&entity=${encodeURIComponent(entity)}&explicit=no&limit=${limit}`;
    console.log("Apple Search URL:", url);
    const response = await request(url, {
      headers: APPLE_COMMON_HEADERS,
      signal,
    });

    const data = (await response.json()) as ITunesSearchResponse;
    return data.results ?? [];
  }

  /** 按 App ID 查询 Apple Lookup 结果。 */
  static async lookupApp(
    appId: string,
    country: string,
    signal?: AbortController["signal"]
  ) {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}`;
    const response = await request(url, {
      headers: APPLE_COMMON_HEADERS,
      signal,
    });
    const data = (await response.json()) as ITunesSearchResponse;
    return data.results ?? [];
  }

  /** 获取指定国家和平台的完整 App 数据；没有数据时返回 null。 */
  static async getPlatformApp({
    appId,
    store,
    signal,
  }: PlatformAppRequest): Promise<AppSearchSuccess | null> {
    const { country, platform } = store;
    const url = `https://uclient-api.itunes.apple.com/WebObjects/MZStorePlatform.woa/wa/lookup?version=2&id=${encodeURIComponent(appId)}&p=mdm-lockup&caller=MDM&platform=${platform}&cc=${encodeURIComponent(country)}`;
    const response = await request(url, {
      headers: APPLE_COMMON_HEADERS,
      signal,
    });
    const data = (await response.json()) as PlatformAppResponse;
    const app = data.results?.[appId];
    return app ? formatPlatformApp(app, appId) : null;
  }

  /** 获取指定平台的版本列表，并使用对应缓存表。 */
  static async getVersions({
    salableAdamId,
    getAppInfo,
    store,
  }: {
    salableAdamId: string;
    getAppInfo: () => Promise<AppInfo>;
    store: Store;
  }) {
    const cache = getVersionCacheRepository(store.platform);
    const { cacheDate, versions: cached } = await cache.read(salableAdamId);
    if (cached.length && cacheDate === getCacheDate()) return cached;

    const [officialVersions, thirdPartyVersions] = await Promise.all([
      getAppInfo().then(processVersionIdList),
      this.#getThirdPartyVersions(salableAdamId, store.platform),
    ]);

    const versions =
      officialVersions.length >= thirdPartyVersions.length
        ? mergeVersionList(officialVersions, thirdPartyVersions)
        : thirdPartyVersions;

    await cache.set(salableAdamId, versions);
    return versions;
  }

  /** 获取第三方版本；tvOS 或查询失败时返回空列表。 */
  static async #getThirdPartyVersions(
    salableAdamId: string,
    platform: Platform
  ): Promise<AppVersionTuple[]> {
    // tvOS 没有第三方版本来源。
    if (platform === PLATFORM.TV) return [];

    try {
      return await VersionService.concurrentGetVersionList(salableAdamId);
    } catch (reason: unknown) {
      const { errors = [], error } = reason as {
        errors?: unknown[];
        error?: unknown;
      };
      console.log(...errors, error);
      return [];
    }
  }

  /** 向 Apple 提交免费应用购买请求。 */
  static async purchaseApp(
    salableAdamId: number | string
  ): Promise<number | string | undefined> {
    const { dsPersonId, passwordToken, storeFront, Cookie } =
      await AuthService.refreshCookie();
    const body = String(
      plist.build({
        appExtVrsId: "0",
        buyWithoutAuthorization: "true",
        guid: getMac(),
        hasAskedToFulfillPreorder: "true",
        hasDoneAgeCheck: "true",
        price: "0",
        pricingParameters: "STDQ",
        productType: "C",
        salableAdamId,
      })
    );
    const response = await request(
      "https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/buyProduct",
      {
        method: "POST",
        body,
        headers: {
          ...APPLE_COMMON_HEADERS,
          Cookie: String(Cookie ?? ""),
          "X-Token": String(passwordToken ?? ""),
          "X-Dsid": String(dsPersonId ?? ""),
          "iCloud-DSID": String(dsPersonId ?? ""),
          "X-Apple-Store-Front": String(storeFront ?? ""),
        },
      }
    );
    const purchaseResult = plist.parse(
      await response.text()
    ) as ApplePurchaseResponse;
    const { failureType, jingleDocType } = purchaseResult;
    const errorMessage = getAppleFailureMessage(failureType);

    if (errorMessage) throw new PurchaseError(errorMessage);
    if (jingleDocType) return salableAdamId;
  }
}
