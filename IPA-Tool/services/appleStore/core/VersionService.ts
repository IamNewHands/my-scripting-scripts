import { ThirdPartyService } from "./ThirdPartyService"
import { today } from "./shared"
import type { VersionTuple } from "./VersionCacheRepository"

type VersionData = {
  appId: string
  data: VersionTuple[]
  total: number
}

export class VersionService extends ThirdPartyService {
  static type = "Versions"

  static async getAppVersionList(id: string | number, select: string) {
    return await this.searchInterface<VersionData>(select, String(id))
  }

  static async concurrentGetVersionList(id: string | number, num = Number.MAX_SAFE_INTEGER) {
    const availableInterfaces = this.getAvailableInterfaces(num)
    if (availableInterfaces.length === 0) throw new Error("没有可用的版本接口")
    return Promise.any(availableInterfaces.map(interfaceName => this.getAppVersionList(id, interfaceName)))
  }

  static async _getTimbrdVersions(id: string | number) {
    const url = `https://api.timbrd.com/apple/app-version/index.php?id=${id}`
    return this.fetchThirdPartyData(url, id, body =>
      (typeof body === "string" ? JSON.parse(body) : body).reverse().map(({ external_identifier, bundle_version }: any) => [
        external_identifier,
        bundle_version,
        today(),
      ])
    )
  }

  static async _getBilinVersions(id: string | number) {
    const url = `https://apis.bilin.eu.org/history/${id}`
    return this.fetchThirdPartyData(url, id, body =>
      (typeof body === "string" ? JSON.parse(body) : body).data.map(({ external_identifier, bundle_version }: any) => [
        external_identifier,
        bundle_version,
        today(),
      ])
    )
  }
}
