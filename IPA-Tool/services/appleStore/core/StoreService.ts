import { $http, plist } from "../runtime"
import { AuthService } from "./AuthService"
import { VersionService } from "./VersionService"
import { VersionCacheRepository, type VersionTuple } from "./VersionCacheRepository"
import { CustomError, getMac } from "./shared"
import { formatAppInfo } from "./appInfoFormatter"

export class StoreService {
  static async getAppInfo(salableAdamId: number, externalVersionId?: number | string): Promise<any> {
    const { dsPersonId, Cookie } = await AuthService.login()
    const dataJson = {
      creditDisplay: "",
      guid: getMac(),
      salableAdamId,
      externalVersionId,
    }
    const resp = await $http.post({
      url: `https://p25-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${dataJson.guid}`,
      body: String(plist.build(dataJson)),
      timeout: 6,
      headers: {
        Cookie: String(Cookie ?? ""),
        "X-Dsid": String(dsPersonId ?? ""),
        "iCloud-DSID": String(dsPersonId ?? ""),
      },
    })

    const appInfo = plist.parse(String(resp.body))
    try {
      this.validateAppInfo(appInfo)
      return await formatAppInfo(appInfo)
    } catch (error) {
      if (error instanceof Error && error.name === "AppInfoError" && /2042|2034/.test(error.message)) {
        await AuthService.refreshCookie()
        return await this.getAppInfo(salableAdamId, externalVersionId)
      }

      if (error instanceof Error && error.name === "AppInfoError" && error.message.includes("9610")) {
        await this.purchaseApp(salableAdamId)
        return await this.getAppInfo(salableAdamId, externalVersionId)
      }

      throw error
    }
  }

  static validateAppInfo(appInfo: any) {
    if (!appInfo) throw new CustomError("AppInfo", "❌应用信息为空")
    if (Object.hasOwn(appInfo, "failureType")) {
      const { failureType, customerMessage } = appInfo
      throw new CustomError("AppInfo", ["❌获取应用信息失败", failureType, customerMessage].join(","))
    }
    if (!appInfo?.songList?.length) throw new CustomError("AppInfo", "❌这个版本号的应用信息为空")
    return true
  }

  static async getVersions({ salableAdamId, startVersionId }: { salableAdamId: number; startVersionId?: number }) {
    const versionList = await this.getAppVersionCache(salableAdamId, startVersionId)
    return { data: versionList, total: versionList.length }
  }

  static async getAppVersionCache(salableAdamId: number, startVersionId?: number) {
    if (!await VersionCacheRepository.isFresh(salableAdamId)) {
      const [processedVersions, legacyVersions] = await Promise.all([
        this.processVersionIdList(salableAdamId, startVersionId),
        VersionService.concurrentGetVersionList(salableAdamId).catch(() => {
          return { total: 0, data: [] as VersionTuple[] }
        }),
      ])

      const versions = processedVersions.length >= legacyVersions.total
        ? this.mergeVersionList(processedVersions, legacyVersions.data)
        : legacyVersions.data
      await VersionCacheRepository.set(salableAdamId, versions, processedVersions.length >= legacyVersions.total ? "merged" : "legacy")
    }

    return await VersionCacheRepository.getVersionList(salableAdamId)
  }

  static mergeVersionList(processedVersions: VersionTuple[], legacyVersions: VersionTuple[]) {
    processedVersions.forEach(processed => {
      const legacy = legacyVersions.find(item => item[0] === processed[0])
      if (legacy && processed[1] === "????") processed[1] = legacy[1]
    })
    return processedVersions
  }

  static async processVersionIdList(salableAdamId: number, startVersionId?: number): Promise<VersionTuple[]> {
    const { externalVersionIdList, externalVersionId, displayVersion } = await this.getAppInfo(salableAdamId, startVersionId)
    if (!externalVersionIdList.length) return [[externalVersionId, displayVersion]]
    return externalVersionIdList.reverse().map((id: string | number) => [id, "????", new Date().toLocaleDateString("sv-SE")])
  }

  static async purchaseApp(salableAdamId: number | string): Promise<number | string | undefined> {
    const { dsPersonId, passwordToken, storeFront, Cookie } = await AuthService.refreshCookie()
    const dataJson = {
      appExtVrsId: "0",
      buyWithoutAuthorization: "true",
      guid: getMac(),
      hasAskedToFulfillPreorder: "true",
      hasDoneAgeCheck: "true",
      price: "0",
      pricingParameters: "STDQ",
      productType: "C",
      salableAdamId,
    }
    const resp = await $http.post({
      url: "https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/buyProduct",
      body: String(plist.build(dataJson)),
      headers: {
        Cookie: String(Cookie ?? ""),
        "X-Token": String(passwordToken ?? ""),
        "X-Dsid": String(dsPersonId ?? ""),
        "iCloud-DSID": String(dsPersonId ?? ""),
        "X-Apple-Store-Front": String(storeFront ?? ""),
      },
    }, 6)
    const { failureType, customerMessage, jingleDocType } = plist.parse(String(resp.body)) as any

    switch (failureType) {
      case "5002": throw new CustomError("buy", "[发生未知错误] 已购买过")
      case "2040": throw new CustomError("buy", "[购买失败] 已购买过，已下架了")
      case "2059": throw new CustomError("buy", "[购买失败] 未买过，已下架，地区未上架")
      case "1010": throw new CustomError("buy", "[无效 Store] 该地区未上架")
      case "2034": throw new CustomError("buy", "[未登录到 iTunes Store] CK过期")
      case "2042": throw new CustomError("buy", "[未登录到 iTunes Store] CK为空或者过期")
      case "2019": throw new CustomError("buy", "[购买失败] 无法直接购买付费软件")
      case "9610": throw new CustomError("buy", "[未找到许可] 没购买过或应用ID错误")
      default:
        if (failureType || failureType === "") throw new CustomError("buy", `[购买失败] ${customerMessage}`)
    }

    if (jingleDocType) return salableAdamId
  }
}
