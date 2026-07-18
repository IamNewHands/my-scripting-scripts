import { HStack, Spacer, useMemo } from "scripting"
import type { MergedItem } from "../hooks/useDownloadItems"
import { AppConfig } from "../../../constants/AppConfig"
import { makeAppIconRowStyleProps, useCachedAppIcon } from "../../../hooks"
import AppIcon from "./AppIcon"
import DownloadingInfo from "./DownloadingInfo"
import CompletedInfo from "./CompletedInfo"
import PlayPauseButton from "./PlayPauseButton"

export default function DownloadRow({ item }: { item: MergedItem }) {
  const isCompleted = item.status === "completed"
  const appIconAccent = AppConfig.appearance.appIconAccent
  const iconUrl = item.icon?.startsWith("http") ? item.icon : null
  const appIcon = useCachedAppIcon(iconUrl)
  const dominantColor = appIconAccent ? appIcon.dominantColor : null
  const rowStyleProps = dominantColor ? makeAppIconRowStyleProps(dominantColor) : {}

  return useMemo(() => (
    <HStack spacing={16} {...rowStyleProps}>
      <AppIcon icon={item.icon} appIcon={appIcon} />
      <Spacer />
      {isCompleted
        ? <CompletedInfo item={item} />
        : <DownloadingInfo item={item} dominantColor={dominantColor} />
      }
      <Spacer />
      <PlayPauseButton item={item} dominantColor={dominantColor} />
    </HStack>
  ), [item.status, item.id, item.icon, appIconAccent, appIcon.image, appIcon.fallbackToUrl, dominantColor?.hex])
}
