import {
  PurchaseHistoryService,
  type OwnedAppRecord,
} from "../appleStore/domains/PurchaseHistoryService"
import { getMac } from "../appleStore/runtime"
import { AppConfig } from "../../constants/AppConfig"
import {
  getPurchaseHistoryRequest,
  setPurchaseHistoryRequest,
} from "../appleStore/runtime/purchaseHistoryRequestCache"
import {
  closeSapSigner,
  initializeSapSigner,
} from "../../web-sap-signer"
import { storeIdToCode } from "../../utils/countries"

export type PurchaseHistoryResult = {
  apps: OwnedAppRecord[]
  country: string
}

/** 查询当前账号的全部购买历史。 */
export const queryPurchaseHistory = async (): Promise<PurchaseHistoryResult> => {
  const guid = getMac()
  const service = new PurchaseHistoryService(guid)
  const account = await service.loadAccount()
  const country = storeIdToCode(account.storeFront ?? "")
  if (!country) throw new Error("无法识别当前 Apple 账号的商店地区")
  const useCache = AppConfig.experimental.sapSignCache

  if (useCache && account.Cookie) {
    const cachedRequest = getPurchaseHistoryRequest(account.Cookie)
    if (cachedRequest) {
      return {
        apps: await service.replay(cachedRequest),
        country,
      }
    }
  }

  const signer = initializeSapSigner(guid, { useCache })

  try {
    const apps = await service.query(signer)
    const request = service.getLastItemsRequest()
    if (useCache && account.Cookie && request) {
      setPurchaseHistoryRequest(account.Cookie, request)
    }
    return { apps, country }
  } finally {
    await closeSapSigner()
  }
}
