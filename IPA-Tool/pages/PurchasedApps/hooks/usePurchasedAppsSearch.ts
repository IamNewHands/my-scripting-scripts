import { useEffect, useState } from "scripting"
import { findAppCardCacheIdsByName } from "../../../modules/AppCardCacheDB"
import type { PurchasedAppItem } from "../model/types"

const matchesHistoryFields = (item: PurchasedAppItem, keyword: string) => {
  return item.id.includes(keyword)
    || item.name.toLocaleLowerCase().includes(keyword)
    || item.bundleID.toLocaleLowerCase().includes(keyword)
    || item.version.toLocaleLowerCase().includes(keyword)
}

/** 按历史字段和当前国家的本地化卡片名称过滤购买记录。 */
export function usePurchasedAppsSearch(items: PurchasedAppItem[], country: string) {
  const [query, setQueryState] = useState("")
  const [keyword, setKeyword] = useState("")
  const [isPresented, setIsPresented] = useState(false)
  const [filteredItems, setFilteredItems] = useState<PurchasedAppItem[]>(items)

  const reset = () => {
    setQueryState("")
    setKeyword("")
  }

  const setQuery = (value: string) => {
    setQueryState(value)
    if (!value.trim()) setKeyword("")
  }

  const submit = () => {
    setKeyword(query.trim().toLocaleLowerCase())
  }

  const setPresented = (presented: boolean) => {
    setIsPresented(presented)
    if (!presented) reset()
  }

  useEffect(() => {
    if (!keyword) {
      withAnimation(() => setFilteredItems(items))
      return
    }

    let cancelled = false
    const historyMatches = new Set(
      items.filter(item => matchesHistoryFields(item, keyword)).map(item => item.id),
    )

    Promise.try(async () => {
      const cachedNameMatches = await findAppCardCacheIdsByName(keyword, country)
      if (cancelled) return

      const matchingIds = new Set([...historyMatches, ...cachedNameMatches])
      const nextItems = items.filter(item => matchingIds.has(item.id))
      withAnimation(() => setFilteredItems(nextItems))
    }).catch(() => {
      if (cancelled) return
      const nextItems = items.filter(item => historyMatches.has(item.id))
      withAnimation(() => setFilteredItems(nextItems))
    })

    return () => {
      cancelled = true
    }
  }, [items, keyword, country])

  return {
    query,
    setQuery,
    submit,
    isPresented,
    setPresented,
    items: filteredItems,
  }
}
