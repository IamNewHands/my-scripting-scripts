import { plist } from "../../../utils/plist"
import type { AppInfo } from "../../../types/appStore"
import type { AppleAppInfoResponseWithData } from "../types"
import { AuthService } from "../domains/AuthService"
import { formatAppIconUrl } from "./artwork"
import { AppConfig } from "../../../constants/AppConfig"
const normalizeSinf = (sinf: unknown): unknown => {
  if (typeof sinf !== "string") return sinf
  return Data.fromBase64String(sinf.replace(/\s/g, "")) ?? sinf
}

export const formatAppInfo = async (appInfo: AppleAppInfoResponseWithData): Promise<AppInfo> => {

  const { metrics: { currency } } = appInfo
  const {
    songId: appId,
    URL: url,
    "artwork-urls": { default: { url: rawIcon } },
    sinfs: [{ sinf }],
    "asset-info": { "file-size": fileSize },
    metadata,
  } = appInfo.songList[0]

  const {
    bundleDisplayName: name,
    softwareVersionBundleId: bundleId,
    bundleShortVersionString: displayVersion,
    bundleVersion: buildVersion,
    softwareVersionExternalIdentifier: externalVersionId,
    softwareVersionExternalIdentifiers: externalVersionIdList = [],
    "software-platform": softwarePlatform,
    rating: { label: minimumOsVersion },
  } = metadata

  const { accountInfo } = await AuthService.login()
  Object.assign(metadata, { appleId: accountInfo?.appleId })

  // 免更新开关：删除软件更新检查字段，App Store 不再显示更新角标（维护版新增）
  if (AppConfig.install.disableUpdateCheck) {
    delete metadata.softwareUpdateNeeded
    delete metadata.softwareUpdateNeededString
  }

  return {
    name,
    appId: String(appId),
    url,
    icon: formatAppIconUrl(rawIcon),
    sinf: normalizeSinf(sinf),
    bundleId,
    displayVersion,
    buildVersion,
    externalVersionId: String(externalVersionId),
    externalVersionIdList: externalVersionIdList.map(String),
    softwarePlatform,
    fileSize,
    metadata: plist.build(metadata),
    minimumOsVersion: String(minimumOsVersion).replace("+", ""),
    currency,
  } as AppInfo
}
