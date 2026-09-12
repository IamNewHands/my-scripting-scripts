/** 登记项目使用的 SQLite 数据库逻辑名和文件名。 */
export const AppDatabaseFiles = {
  apps: "ipa_apps.db",
  icons: "app_icon_assets.db",
} as const;

export type AppDatabaseName = keyof typeof AppDatabaseFiles;

export type StorageResourceKey = `storage_${string}`;
export type DatabaseResourceKey = `db_${AppDatabaseName}_${string}`;
export type KeychainResourceKey = `keychain_${string}`;
export type AppResourceKey =
  | StorageResourceKey
  | DatabaseResourceKey
  | KeychainResourceKey;

const defineDatabaseResource = <
  Database extends AppDatabaseName,
  Key extends `db_${Database}_${string}`,
>(
  database: Database,
  key: Key
) => ({ database, key });

/** 数据库资源注册表；数据库逻辑名必须与表名前缀一致。 */
export const AppDatabaseResources = {
  appDatabase: defineDatabaseResource("apps", "db_apps_downloads"),
  appCardCache: defineDatabaseResource("apps", "db_apps_card_cache"),
  appVersionHistory: defineDatabaseResource("apps", "db_apps_version_cache"),
  tvVersionHistory: defineDatabaseResource(
    "apps",
    "db_apps_tv_version_history_cache"
  ),
  appIconAssets: defineDatabaseResource("icons", "db_icons_assets"),
} as const;

export type AppDatabaseResourceName = keyof typeof AppDatabaseResources;
export type RegisteredDatabaseResourceKey =
  (typeof AppDatabaseResources)[AppDatabaseResourceName]["key"];

type DatabaseResourceOwnerMap = {
  [Name in AppDatabaseResourceName as (typeof AppDatabaseResources)[Name]["key"]]: (typeof AppDatabaseResources)[Name]["database"];
};

/** 按完整表名读取数据库归属，不依赖运行时字符串拆分。 */
export const DatabaseResourceOwners = {
  [AppDatabaseResources.appDatabase.key]:
    AppDatabaseResources.appDatabase.database,
  [AppDatabaseResources.appCardCache.key]:
    AppDatabaseResources.appCardCache.database,
  [AppDatabaseResources.appVersionHistory.key]:
    AppDatabaseResources.appVersionHistory.database,
  [AppDatabaseResources.tvVersionHistory.key]:
    AppDatabaseResources.tvVersionHistory.database,
  [AppDatabaseResources.appIconAssets.key]:
    AppDatabaseResources.appIconAssets.database,
} as const satisfies DatabaseResourceOwnerMap;

/** 登记项目使用的全部本地业务资源及其完整 key。 */
export const AppResources = {
  /** 下载配置。 */
  downloadConfig: "storage_download_config",
  /** 下载任务。 */
  downloadTasks: "storage_download_tasks",
  /** IPA 媒体信息。 */
  ipaMediaInfo: "storage_ipa_media_info",
  /** 登录历史。 */
  loginHistory: "storage_login_history",
  /** Apple 登录信息。 */
  appleStoreLogin: "storage_AppleLogin",
  /** Apple 请求设备标识。 */
  appleStoreMac: "storage_AppleMac",
  /** SAP XML 签名缓存。 */
  sapSignCache: "storage_sap_sign_cache",
  /** 购买历史最后一次 items 请求缓存。 */
  purchaseHistoryRequestCache: "keychain_purchase_history_request_cache",
  /** App 主数据表。 */
  appDatabase: AppDatabaseResources.appDatabase.key,
  /** App 图标和主色缓存。 */
  appIconAssets: AppDatabaseResources.appIconAssets.key,
  /** App 卡片数据缓存。 */
  appCardCache: AppDatabaseResources.appCardCache.key,
  /** App 历史版本缓存。 */
  appVersionHistory: AppDatabaseResources.appVersionHistory.key,
  /** tvOS 历史版本缓存。 */
  tvVersionHistory: AppDatabaseResources.tvVersionHistory.key,
} as const satisfies Record<string, AppResourceKey>;

export type AppResourceName = keyof typeof AppResources;
export type RegisteredResourceKey = (typeof AppResources)[AppResourceName];

/** 声明完整重置允许清理的业务资源，不包含版本历史和 App 卡片缓存。 */
export const ResettableResources = [
  /** 下载配置。 */
  "downloadConfig",
  /** 下载任务。 */
  "downloadTasks",
  /** IPA 媒体信息。 */
  "ipaMediaInfo",
  /** 登录历史。 */
  "loginHistory",
  /** Apple 登录信息。 */
  "appleStoreLogin",
  /** Apple 请求设备标识。 */
  "appleStoreMac",
  /** App 图标和主色缓存。 */
  "appIconAssets",
  /** SAP XML 签名缓存。 */
  "sapSignCache",
  "purchaseHistoryRequestCache",
] as const satisfies readonly AppResourceName[];
