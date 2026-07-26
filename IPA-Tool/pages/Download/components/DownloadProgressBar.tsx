import { EmptyView, HStack, ProgressView, Spacer, useRef } from "scripting"
import { makeAppIconColor } from "../../../hooks"
import { useProgress } from "../../../hooks/useAppsState"
import { formatSize } from "../../../utils"
import { AnimText } from "../../../components/AnimText"
import type { RGBAColor } from "../../../types/utils"

const tintColor = (color?: RGBAColor | null) => color ? makeAppIconColor(color) : undefined

export default function DownloadProgress({ id , status, dominantColor }: { id: string, status: string, dominantColor?: RGBAColor | null }) {
  const progress = useProgress(id, status)
  const data = useRef({ time: Date.now(), size: 0, speed: "0B/s" })

  if (!progress) return <EmptyView />
  const { downloaded, total } = progress
  const diff = Date.now() - data.current.time
  if (status !== "downloading") {
    data.current.speed = "0B/s"
  } else if (diff >= 1000) {
    data.current.speed = `${formatSize(
      ((downloaded - data.current.size) / diff) * 1000
    )}/s`
    data.current.time = Date.now()
    data.current.size = downloaded
  }


  return (
    <ProgressView
      value={downloaded}
      total={total}
      title="任务进度"
      label={<EmptyView />}
      currentValueLabel={
        <HStack alignment={"center"}>
          {status === "failed" ? (
            <AnimText foregroundStyle={"systemRed"}>下载失败</AnimText>
          ) : (
            <>
              <AnimText anim="numericTextCountsUp">
                {formatSize(downloaded)} / {formatSize(total)}
              </AnimText>
              <Spacer />
              <AnimText anim="numericTextCountsUp">{data.current.speed}</AnimText>
            </>
          )}
        </HStack>
      }
      progressViewStyle="linear"
      tint={tintColor(dominantColor)}
    />
  )
}
