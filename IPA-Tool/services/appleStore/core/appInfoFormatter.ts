import { plist } from "../runtime"
import { AuthService } from "./AuthService"

const normalizeSinf = (sinf: unknown) => {
  if (typeof sinf !== "string") return sinf
  return Data.fromBase64String(sinf.replace(/\s/g, "")) ?? sinf
}

export const formatAppInfo = async (appInfo: any) => {
  const { metrics: { currency } } = appInfo
  const {
    songId: appId,
    URL: url,
    "artwork-urls": { default: { url: icon } },
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
    rating: { label: minimumOsVersion },
  } = metadata

  const { accountInfo } = await AuthService.login()
  Object.assign(metadata, { appleId: accountInfo?.appleId })

  return {
    name,
    appId,
    url,
    icon,
    sinf: normalizeSinf(sinf),
    bundleId,
    displayVersion,
    buildVersion,
    externalVersionId,
    externalVersionIdList,
    fileSize,
    metadata: plist.build(metadata),
    minimumOsVersion: String(minimumOsVersion).replace("+", ""),
    currency,
  }
}
