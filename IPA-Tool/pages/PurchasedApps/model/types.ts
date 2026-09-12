import type { AppSearchSuccess } from "../../../types/appStore"
import type { OwnedAppRecord } from "../../../services/appleStore/domains/PurchaseHistoryService"

/** 购买历史列表只保留历史记录字段，不混入卡片接口返回的数据。 */
export type PurchasedAppItem = OwnedAppRecord

export type PurchasedAppRequest = {
  appId: string
  country: string
  promise: Promise<AppSearchSuccess | null>
  cancelled: boolean
  cancel: () => void
}

export type PurchasedAppSlot = {
  appId: string
  country: string
  active: boolean
  loaded: boolean
  request?: PurchasedAppRequest
  accept?: (request: PurchasedAppRequest) => void
  start?: () => void
}

export type PurchasedAppRegistry = Record<number, PurchasedAppSlot | undefined>

export type PurchasedAppRegistryRef = {
  current: PurchasedAppRegistry
}

export type PurchaseHistoryStatus = "loading" | "ready" | "empty" | "error" | "unauthenticated"
