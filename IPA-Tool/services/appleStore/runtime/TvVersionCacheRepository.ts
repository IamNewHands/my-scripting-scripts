import { AppResources } from "../../../constants/AppResources"
import { createVersionCacheRepository } from "./versionCacheSupport"

export const TvVersionCacheRepository = createVersionCacheRepository({
  tableName: AppResources.tvVersionHistory,
  legacyTableName: "db_tv_version_history_cache",
  invalidVersionMessage: "tvOS 版本缓存格式错误",
})
