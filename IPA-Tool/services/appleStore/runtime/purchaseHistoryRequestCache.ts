import { AppResources } from "../../../constants/AppResources"

const MAX_ENTRIES = 50

export type CachedPurchaseHistoryRequest = {
  url: string
  bodyBase64: string
  signature: string
  revision: number
}

type Cache = Record<string, CachedPurchaseHistoryRequest>

const keyForCookie = (cookie: string) =>
  Crypto.md5(Data.fromRawString(cookie)!).toHexString()

const read = (): Cache => {
  const value = Keychain.get(AppResources.purchaseHistoryRequestCache)
  if (!value) return {}
  try {
    return JSON.parse(value) as Cache
  } catch {
    return {}
  }
}

export const getPurchaseHistoryRequest = (cookie: string) =>
  read()[keyForCookie(cookie)] ?? null

export const setPurchaseHistoryRequest = (
  cookie: string,
  request: CachedPurchaseHistoryRequest,
) => {
  const cache = read()
  const key = keyForCookie(cookie)
  cache[key] = request

  while (Object.keys(cache).length > MAX_ENTRIES) {
    const oldest = Object.keys(cache)[0]
    delete cache[oldest]
  }

  Keychain.set(AppResources.purchaseHistoryRequestCache, JSON.stringify(cache))
}
