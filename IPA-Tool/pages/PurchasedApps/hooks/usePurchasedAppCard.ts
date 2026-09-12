import { useEffect, useRef, useState } from "scripting"
import type { AppSearchSuccess } from "../../../types/appStore"
import type {
  PurchasedAppRegistryRef,
  PurchasedAppRequest,
  PurchasedAppSlot,
} from "../model/types"

type UsePurchasedAppCardOptions = {
  appId: string
  country: string
  index: number
  registryRef: PurchasedAppRegistryRef
}

/** 管理单张卡片的临时展示数据，不修改购买历史列表。 */
export function usePurchasedAppCard({
  appId,
  country,
  index,
  registryRef,
}: UsePurchasedAppCardOptions) {
  const [app, setApp] = useState<AppSearchSuccess | null>(null)
  const appRef = useRef<AppSearchSuccess | null>(null)
  const requestRef = useRef<PurchasedAppRequest | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 清理当前卡片的完整接口数据，只保留 appId 和 country。 */
  const clearApp = () => {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    renderTimerRef.current = null
    appRef.current = null
    setApp(null)
  }

  const accept = (request: PurchasedAppRequest) => {
    if (request.appId !== appId || request.country !== country) return
    if (appRef.current || requestRef.current === request) return

    requestRef.current = request
    request.promise
      .then(data => {
        if (!data || request.cancelled || requestRef.current !== request) {
          return
        }

        requestRef.current = null
        appRef.current = data
        const slot = registryRef.current[index]
        if (slot?.appId === appId && slot.country === country) {
          slot.loaded = true
        }
        renderTimerRef.current = setTimeout(() => {
          renderTimerRef.current = null
          if (appRef.current !== data) return
          withAnimation(() => setApp(data))
        }, 0)
      })
      .catch(() => {
        if (requestRef.current === request) requestRef.current = null
      })
  }

  useEffect(() => {
    clearApp()

    const current = registryRef.current[index]
    const slot: PurchasedAppSlot = (
      current?.appId === appId && current.country === country
    ) ? current : {
      appId,
      country,
      active: false,
      loaded: false,
    }

    if (slot !== current) current?.request?.cancel()
    registryRef.current[index] = slot
    slot.accept = accept

    if (slot.request) accept(slot.request)
    else if (slot.active && !slot.loaded) slot.start?.()

    return () => {
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
      
      renderTimerRef.current = null
      requestRef.current = null
      slot.loaded = false
      
      if (slot.accept === accept) delete slot.accept
      if (!slot.active) delete registryRef.current[index]
    }
  }, [appId, country, index, registryRef])

  return app
}
