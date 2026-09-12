import { useEffect, useRef, useState } from "scripting"
import { queryPurchaseHistory } from "../../../services/api"
import type { PurchaseHistoryStatus, PurchasedAppItem } from "../model/types"

type PurchaseHistoryState = {
  status: PurchaseHistoryStatus
  items: PurchasedAppItem[]
  country: string
  error: string
}

type RefreshReason = "account-change" | "pull"

const initialState: PurchaseHistoryState = {
  status: "loading",
  items: [],
  country: "",
  error: "",
}

/** 仅在已购页面可见时加载当前账号的购买历史。 */
export function usePurchaseHistory(accountKey: string, isActive: boolean) {
  const [state, setState] = useState(initialState)
  const requestTokenRef = useRef(0)
  const loadedAccountRef = useRef("")

  const reload = async (reason: RefreshReason = "pull"): Promise<void> => {
    if (!isActive) return

    if (!accountKey) {
      requestTokenRef.current += 1
      withAnimation(() => setState({ ...initialState, status: "unauthenticated" }))
      return
    }

    const token = requestTokenRef.current + 1
    requestTokenRef.current = token
    if (reason === "account-change") {
      withAnimation(() => setState({ ...initialState }))
    }

    try {
      const result = await queryPurchaseHistory()
      if (requestTokenRef.current !== token) return
      loadedAccountRef.current = accountKey

      const nextStatus = result.apps.length ? "ready" : "empty"
      const unchanged = reason === "pull"
        && state.items.length === result.apps.length
      if (unchanged) return

      withAnimation(() => setState({
        status: nextStatus,
        items: result.apps,
        country: result.country,
        error: "",
      }))
    } catch (error) {
      if (requestTokenRef.current !== token) return
      if (reason === "pull") return
      const message = error instanceof Error ? error.message : String(error)
      withAnimation(() => setState({
        status: "error",
        items: [],
        country: "",
        error: message,
      }))
    }
  }

  useEffect(() => {
    if (!isActive) {
      requestTokenRef.current += 1
      return
    }

    if (!accountKey) {
      requestTokenRef.current += 1
      loadedAccountRef.current = ""
      if (state.status !== "unauthenticated") {
        withAnimation(() => setState({ ...initialState, status: "unauthenticated" }))
      }
      return
    }

    if (loadedAccountRef.current === accountKey) return

    reload("account-change")
    return () => {
      requestTokenRef.current += 1
    }
  }, [accountKey, isActive])

  return { ...state, reload }
}
