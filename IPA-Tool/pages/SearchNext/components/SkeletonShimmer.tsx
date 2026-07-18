import { GeometryReader, Rectangle, ZStack, useColorScheme, useEffect, useMemo, useObservable } from "scripting"

export type SkeletonShimmerDelay = number | PromiseLike<void>

interface Props {
  duration?: number
  bandWidth?: number
  angle?: number
  cornerRadius?: number
  initialDelay?: SkeletonShimmerDelay
}

interface ShimmerLightProps {
  width: number
  height: number
  duration: number
  bandWidth: number
  angle: number
  initialDelay: SkeletonShimmerDelay
}

function resolveDelay(delay: number): Promise<void>
function resolveDelay(delay: PromiseLike<void>): PromiseLike<void>
function resolveDelay(delay: SkeletonShimmerDelay): Promise<void> | PromiseLike<void>
function resolveDelay(delay: SkeletonShimmerDelay) {
  return typeof delay === "number"
    ? new Promise<void>(resolve => setTimeout(resolve, delay))
    : delay
}

const getShimmerGeometry = (
  containerWidth: number,
  containerHeight: number,
  bandWidth: number,
  angle: number,
) => {
  const radians = Math.abs(angle) * Math.PI / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)
  const highlightHeight = Math.sqrt(
    containerWidth * containerWidth + containerHeight * containerHeight,
  )
  const projectedWidth = bandWidth * cos + highlightHeight * sin
  const startX = (containerWidth + projectedWidth) / 2
  const endX = -startX

  return {
    startX,
    endX,
    highlightHeight,
  }
}

function ShimmerLight({ width, height, duration, bandWidth, angle, initialDelay }: ShimmerLightProps) {
  const colorScheme = useColorScheme()
  const geometry = useMemo(() => {
    return getShimmerGeometry(width, height, bandWidth, angle)
  }, [angle, bandWidth, height, width])
  const x = useObservable(geometry.startX)

  const animation = useMemo(() => ({
    offset: { x: x.value, y: 0 },
    animation: {
      animation: Animation.linear(duration).repeatForever(false),
      value: x.value,
    },
  }), [duration, x.value])

  useEffect(() => {
    let cancelled = false

    Promise.resolve(resolveDelay(initialDelay)).then(() => {
      if (!cancelled) x.setValue(geometry.endX)
    })

    return () => {
      cancelled = true
    }
  }, [geometry.endX])

  const transparentColor = "rgba(255,255,255,0)" as const
  const highlightColor: "rgba(255,255,255,0.36)" | "rgba(150,158,168,0.18)" = colorScheme === "dark"
    ? "rgba(255,255,255,0.36)"
    : "rgba(150,158,168,0.18)"
  const highlightGradient = {
    stops: [
      { color: transparentColor, location: 0 },
      { color: highlightColor, location: 0.5 },
      { color: transparentColor, location: 1 },
    ],
    startPoint: "leading" as const,
    endPoint: "trailing" as const,
  }

  return (
    <ZStack frame={{ width, height }}>
      <Rectangle
        {...animation}
        fill={highlightGradient}
        frame={{ width: bandWidth, height: geometry.highlightHeight }}
        rotationEffect={angle}
      />
    </ZStack>
  )
}

export default function SkeletonShimmer({
  duration = 1.2,
  bandWidth = 72,
  angle = 45,
  cornerRadius = 17,
  initialDelay = 100,
}: Props) {
  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      clipShape={{
        type: "rect",
        cornerRadius,
        style: "continuous",
      }}
      clipped={true}
    >
      <GeometryReader>
        {(proxy) => (
          <ShimmerLight
            key={`${proxy.size.width}-${proxy.size.height}`}
            width={proxy.size.width}
            height={proxy.size.height}
            duration={duration}
            bandWidth={bandWidth}
            angle={angle}
            initialDelay={initialDelay}
          />
        )}
      </GeometryReader>
    </ZStack>
  )
}
