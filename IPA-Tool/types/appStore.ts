// 应用项搜索成功响应接口
export interface AppSearchSuccess {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  size: number;
  price: string;
  averageUserRating?: number;
  userRatingCount: number;
  minimumOsVersion: string;
  currency: string;
  externalVersionId?: string;
}

export interface AppSearchError {
  name: "未找到应用";
  description: string;
}

export type AppSearchResponse = AppSearchSuccess | AppSearchError;

export const isAppSearchSuccess = (
  app: AppSearchResponse
): app is AppSearchSuccess => app.name !== "未找到应用";

export interface SearchAppParams {
  term: string;
  country: string;
  entity: string;
  limit: number;
}

export type AppVersionTuple = [
  externalVersionId: string,
  bundleVersion: string,
];

export type AppVersionItem = AppVersionTuple[];

export interface AppInfo {
  name: string;
  appId: string;
  url: string;
  sinf: Data;
  bundleId: string;
  displayVersion: string;
  buildVersion: string;
  externalVersionId: string;
  externalVersionIdList: string[];
  softwarePlatform?: "ios";
  fileSize: number;
  metadata: string;
  icon: string;
  currency: string;
  minimumOsVersion: string;
}

export interface ITunesSearchResultItem {
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

