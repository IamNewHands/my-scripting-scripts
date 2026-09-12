import { Button, HStack, Image, Rectangle, Spacer, Text, useMemo, VStack } from "scripting"
import type { Store } from "../constants/Platform"
import type { AppSearchResponse, AppSearchSuccess } from "../types/appStore"
import { isAppSearchSuccess } from "../types/appStore"
import { useAppVersionSelection } from "../pages/SearchNext/store/useAppVersionSelection"
import { formatSize } from "../utils"
import StarRating from "./StarRating"
import DownloadButton from "../pages/SearchNext/components/DownloadButton"
import { AppConfig } from "../constants/AppConfig"
import { store } from "../pages/SearchNext/hooks/useSearchApps"
import { PLATFORM } from "../constants/Platform"
import { openVersionSheet } from "../pages/SearchNext/store/useVersionSheet"
import { fontCaption, fontAppName, GlassTag } from "../pages/SearchNext/components/GlassTag"
import { useCachedAppIcon } from "../hooks"
import CachedAppIconImage from "../pages/SearchNext/components/CachedAppIconImage"

interface SearchResultRowProps {
  app: AppSearchResponse
  name?: string
  version?: string
  storeContext?: Store
  onHistoryTap?: (app: AppSearchSuccess) => void
  purchaseDate?: Date
}

const formatRatingCount = (count?: number) => {
  return count?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0"
}

const freePriceTint = "secondaryLabel"
const paidPriceTint = "systemOrange"

const formatPurchaseDate = (date?: Date) =>
  date ? date.toLocaleDateString("sv-SE") : undefined

export default function SearchResultRow({
  app,
  name,
  version: versionOverride,
  storeContext,
  onHistoryTap,
  purchaseDate,
}: SearchResultRowProps) {
  const [appVersionState] = useAppVersionSelection()
  const successApp = isAppSearchSuccess(app) ? app : undefined
  if (!successApp) {
    return (
      <HStack padding={true} spacing={16} >
        <Image
          systemName="exclamationmark.triangle"
          imageScale="large"
          foregroundStyle={paidPriceTint}
          frame={{ width: 80, height: 80 }}
        />
        <VStack alignment="leading" spacing={4}>
          <Text {...fontAppName}>{app.name}</Text>
          <Text {...fontCaption} foregroundStyle={freePriceTint}>
            {app.description}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    )
  }

  const appIconAccent = AppConfig.appearance.appIconAccent
  const appIcon = useCachedAppIcon(successApp.icon)
  const activeStore = storeContext ?? store
  const platform = activeStore.platform
  const selectedVersion = appVersionState[successApp.id]?.[platform]?.bestChoice
  const version = versionOverride ?? `${selectedVersion || successApp.version}`
  const size = useMemo(() => formatSize(successApp.size), [successApp.size])
  const priceTint = successApp.price === "Free" ? freePriceTint : paidPriceTint
  const ratingCount = useMemo(() => formatRatingCount(successApp.userRatingCount), [successApp.userRatingCount])

  const handleVersionTap = () => {
    if (onHistoryTap) {
      onHistoryTap(successApp)
      return
    }
    openVersionSheet.current?.(successApp)
  }

  const displayName = name ?? successApp.name
  const displayPurchaseDate = formatPurchaseDate(purchaseDate)

  return (
    <VStack
      alignment="leading"
      padding={true}
      spacing={8}
      background={appIconAccent ? appIcon.background : undefined}
    >
      <HStack spacing={8}>
        <Text {...fontAppName} truncationMode="tail" lineLimit={1}>
          {displayName}
        </Text>
        <Spacer />
        {displayPurchaseDate ? (
          <Text {...fontCaption} foregroundStyle={freePriceTint}>
            {displayPurchaseDate}
          </Text>
        ) : null}
        <Button action={handleVersionTap} buttonStyle="plain"
          transition={Transition.opacity()}
        >
          <>
            <Text
              {...fontCaption}
            >{activeStore.platform === PLATFORM.TV ? "TV历史" : "历史"}</Text>
            <Image
              systemName="chevron.right"
              imageScale="small"
            />
          </>
        </Button>
      </HStack>

      <Rectangle
        fill={{ light: "systemGray3", dark: "systemGray2" }}
        frame={{ height: 0.8, maxWidth: "infinity" }}
        opacity={0.7}
      />

      <HStack spacing={16}>
        <HStack padding={{ trailing: -20 }}>
          <CachedAppIconImage
            icon={appIcon}
            iconUrl={successApp.icon}
            resizable={true}
            frame={{ width: 80, height: 80 }}
            clipShape={{
              type: "rect",
              cornerRadius: 17,
              style: "continuous",
            }}
          />
          <VStack alignment="leading" spacing={4}>
            <HStack spacing={4}>
              <GlassTag foregroundStyle={priceTint}>
                {`${successApp.price}`}
              </GlassTag>
              <GlassTag>{successApp.category ?? ""}</GlassTag>
            </HStack>
            <HStack spacing={4}>
              <GlassTag>{version}</GlassTag>
              <GlassTag>{size}</GlassTag>
            </HStack>
            <HStack spacing={4}>
              <StarRating score={successApp.averageUserRating || 0} size="medium" />
              <Text {...fontCaption} foregroundStyle={freePriceTint}>
                ({ratingCount})
              </Text>
            </HStack>
          </VStack>
        </HStack>

        <Spacer />

        <DownloadButton app={successApp} />

      </HStack>
    </VStack>
  )
}
