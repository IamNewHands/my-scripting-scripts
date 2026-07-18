import { useEffect, useRef, useState } from "scripting"
import { type Entry, searchHistory } from "../store/searchHistoryStore"

export const useChartData = (items: Entry[], isSearchPresented: boolean) => {
  const [chartItems, setChartItems] = useState<Entry[]>(searchHistory.getAll())
  const snapshotRef = useRef<Entry[]>()
  const initRef = useRef(true)

  useEffect(() => {
    if (initRef.current) {
      initRef.current = false
      return
    }

    if (isSearchPresented) return
    if (items === snapshotRef.current) return

    const timer = setTimeout(() => {
      snapshotRef.current = items
      withAnimation(() => setChartItems(items))
    }, 300)

    return () => clearTimeout(timer)
  }, [items, isSearchPresented])

  return chartItems
}
