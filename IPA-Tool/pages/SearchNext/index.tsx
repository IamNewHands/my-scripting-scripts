import {
  Button,
  ContentUnavailableView,
  EmptyView,
  HStack,
  NavigationStack,
  Section,
  useRef,
  useState,
} from "scripting"
import {
  EditableGlassList,
  PageBackground,
  useEditableGlassList,
} from "../../components/EditableGlassListPipeline"
import CloseButton from "../../components/CloseButton"
import { onSearchShowToast } from "./store/toast"
import { useLoginToast, useDownload } from "../../hooks"
import RegionPicker from "./components/RegionPicker"
import SearchCountPicker from "./components/SearchCountPicker"
import QuickSwitchAccountMenu from "./components/QuickSwitchAccountMenu"
import SearchResultRow from "./components/SearchResultRow"
import SearchSkeletonRow from "./components/SearchSkeletonRow"
import SearchHistorySection from "./components/SearchHistorySection"
import SearchHistoryBarChart from "./components/SearchHistoryBarChart"
import AppVersionList from "../../components/AppVersionList"
import { useAppVersionSelection } from "./store/useAppVersionSelection"
import { openVersionSheet } from "./store/useVersionSheet"
import { useSearchApps } from "./hooks/useSearchApps"
import { useSearchHistory } from "./hooks/useSearchHistory"
import { useSearchSubmit } from "./hooks/useSearchSubmit"
import { useChartData } from "./hooks/useChartData"
import type { AppSearchSuccess } from "../../types/appStore"
import {
  SEARCH_RESULT_TYPE,
  SEARCH_SKELETON_TYPE,
  SKELETON_INTERVAL_MS,
  blockKeyboardOnce,
} from "./model/searchModel"
import SkeletonShimmer from "./components/SkeletonShimmer"


function SearchResultDeleteAction({ id }: { id: string }) {
  const { removeTask } = useDownload(id)
  return (
    <Button title="" systemImage="trash" tint="systemRed" action={removeTask} />
  )
}

export default function SearchNextView() {
  const { toastConfig, showToast } = useLoginToast()
  const skeletonAddPromiseRef = useRef<Promise<void>[]>([])
  const [versionApp, setVersionApp] = useState<AppSearchSuccess | null>(null)
  openVersionSheet.current = setVersionApp
  const [, AppVersionDispatch] = useAppVersionSelection()
  const search = useSearchApps()
  const history = useSearchHistory(search.submittedQuery)
  const resultList = useEditableGlassList(search.resultItems, {
    trailingSwipeActions: {
      allowsFullSwipe: false,
      actions: api =>
        api.item.type === SEARCH_RESULT_TYPE ? (
          <SearchResultDeleteAction id={api.item.id} />
        ) : undefined,
    },
  })

  const { handleSubmitSearch } = useSearchSubmit({
    search,
    resultList,
    skeletonAddPromiseRef,
  })
  const chartItems = useChartData(history.items, search.isSearchPresented)

  const handleQueryChange = (value: string) => {
    if (!value && search.isSearchPresented) {
      search.clearResults()
      search.setQuery("")
      return
    }
    search.setQuery(value)
  }

  const hasResults = search.resultItems.value.some(
    item => item.type === SEARCH_RESULT_TYPE
  )
  const hasSearchContent = hasResults || !!search.loading
  const hideSearchHistory = search.query.trim().length > 0 && hasSearchContent
  onSearchShowToast.run = showToast

  return (
    <NavigationStack>
      <EditableGlassList
        items={search.resultItems}
        overlay={
          !hasResults && !search.loading && history.items.length <= 2 ? (
            <ContentUnavailableView
              opacity={search.isSearchPresented ? 0.5 : 1}
              animation={{
                animation: Animation.easeOut(0.3),
                value: search.isSearchPresented,
              }}
              title="搜索应用"
              systemImage="magnifyingglass"
              description="输入应用名称或 ID 开始搜索"
            />
          ) : undefined
        }
        navigationTitle="App Store"
        background={<PageBackground />}
        sheet={
          versionApp
            ? {
              isPresented: true,
              onChanged: presented => {
                if (!presented) setVersionApp(null)
              },
              content: (
                <AppVersionList
                  presentationDragIndicator={"visible"}
                  presentationDetents={[700]}
                  id={versionApp.id}
                  name={versionApp.name}
                  callback={(id, item) => {
                    AppVersionDispatch([id, item])
                  }}
                />
              ),
            }
            : undefined
        }
        toast={toastConfig}

        searchable={{
          value: search.query,
          onChanged: handleQueryChange,
          prompt: "搜索 App 名称或 ID",
          presented: {
            value: search.isSearchPresented,
            onChanged: search.handleSearchPresentedChange,
          },
        }}
        onSubmit={{
          triggers: "search",
          action: handleSubmitSearch,
        }}

        toolbar={{
          topBarLeading: <CloseButton />,
          topBarTrailing: (
            <QuickSwitchAccountMenu />
          ),
        }}
      >
        <Section opacity={search.isSearchPresented ? 1 : 0}>
          {search.loading
            ? resultList.render(SEARCH_SKELETON_TYPE, (_, index) => {
              return (
                <SearchSkeletonRow
                  overlay={(
                    <SkeletonShimmer
                      cornerRadius={16}
                      initialDelay={skeletonAddPromiseRef.current[index] ?? SKELETON_INTERVAL_MS}
                    />
                  )}
                />
              )
            })
            : resultList.render(SEARCH_RESULT_TYPE, item => (
         
              SearchResultRow({app: item.app})
            ))}
        </Section>

        {!search.isSearchPresented ? (
          <HStack
            listRowBackground={<></>}
            listRowSeparator="hidden"
            spacing={20}
            padding={{ horizontal: 15, vertical: 4 }}
            glassEffect={{
              glass: UIGlass.clear().interactive(true),
              shape: "buttonBorder"
            }}
            shadow={{
              color: "rgba(72,88,120,0.3)",
              radius: 12,
              y: 5,
            }}
          >
            <RegionPicker
              value={search.storeRegion}
              label={search.storeRegion}
              onChanged={search.setStoreRegion}
            />

            <SearchCountPicker
              value={search.searchCount}
              onChanged={search.setSearchCount}
            />
          </HStack>
        ) : (
          <EmptyView />
        )}

        <SearchHistorySection
          hidden={hideSearchHistory}
          filterText={search.query}
          expanded={search.isSearchPresented}
          items={history.items}
          onTap={query => {
            blockKeyboardOnce()
            search.handleSearchPresentedChange(true)
            search.setLoading("搜索数据")
            search.setQuery(query)

            setTimeout(() => {
              handleSubmitSearch(query)
            }, 0)
          }}
          onDelete={history.remove}
          onClear={history.clear}
        />

        {
          search.isSearchPresented || search.loading ? <></>
            : <SearchHistoryBarChart
              items={chartItems}
            />
        }

      </EditableGlassList>
    </NavigationStack>
  )
}
