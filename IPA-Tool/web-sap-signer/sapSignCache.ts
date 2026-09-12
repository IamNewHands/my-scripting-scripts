import { AppResources } from "../constants/AppResources"

const MAX_CACHE_SIZE = 50

type SapSignCacheData = Record<string, string>

/** guid 是签名上下文的一部分，bodyBase64 保留原始 body 字节。 */
const getCacheKey = (guid: string, bodyBase64: string) =>
  Crypto.md5(Data.fromRawString(`${guid}\0${bodyBase64}`)!).toHexString()

export class SapSignCache {
  get(guid: string, bodyBase64: string): string | null {
    const cache = Storage.get<SapSignCacheData>(AppResources.sapSignCache) ?? {}
    return cache[getCacheKey(guid, bodyBase64)] ?? null
  }

  set(guid: string, bodyBase64: string, signature: string): void {
    const cache = Storage.get<SapSignCacheData>(AppResources.sapSignCache) ?? {}
    cache[getCacheKey(guid, bodyBase64)] = signature

    while (Object.keys(cache).length > MAX_CACHE_SIZE) {
      delete cache[Object.keys(cache)[0]]
    }

    Storage.set(AppResources.sapSignCache, cache)
  }
}

const sapSignCache = new SapSignCache()

export default sapSignCache
