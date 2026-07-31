import { $http, plist } from "../runtime"
import { AuthService } from "./AuthService"
import { VersionService } from "./VersionService"
import { VersionCacheRepository, type VersionTuple } from "./VersionCacheRepository"
import { CustomError, getMac } from "./shared"
import { formatAppInfo } from "./appInfoFormatter"

type GetAppInfoOptions = {
  signal?: unknown
}

export class StoreService {
  static async #postVolumeStoreDownload(
    host: string,
    dataJson: Record<string, unknown>,
    auth: { dsPersonId?: string | number; Cookie?: string; storeFront?: string },
    options?: GetAppInfoOptions
  ) {
    const path = `/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct?guid=${dataJson.guid}`
    const request: {
      url: string
      body: string
      timeout: number
      signal?: unknown
      headers: Record<string, string>
      handleRedirect: () => Promise<null>
    } = {
      url: `https://${host}${path}`,
      body: String(plist.build(dataJson)),
      timeout: 6,
      signal: options?.signal,
      headers: {
        Cookie: String(auth.Cookie ?? ""),
        "X-Apple-Store-Front": String(auth.storeFront ?? ""),
        "X-Dsid": String(auth.dsPersonId ?? ""),
        "iCloud-DSID": String(auth.dsPersonId ?? ""),
        "user-agent": "Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8",
        "content-type": "application/x-www-form-urlencoded",
      },
      handleRedirect: async () => null,
    }

    let resp = await $http.post(request)

    if (resp.status === 302) {
      const location = String(resp.headers.location ?? "")
      // 相对路径补全，避免二次请求打到错误 host
      request.url = location.startsWith("http")
        ? location
        : new URL(location, request.url).toString()
      resp = await $http.post(request)
    }

    return resp
  }

  static async getAppInfo(
    salableAdamId: number,
    externalVersionId?: number | string,
    options?: GetAppInfoOptions
  ): Promise<any> {
    const { dsPersonId, Cookie, storeFront } = await AuthService.login()
    const dataJson = {
      creditDisplay: "",
      guid: getMac(),
      salableAdamId,
      externalVersionId,
    }

    // 优先源头 p37；HTTP 403/失败再回退维护版常用 p25
    const hosts = ["p37-buy.itunes.apple.com", "p25-buy.itunes.apple.com"]
    let lastError: unknown

    for (const host of hosts) {
      try {
        const resp = await this.#postVolumeStoreDownload(
          host,
          dataJson,
          { dsPersonId, Cookie, storeFront },
          options
        )
        const appInfo = plist.parse(String(resp.body))
        this.validateAppInfo(appInfo)
        return await formatAppInfo(appInfo)
      } catch (error) {
        lastError = error
        // 业务错误优先（不可靠换 host 解决）
        if (error instanceof Error && error.name === "AppInfoError" && /2042|2034/.test(error.message)) {
          await AuthService.refreshCookie()
          return await this.getAppInfo(salableAdamId, externalVersionId, options)
        }
        if (error instanceof Error && error.name === "AppInfoError" && error.message.includes("9610")) {
          await this.purchaseApp(salableAdamId)
          return await this.getAppInfo(salableAdamId, externalVersionId, options)
        }
        const message = error instanceof Error ? error.message : String(error)
        // 节点/传输/空响应类失败：换 p25 再试
        if (
          /\b403\b|\b404\b|\b502\b|\b503\b|timeout|Not Found|HTTPError|应用信息为空|版本号的应用信息为空|获取应用信息失败/.test(
            message
          )
        ) {
          continue
        }
        throw error
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
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
