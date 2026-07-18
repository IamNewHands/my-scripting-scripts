import { Button, HStack, Image, Rectangle, Spacer, Text, useMemo, VStack } from "scripting"
import type { AppSearchResponse } from "../../../types/appStore"
import { isAppSearchSuccess } from "../../../types/appStore"
import { formatSize } from "../../../utils"
import StarRating from "../../../components/StarRating"
import DownloadButton from "./DownloadButton"
import { AppConfig } from "../../../constants/AppConfig"
import { useAppVersionSelection } from "../store/useAppVersionSelection"
import { openVersionSheet } from "../store/useVersionSheet"
import { fontCaption, fontAppName, GlassTag } from "./GlassTag"
import { useCachedAppIcon } from "../../../hooks"
import CachedAppIconImage from "./CachedAppIconImage"

interface SearchResultRowProps {
  app: AppSearchResponse
}

const formatRatingCount = (count?: number) => {
  return count?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0"
}

const freePriceTint = "secondaryLabel"
const paidPriceTint = "systemOrange"

export default function SearchResultRow({ app }: SearchResultRowProps) {
  const [appVersionState] = useAppVersionSelection()
  const successApp = isAppSearchSuccess(app) ? app : undefined
  if (!successApp) {
    return (
      <HStack spacing={16}>
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
  const selectedVersion = appVersionState[successApp.id]?.bestChoice
  const version = `${selectedVersion || successApp.version}`
  const size = useMemo(() => formatSize(successApp.size), [successApp.size])
  const priceTint = successApp.price === "Free" ? freePriceTint : paidPriceTint
  const ratingCount = useMemo(() => formatRatingCount(successApp.userRatingCount), [successApp.userRatingCount])

  const handleVersionTap = () => {
    openVersionSheet.current?.(successApp)
  }

  return (
    <VStack
      alignment="leading"
      spacing={8}
      clipped={true}
      {...(appIconAccent ? appIcon.rowStyleProps : {})}
    >
      <HStack spacing={8}>
        <Text {...fontAppName} truncationMode="tail" lineLimit={1}>
          {successApp.name}
        </Text>
        <Spacer />
        <Button action={handleVersionTap} buttonStyle="plain"
          transition={Transition.opacity()}
        >
          <>
            <Text
              {...fontCaption}
            >历史</Text>
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
