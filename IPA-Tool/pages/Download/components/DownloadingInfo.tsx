import { HStack, Spacer, VStack } from "scripting"
import type { MergedItem } from "../hooks/useDownloadItems"
import DownloadProgress from "./DownloadProgressBar"
import { AnimText } from "../../../components/AnimText"

export default function DownloadingInfo({ item, dominantColors }: { item: MergedItem, dominantColors?: RGBAColor[] }) {
  const status = item.status

  return (
    <VStack spacing={4} padding={{ horizontal: -25 }} alignment="leading">
      <HStack spacing={4}>
        <AnimText font="body" truncationMode="tail"
        lineLimit={1} fontWeight="regular">{item.name}</AnimText>
        <AnimText font="footnote" fontWeight="regular" foregroundStyle="tertiaryLabel">v{item.displayVersion}</AnimText>
        <Spacer />
      </HStack>
      {status !== "queued" && (
        <DownloadProgress
          id={item.appId}
          status={status}
          errorMessage={item.errorMessage}
          dominantColors={dominantColors}
        />
      )}
      {item.accountEmail ? (
        <AnimText font="footnote" foregroundStyle="tertiaryLabel" truncationMode="tail" lineLimit={1}>
          账号 {item.accountEmail}
        </AnimText>
      ) : undefined}
   </VStack>
  )
}
