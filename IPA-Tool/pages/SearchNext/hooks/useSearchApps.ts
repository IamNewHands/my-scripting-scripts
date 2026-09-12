import { useEffect, useObservable, useRef, useState } from "scripting";
import { apiSearch, searchAbort } from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";
import { PLATFORM, DEFAULT_STORE_REGION, type Store } from "../../../constants/Platform";
import { storeIdToCode } from "../../../utils/countries";
import {
  createErrorResult,
  DEFAULT_SEARCH_COUNT,
  DEFAULT_SEARCH_ENTITY,
  isTvSearchEntity,
  type SearchEntity,
  parseSearchQuery,
  getErrorMessage,
  toResultEntries,
  type SearchResultEntry,
} from "../model/searchModel";

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === "AbortError";
};

/** 当前 SearchNext 页面使用的 App Store 上下文。 */
export const store: Store = {
  platform: PLATFORM.IOS,
  country: DEFAULT_STORE_REGION,
}

export const useSearchApps = () => {
  const { authState } = useAuth();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [storeRegion, setStoreRegion] = useState(DEFAULT_STORE_REGION);
  const [searchCount, setSearchCount] = useState(DEFAULT_SEARCH_COUNT);
  const [searchEntity, setSearchEntity] = useState<SearchEntity>(DEFAULT_SEARCH_ENTITY);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSearchPresented, setIsSearchPresented] = useState(false);
  const resultItems = useObservable<SearchResultEntry[]>([]);
  const searchTokenRef = useRef(0);

  const cancelSearch = () => {
    searchAbort.current();
    searchTokenRef.current += 1;
    return searchTokenRef.current;
  };

  const clearResults = () => {
    cancelSearch();
    setSubmittedQuery("");
    setLoading(null);
    resultItems.setValue([]);
  };

  const handleSearchPresentedChange = (presented: boolean) => {
    withAnimation(() => {
      setIsSearchPresented(presented);
      if (!presented) {
        setQuery("");
        clearResults();
      }
    })
  };

  const applyResults = (entries: SearchResultEntry[]) => {
    withAnimation(() => {
      setLoading(null)
      resultItems.setValue(entries);
    })
  }

  const runSearch = async (rawQuery = query, skipRender?: boolean): Promise<SearchResultEntry[]> => {
    const nextQuery = rawQuery.trim();
    if (!nextQuery || searchCount === 0) {
      resultItems.setValue([]);
      setSubmittedQuery("");
      return [];
    }

    const parsedQuery = parseSearchQuery(nextQuery);
    const searchToken = cancelSearch();
    setSubmittedQuery(nextQuery);
    setLoading(`搜索中-${searchToken}`);
    resultItems.setValue([]);

    try {
      const nextResults = await apiSearch(
        parsedQuery,
        {
          store,
          country: store.country,
          entity: searchEntity,
          limit: searchCount,
        },
      )

      if (searchToken !== searchTokenRef.current) return [];

      const normalizedResults = nextResults.length
        ? nextResults
        : createErrorResult("请检查搜索内容是否正确");
      const entries = toResultEntries(normalizedResults);

      if (skipRender) {
        return entries;
      }

      await withAnimation(() => {
        resultItems.setValue(entries);
      });
    } catch (error) {
      if (isAbortError(error)) return [];
      if (searchToken !== searchTokenRef.current) return [];

      const entries = toResultEntries(createErrorResult(getErrorMessage(error)));

      if (skipRender) {
        return entries;
      }

      await withAnimation(() => {
        resultItems.setValue(entries);
      });
    } finally {
      if (searchToken === searchTokenRef.current && !skipRender) setLoading(null);
    }
    return [];
  };

  useEffect(() => {
    const country = storeIdToCode(authState.storeFront);
    if (country) setStoreRegion(country);
  }, [authState.storeFront]);

  useEffect(() => {
    store.platform = isTvSearchEntity(searchEntity) ? PLATFORM.TV : PLATFORM.IOS;
    store.country = storeRegion;
  }, [searchEntity, storeRegion]);

  return {
    query,
    setQuery,
    submittedQuery,
    storeRegion,
    setStoreRegion,
    searchCount,
    setSearchCount,
    searchEntity,
    setSearchEntity,
    loading,
    setLoading,
    isSearchPresented,
    handleSearchPresentedChange,
    resultItems,
    runSearch,
    applyResults,
    clearResults,
    cancelSearch,
    searchTokenRef,
  };
};
