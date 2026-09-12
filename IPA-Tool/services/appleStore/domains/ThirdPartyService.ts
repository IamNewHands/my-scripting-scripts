import { request } from "../runtime"

type DataExtractor<T> = (body: unknown) => T[]

export class ThirdPartyService {
  /** 请求第三方接口并将结果转换为统一的能力数据。 */
  protected static async fetchThirdPartyData<T>(
    url: string,
    extractData: DataExtractor<T>
  ) {
    try {
      const response = await request(url)
      const data = extractData(await response.text())
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${url} 接口请求失败: ${message}`)
    }
  }
}
