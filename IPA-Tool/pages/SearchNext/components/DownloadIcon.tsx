// File: pages/SearchNext/components/DownloadIcon.tsx
import {
  ZStack,
  Image,
  Gauge,
  useObservable,
  useEffect,
  useMemo,
  EmptyView,
  useState,
} from "scripting"
import { useAppsHook } from "../../../hooks"
import type { DownloadTaskState } from "../../../hooks/useAppsState"
import ProgressRing from "./ProgressRing"

interface DownloadIconProps {
  id: string
}

/**
 * ���度循环环动画组件
 */
const ProgressRingAnimation = () => {
  const deg = useObservable(0)
  const animation = useMemo(() => {
    return {
      rotationEffect: deg.value,
      animation: {
        animation: Animation.linear(1).repeatForever(false),
        value: deg.value,
      },
    }
  }, [deg.value])

  useEffect(() => {
    deg.setValue(360)
  }, [])

  return (
    <Gauge
      {...animation}
      tint="systemBlue"
      scaleEffect={0.41}
      label={<EmptyView />}
      gaugeStyle="accessoryCircularCapacity"
      value={0.75}
    />
  )
}

/**
 * 下载图标组件
 * 封装了带进度环的下载图标，使用固定配置
 */
const DownloadIcon = ({ id }: DownloadIconProps) => {
  const [appsState] = useAppsHook()
  const appState = (appsState?.[id] ?? {}) as DownloadTaskState
  const nextStatus = appState.status ?? "pending"
  const [status, setStatus] = useState(nextStatus)

  useEffect(() => {
    withAnimation(() => setStatus(nextStatus))
  }, [nextStatus])

  const isHidden = /queued|fetching|downloading|cancelled/.test(status)
  const isFetching = status === "fetching"
  const isPaused = /queued|cancelled/.test(status)

  return (
    <ZStack
      frame={{ width: 15, height: 15 }}
      padding={{ trailing: 10, leading: 0, vertical: 0 }}>

      {
        isHidden && <ProgressRing scaleEffect={1.1} id={id} status={status} contentTransition="symbolEffectAppear" />
      }

      {isFetching && <ProgressRingAnimation scaleEffect={1.1} contentTransition="symbolEffectAppear" />}

      {
        isFetching || <Image
          systemName={isHidden ? (isPaused ? "play.fill" : "pause.fill") : "icloud.and.arrow.down"}
          scaleEffect={isHidden ? 0.6 : 1.3}
          tint="systemBlue"
          contentTransition="symbolEffect"
          symbolEffect={{ effect: "bounce", value: status }}
        />
      }

    </ZStack>
  )
}

export default DownloadIcon
