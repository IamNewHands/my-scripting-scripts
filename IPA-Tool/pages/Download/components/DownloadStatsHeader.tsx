import { HStack, VStack, useMemo, useRef } from "scripting"
import { AnimText } from "../../../components/AnimText"
import { AnimTextGlassBadge } from "../../../components/GlassBadge"
import type { MergedItem } from "../hooks/useDownloadItems"

const TITLE_FONT_SIZE = 14
const META_FONT_SIZE = 12

const completedKey = (item: MergedItem) => item.appKey

type DownloadStatsHeaderProps = {
  items: Observable<MergedItem[]>
}

export function DownloadStatsHeader({ items }: DownloadStatsHeaderProps) {
  const initialized = useRef(false)
  const initialCompletedIds = useRef(new Set<string>())
  const taskStatuses = useRef(new Map<string, string>())
  const value = items.value
  const key = value.map(item => `${item.id}:${item.source}:${item.status}`).join(",")
  const stats = value.reduce(
    (value, item) => ({
      total: value.total + 1,
      downloading: value.downloading + (item.status === "downloading" ? 1 : 0),
      completed: value.completed + (item.status === "completed" ? 1 : 0),
      cancelled: value.cancelled + (item.status === "cancelled" ? 1 : 0),
      queued: value.queued + (item.status === "queued" ? 1 : 0),
      failed: value.failed + (item.status === "failed" ? 1 : 0),
      hasTaskCompleted: value.hasTaskCompleted || (item.source === "task" && item.status === "completed"),
    }),
    { total: 0, downloading: 0, completed: 0, cancelled: 0, queued: 0, failed: 0, hasTaskCompleted: false }
  )

  value.forEach(item => {
    const itemKey = completedKey(item)
    const previousStatus = taskStatuses.current.get(itemKey)
    const isNewTaskCompleted = item.source === "task" && item.status === "completed" && previousStatus && previousStatus !== "completed"

    isNewTaskCompleted && (initialized.current = true)
    item.status === "completed" && !initialized.current && initialCompletedIds.current.add(itemKey)
    item.source === "task" && taskStatuses.current.set(itemKey, item.status)
  })

  return useMemo(() => {
    const completed = Math.max(stats.completed - initialCompletedIds.current.size, 0)

    return (
      <VStack alignment="leading" spacing={8}>
        <AnimText font={TITLE_FONT_SIZE} fontWeight="regular" foregroundStyle="label">
          应用列表
        </AnimText>

        <HStack spacing={6}>
          {!!stats.total && (
            <AnimTextGlassBadge font={META_FONT_SIZE} fontWeight="medium">
              共{stats.total}项
            </AnimTextGlassBadge>
          )}

          {stats.downloading > 0 && (
            <AnimTextGlassBadge style="info" showDot font={META_FONT_SIZE} fontWeight="medium" anim="numericTextCountsUp">
              下载中 {stats.downloading}
            </AnimTextGlassBadge>
          )}

          {completed > 0 && (
            <AnimTextGlassBadge style="success" showDot font={META_FONT_SIZE} fontWeight="medium" anim="numericTextCountsUp">
              已完成 {completed}
            </AnimTextGlassBadge>
          )}

          {stats.cancelled > 0 && (
            <AnimTextGlassBadge style="teal" showDot font={META_FONT_SIZE} fontWeight="medium" anim="numericTextCountsUp">
              已暂停 {stats.cancelled}
            </AnimTextGlassBadge>
          )}

          {stats.queued > 0 && (
            <AnimTextGlassBadge style="warning" showDot font={META_FONT_SIZE} fontWeight="medium" anim="numericTextCountsUp">
              排队中 {stats.queued}
            </AnimTextGlassBadge>
          )}

          {stats.failed > 0 && (
            <AnimTextGlassBadge style="error" showDot font={META_FONT_SIZE} fontWeight="medium" anim="numericTextCountsUp">
              失败 {stats.failed}
            </AnimTextGlassBadge>
          )}
        </HStack>
      </VStack>
    )
  }, [key])
}
