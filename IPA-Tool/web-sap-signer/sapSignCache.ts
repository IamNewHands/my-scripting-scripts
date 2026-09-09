// SAP 签名缓存：以 XML 的 MD5 为 key 存储签名结果，命中则跳过 WebView 签名流程

const MAX_CACHE_SIZE = 50

type SapSignCacheData = Record<string, string>

const STORAGE_KEY = "storage_sap_sign_cache"

const getCacheKey = (xml: string) =>
  Crypto.md5(Data.fromRawString(xml)!).toHexString()

const sapSignCache = {
  get(xml: string): string | null {
    const cache = Storage.get<SapSignCacheData>(STORAGE_KEY) ?? {}
    return cache[getCacheKey(xml)] ?? null
  },

  set(xml: string, signature: string): void {
    const cache = Storage.get<SapSignCacheData>(STORAGE_KEY) ?? {}
    cache[getCacheKey(xml)] = signature

    // 超出上限时删除最早写入的条目
    while (Object.keys(cache).length > MAX_CACHE_SIZE) {
      delete cache[Object.keys(cache)[0]]
    }

    Storage.set(STORAGE_KEY, cache)
  },
}

export default sapSignCache
