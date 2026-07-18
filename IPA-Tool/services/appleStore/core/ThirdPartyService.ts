import { $http } from "../runtime"

type DataExtractor<T> = (body: any) => T[]

export class ThirdPartyService {
  static type: string

  static getAvailableInterfaces(limit = Number.MAX_SAFE_INTEGER) {
    const methods = Object.getOwnPropertyNames(this)
    const excludeMethod = `_getApp${this.type}List`
    const regex = new RegExp(`^_get(.+)${this.type}$`)
    return methods.flatMap(method => {
      if (method.startsWith("_get") && method.endsWith(this.type) && method !== excludeMethod) {
        return method.replace(regex, "$1")
      }
      return []
    }).slice(0, limit)
  }

  static async searchInterface<T>(select: string, ...args: unknown[]): Promise<T> {
    const methodName = `_get${select.charAt(0).toUpperCase() + select.slice(1)}${this.type}`
    const method = (this as any)[methodName]
    if (!method) throw new Error(`第三方接口 ${select} 暂未实现`)
    return await method.call(this, ...args)
  }

  static async fetchThirdPartyData<T>(req: string | { url: string }, id: string | number, dataExtractor: DataExtractor<T>) {
    try {
      const { body } = await $http(req as any, 8)
      const data = dataExtractor(body)
      return { appId: String(id), data, total: data.length }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${typeof req === "string" ? req : req.url} 接口请求失败: ${message}`)
    }
  }
}
