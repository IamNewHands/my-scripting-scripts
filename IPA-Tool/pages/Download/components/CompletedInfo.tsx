import { HStack, Spacer, VStack } from "scripting"
import type { MergedItem } from "../hooks/useDownloadItems"
import { getProgress } from "../../../hooks/useAppsState"
import { formatSize } from "../../../utils"
import { AnimText } from "../../../components/AnimText"

const detailTextProps = {
  font: "footnote" as const,
  foregroundStyle: "secondaryLabel" as const,
}

export default function CompletedInfo({ item }: { item: MergedItem }) {
  const size = item.size || (item.appId ? getProgress(item.appId)?.total : 0) || 0

  return (
    <VStack spacing={2} padding={{ leading: -25, trailing: -35 }} alignment="leading">
      <HStack spacing={4}>
        <AnimText font="body" fontWeight="regular" truncationMode="tail" lineLimit={1}>{item.name}</AnimText>
        <AnimText font="footnote" fontWeight="regular" foregroundStyle="tertiaryLabel">v{item.displayVersion}</AnimText>
        <Spacer />
      </HStack>
      <AnimText {...detailTextProps}>
        安装包 {formatSize(size)}
      </AnimText>
      {item.accountEmail ? (
        <AnimText {...detailTextProps} truncationMode="tail" lineLimit={1}>
          账号 {item.accountEmail}
        </AnimText>
      ) : undefined}
    </VStack>
  )
}
