import { useEffect, useObservable, useRef, useState } from "scripting";
import { useAuth } from "../../../hooks";
import { apiSearchApp, apiSearchAppById, appIdSearchAbort, searchAppIdAbort } from "../../../services/api";
import { storeIdToCode } from "../../../utils/countries";
import {
  createErrorResult,
  DEFAULT_SEARCH_COUNT,
  DEFAULT_SEARCH_TYPE,
  getErrorMessage,
  isAppIdQuery,
  toResultEntries,
  type SearchResultEntry,
} from "../model/searchModel";

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === "AbortError";
};

export const useSearchApps = () => {
  const { storeFront } = useAuth()?.authState ?? {};
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [storeRegion, setStoreRegion] = useState("CN");
  const [searchCount, setSearchCount] = useState(DEFAULT_SEARCH_COUNT);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSearchPresented, setIsSearchPresented] = useState(false);
  const resultItems = useObservable<SearchResultEntry[]>([]);
  const searchTokenRef = useRef(0);

  const cancelSearch = () => {
    searchAppIdAbort.current();
    appIdSearchAbort.current();
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

    const isAppIdSearch = isAppIdQuery(nextQuery);

    const searchToken = cancelSearch();
    setSubmittedQuery(nextQuery);
    setLoading(`搜索中-${searchToken}`);
    resultItems.setValue([]);

    try {
      const nextResults = isAppIdSearch
        ? await apiSearchAppById(nextQuery, storeRegion)
        : await apiSearchApp({
            term: nextQuery,
            country: storeRegion,
            entity: DEFAULT_SEARCH_TYPE,
            limit: searchCount,
          });

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
      if (isAbortError(error)) {
        await withAnimation(() => {
          resultItems.setValue([]);
        });
        return [];
      }
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
    if (storeFront) setStoreRegion(storeIdToCode(storeFront) ?? "CN");
  }, [storeFront]);

  return {
    query,
    setQuery,
    submittedQuery,
    storeRegion,
    setStoreRegion,
    searchCount,
    setSearchCount,
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
