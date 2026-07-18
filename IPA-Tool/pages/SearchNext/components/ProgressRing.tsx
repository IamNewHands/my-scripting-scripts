import { EmptyView, Gauge } from "scripting"
import { useProgress } from "../../../hooks/useAppsState"

interface ProgressRingProps {
  id: string
  status?: string
}

export default function ProgressRing({ id, status }: ProgressRingProps) {
  const progress = useProgress(id, status)

  return (
    <Gauge
      tint="systemBlue"
      scaleEffect={0.41}
      label={<EmptyView />}
      gaugeStyle="accessoryCircularCapacity"
      value={progress?.percent ?? 0}
    />
  )
}
