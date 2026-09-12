import { debounce } from "../tool"
import type { Store } from "../../constants/Platform"
import { StoreService, VersionService } from "../appleStore"
import { apiGetAppInfo } from "./appInfo"

type VersionSource = "Timbrd" | "Bilin"

export const apiGetAppVersionList = debounce((
  appId: string,
  store: Store,
  startVersionId?: string,
) => StoreService.getVersions({
  salableAdamId: appId,
  getAppInfo: () => apiGetAppInfo.withoutDebounce(appId, startVersionId, undefined, store)
    .then(result => result.appInfo),
  store,
}), 300)


export const apiGetAppVersions3rd = debounce(
  async (appId: string, select?: VersionSource) => {
    return select
      ? await VersionService.getAppVersionList(appId, select)
      : await VersionService.concurrentGetVersionList(appId).catch(({ errors = [], error }) => {
          throw errors.length ? new Error(errors.map((item: Error) => item.message).join("\n")) : error
        })
  },
  300
)
