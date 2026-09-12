import { AppResources } from "../../../constants/AppResources"
import { createVersionCacheRepository } from "./versionCacheSupport"

export const VersionCacheRepository = createVersionCacheRepository({
  tableName: AppResources.appVersionHistory,
  legacyTableName: "db_app_version_cache",
  invalidVersionMessage: "版本缓存格式错误",
  includeClear: true,
})
