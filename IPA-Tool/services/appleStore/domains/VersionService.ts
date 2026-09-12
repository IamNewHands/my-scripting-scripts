import type { AppVersionTuple } from "../../../types/appStore"
import type { BilinVersionResponse, ThirdPartyVersionItem } from "../types"
import { ThirdPartyService } from "./ThirdPartyService"

export type VersionSource = "Timbrd" | "Bilin"

type VersionFetcher = (appId: string | number) => Promise<AppVersionTuple[]>

export class VersionService extends ThirdPartyService {
  /** 从 Timbrd 获取并转换版本列表。 */
  static async getTimbrdVersions(appId: string | number) {
    const url = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}`
    return this.fetchThirdPartyData<AppVersionTuple>(url, body =>
      (typeof body === "string" ? JSON.parse(body) as ThirdPartyVersionItem[] : body as ThirdPartyVersionItem[]).reverse().map(
        ({ external_identifier, bundle_version }: ThirdPartyVersionItem): AppVersionTuple => [
          String(external_identifier),
          String(bundle_version),
        ]
      )
    )
  }

  /** 从 Bilin 获取并转换版本列表。 */
  static async getBilinVersions(appId: string | number) {
    const url = `https://apis.bilin.eu.org/history/${appId}`
    return this.fetchThirdPartyData<AppVersionTuple>(url, body =>
      (typeof body === "string" ? JSON.parse(body) as BilinVersionResponse : body as BilinVersionResponse).data.map(
        ({ external_identifier, bundle_version }: ThirdPartyVersionItem): AppVersionTuple => [
          String(external_identifier),
          String(bundle_version),
        ]
      )
    )
  }

  /** 显式调用指定的第三方版本来源。 */
  static async getAppVersionList(appId: string | number, select: VersionSource) {
    const source = VERSION_SOURCES[select]
    if (!source) throw new Error(`第三方接口 ${select} 暂未实现`)
    return source(appId)
  }

  /** 并发请求已登记来源，并返回首个成功的版本列表。 */
  static async concurrentGetVersionList(appId: string | number, num = Number.MAX_SAFE_INTEGER) {
    const sources = Object.values(VERSION_SOURCES).slice(0, num)
    if (!sources.length) throw new Error("没有可用的版本接口")
    return Promise.any(sources.map(source => source(appId)))
  }
}

const VERSION_SOURCES = {
  Timbrd: (appId: string | number) => VersionService.getTimbrdVersions(appId),
  Bilin: (appId: string | number) => VersionService.getBilinVersions(appId),
} satisfies Record<VersionSource, VersionFetcher>
