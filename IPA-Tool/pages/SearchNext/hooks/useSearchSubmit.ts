import { createLoadingEntries, isAppIdQuery, MAX_ANIMATED_SKELETONS, MAX_SKELETON_COUNT, SKELETON_INTERVAL_MS, type SearchResultEntry } from "../model/searchModel"
import type { useSearchApps } from "./useSearchApps"

interface ResultList {
  data: { add: (entry: SearchResultEntry | SearchResultEntry[]) => Promise<void> }
}

interface Props {
  search: ReturnType<typeof useSearchApps>
  resultList: ResultList
  skeletonAddPromiseRef: { current: Promise<void>[] }
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const useSearchSubmit = ({ search, resultList, skeletonAddPromiseRef }: Props) => {
  const startSkeletonLoading = async (query: string, requestToken: number): Promise<void> => {
    let count = !query ? 0 : isAppIdQuery(query) ? 1 : search.searchCount
    if (count === 0) return
    if (count > MAX_SKELETON_COUNT) count = MAX_SKELETON_COUNT

    const loadingEntries = createLoadingEntries(`submit-${requestToken}`, count)
    skeletonAddPromiseRef.current = []

    const addPromises: Promise<void>[] = []
    const animatedCount = Math.min(count, MAX_ANIMATED_SKELETONS)

    for (let index = 0; index < animatedCount; index += 1) {
      if (search.searchTokenRef.current !== requestToken) break

      const addPromise = resultList.data.add(loadingEntries[index])
      skeletonAddPromiseRef.current[index] = addPromise
      addPromises.push(addPromise)

      if (index < animatedCount - 1) {
        await sleep(SKELETON_INTERVAL_MS)
      }
    }

    if (search.searchTokenRef.current === requestToken && count > animatedCount) {
      const remainingEntries = loadingEntries.slice(animatedCount)
      const addPromise = resultList.data.add(remainingEntries)
      remainingEntries.forEach((_, index) => {
        skeletonAddPromiseRef.current[animatedCount + index] = addPromise
      })
      addPromises.push(addPromise)
    }

    await Promise.all(addPromises)
  }

  const handleSubmitSearch = (query?: string) => {
    const nextQuery = (query ?? search.query).trim()

    if (!nextQuery || search.searchCount === 0) {
      search.cancelSearch()
      return
    }

    if (nextQuery === search.submittedQuery) return

    const searchPromise = search.runSearch(nextQuery, true)
    const requestToken = search.searchTokenRef.current
    const skeletonPromise = startSkeletonLoading(nextQuery, requestToken)

    Promise.all([searchPromise, skeletonPromise]).then(([results]) => {
      if (search.searchTokenRef.current !== requestToken) return
      setTimeout(() => {
        if (search.searchTokenRef.current !== requestToken) return
        search.applyResults(results)
      }, 600)
    })
  }

  return { handleSubmitSearch }
}
