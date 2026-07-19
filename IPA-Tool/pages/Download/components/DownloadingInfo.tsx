import { HStack, Spacer, VStack } from "scripting"
import type { MergedItem } from "../hooks/useDownloadItems"
import DownloadProgress from "./DownloadProgressBar"
import { AnimText } from "../../../components/AnimText"
import type { RGBAColor } from "../../../types/utils"

export default function DownloadingInfo({ item, dominantColor }: { item: MergedItem, dominantColor?: RGBAColor | null }) {
  const status = item.status

  return (
    <VStack spacing={4} padding={{ horizontal: -25 }} alignment="leading">
      <HStack spacing={4}>
        <AnimText font="body" truncationMode="tail"
        lineLimit={1} fontWeight="regular">{item.name}</AnimText>
        <AnimText font="footnote" fontWeight="regular" foregroundStyle="tertiaryLabel">v{item.displayVersion}</AnimText>
        <Spacer />
      </HStack>
      {status !== "queued" && <DownloadProgress id={item.appId} status={status} dominantColor={dominantColor} />}
      {item.accountEmail ? (
        <AnimText font="footnote" foregroundStyle="tertiaryLabel" truncationMode="tail" lineLimit={1}>
          账号 {item.accountEmail}
        </AnimText>
      ) : undefined}
   </VStack>
  )
}
