import { NavigationStack, ZStack, useMemo, useState, HStack } from "scripting"
import AppVersionList from "../../components/AppVersionList"
import MinimizeButton from "../../components/MinimizeButton"
import CloseScriptButton from "../../components/CloseScriptButton"
import { PageBackground } from "../../components/EditableGlassListPipeline"
import { PLATFORM, type Store } from "../../constants/Platform"
import { useAuth } from "../../hooks"
import { useAppVersionSelection } from "../SearchNext/store/useAppVersionSelection"
import QuickSwitchAccountMenu from "../SearchNext/components/QuickSwitchAccountMenu"
import type { AppSearchSuccess } from "../../types/appStore"
import PurchasedAppsList from "./components/PurchasedAppsList"
import PurchasedAppsStateView from "./components/PurchasedAppsStateView"
import PurchasedDateMenu from "./components/PurchasedDateMenu"
import { usePurchaseHistory } from "./hooks/usePurchaseHistory"
import { usePurchasedAppsSearch } from "./hooks/usePurchasedAppsSearch"
import { usePurchasedAppsVisibility } from "./hooks/usePurchasedAppsVisibility"
import { createPurchasedDateOptions } from "./model/purchasedDateOptions"

type PurchasedAppsViewProps = {
  isActive: boolean
}

/** 已购 App 页面，组合购买历史、可视加载、下载和历史版本功能。 */
export default function PurchasedAppsView({ isActive }: PurchasedAppsViewProps) {
  const { authState } = useAuth()
  const accountKey = authState.isLoggedIn ? authState.account : ""
  const history = usePurchaseHistory(accountKey, isActive)
  const search = usePurchasedAppsSearch(history.items, history.country)
  const visibility = usePurchasedAppsVisibility(search.items, history.country)
  const [versionApp, setVersionApp] = useState<AppSearchSuccess | null>(null)
  const [, setSelectedVersion] = useAppVersionSelection()
  const store = useMemo<Store>(() => ({
    platform: PLATFORM.IOS,
    country: history.country,
  }), [history.country])
  const dateOptions = useMemo(
    () => createPurchasedDateOptions(search.items),
    [search.items],
  )

  const versionSheet = versionApp ? {
    isPresented: true,
    onChanged: (presented: boolean) => {
      if (!presented) setVersionApp(null)
    },
    content: (
      <AppVersionList
        presentationDragIndicator="visible"
        presentationDetents={[700]}
        id={versionApp.id}
        name={versionApp.name}
        store={store}
        callback={(id, item) => {
          setSelectedVersion([id, store.platform, item])
        }}
      />
    ),
  } : undefined

  return (
    <NavigationStack>
      <ZStack
        navigationTitle="已购APP"
        navigationBarTitleDisplayMode="large"
        sheet={versionSheet}
        toolbar={{
          topBarLeading: (
            <HStack spacing={15}>
              <MinimizeButton />
              <CloseScriptButton />
            </HStack>
          ),
          principal: (
            <PurchasedDateMenu options={dateOptions} />
          ),
          topBarTrailing: <QuickSwitchAccountMenu />,
        }}
      >
        <PageBackground />
        <PurchasedAppsList
          items={history.status === "ready" ? search.items : []}
          store={store}
          registryRef={visibility.registryRef}
          query={search.query}
          isSearchPresented={search.isPresented}
          onQueryChange={search.setQuery}
          onSearchSubmit={search.submit}
          onSearchPresentedChange={search.setPresented}
          onVisibilityChange={visibility.onVisibilityChange}
          onOpenHistory={setVersionApp}
          onRefresh={() => history.reload("pull")}
        />
        {history.status !== "ready" ? (
          <PurchasedAppsStateView
            status={history.status}
            error={history.error}
            onRetry={() => history.reload("account-change")}
          />
        ) : null}
      </ZStack>
    </NavigationStack>
  )
}
