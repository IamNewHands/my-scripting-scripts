import { useCallback, useEffect, useState } from "scripting"
import { searchHistory, type Entry } from "../store/searchHistoryStore"

export const useSearchHistory = (submittedQuery: string) => {
  const [items, setItems] = useState<Entry[]>([])

  // 初始化加载
  useEffect(() => {
    setItems(searchHistory.getAll())
  }, [])

  // 搜索提交后自动同步
  useEffect(() => {
    if (!submittedQuery) return

    withAnimation(() => {
      setTimeout(() => {
        setItems(searchHistory.add(submittedQuery))
      }, 0)
    })
  }, [submittedQuery])

  const remove = useCallback((query: string) => {
    withAnimation(() => setItems(searchHistory.remove(query)))
  }, [])

  const clear = useCallback(() => {
    withAnimation(() => setItems(searchHistory.clear()))
  }, [])

  return { items, remove, clear }
}
