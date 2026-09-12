import SearchResultRow from "../../../components/SearchResultRow"
import SearchSkeletonRow from "../../../components/SearchSkeletonRow"
import { RoundedRectangle } from "scripting"
import type { Store } from "../../../constants/Platform"
import type { AppSearchSuccess } from "../../../types/appStore"
import { usePurchasedAppCard } from "../hooks/usePurchasedAppCard"
import type { PurchasedAppRegistryRef } from "../model/types"

type PurchasedAppCardContentProps = {
  app: AppSearchSuccess | null
  name: string
  version: string
  purchaseDate?: Date
  targetId: string
  store: Store
  onOpenHistory: (app: AppSearchSuccess) => void
}

/** 根据卡片数据渲染骨架或完整搜索结果卡片。 */
function PurchasedAppCardContent({
  app,
  name,
  version,
  purchaseDate,
  targetId,
  store,
  onOpenHistory,
}: PurchasedAppCardContentProps) {
  return app ? (
    <SearchResultRow
      key={targetId}
      app={app}
      storeContext={store}
      onHistoryTap={onOpenHistory}
      purchaseDate={purchaseDate}
       
    />
  ) : (
    <SearchSkeletonRow
      key={targetId}
      name={name}
      version={version}
      date={purchaseDate}
       overlay={(
         <RoundedRectangle
           padding={-0.5}
           cornerRadius={16}
           stroke={{
             shapeStyle: {
               light: "rgba(255,255,255,0.56)",
               dark: "rgba(255,255,255,0.26)",
             },
             strokeStyle: { lineWidth: 0.5 },
           }}
         />
       )}
       
      
    />
  )
}

type PurchasedAppCardProps = {
  appId: string
  name: string
  version: string
  purchaseDate?: Date
  index: number
  store: Store
  registryRef: PurchasedAppRegistryRef
  onOpenHistory: (app: AppSearchSuccess) => void
}

/** 已购应用卡片容器，只负责连接卡片 Hook 与纯展示组件。 */
export default function PurchasedAppCard({
  appId,
  name,
  version,
  purchaseDate,
  index,
  store,
  registryRef,
  onOpenHistory,
}: PurchasedAppCardProps) {
  const app = usePurchasedAppCard({
    appId,
    country: store.country,
    index,
    registryRef,
  })

  return (
    <PurchasedAppCardContent
      app={app}
      name={name}
      version={version}
      purchaseDate={purchaseDate}
      targetId={String(index)}
      store={store}
      onOpenHistory={onOpenHistory}
    />
  )
}
