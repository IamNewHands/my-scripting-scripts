import { Rectangle, RoundedRectangle, ZStack, gradient, useEffect, useObservable, type Color, type CommonViewProps } from "scripting"
import { getAppIconAsset, putAppIconAsset } from "../modules/AppIconAssetDB"
import type { RGBAColor, DominantColor } from "../types/utils"

export type CachedAppIconState = {
  iconUrl: string | null
  image: UIImage | null
  dominantColor: RGBAColor | null
  fallbackToUrl: boolean
}

export type CachedAppIcon = CachedAppIconState & {
  rowStyleProps: Pick<CommonViewProps, "background">
}

const emptyState = (iconUrl: string | null = null): CachedAppIconState => ({
  iconUrl,
  image: null,
  dominantColor: null,
  fallbackToUrl: false,
})

const memoryCache = new Map<string, CachedAppIconState>()
const pendingTasks = new Map<string, Promise<CachedAppIconState>>()
// 内存里缓存 UIImage，限制条目避免列表滑动时无限涨
const MAX_MEMORY_ICON_CACHE = 40

const putMemoryCache = (iconUrl: string, state: CachedAppIconState) => {
  if (memoryCache.has(iconUrl)) memoryCache.delete(iconUrl)
  memoryCache.set(iconUrl, state)
  while (memoryCache.size > MAX_MEMORY_ICON_CACHE) {
    const oldest = memoryCache.keys().next().value
    if (oldest == null) break
    memoryCache.delete(oldest)
  }
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const parseColor = (raw?: string | null): RGBAColor | null => {
  if (!raw) return null
  try {
    const color = JSON.parse(raw) as RGBAColor
    return typeof color?.hex === "string" ? color : null
  } catch {
    return null
  }
}

const luminance = (color: RGBAColor) => (
  0.299 * color.red + 0.587 * color.green + 0.114 * color.blue
)

const isUsableDominantColor = (item: DominantColor) => {
  const color = item.color
  const lightness = luminance(color)

  return color.alpha > 0.5
    && lightness > 0.1
    && lightness < 0.97
}

const rgbToHsl = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2

  if (max === min) return { hue: 0, saturation: 0, lightness }

  const delta = max - min
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  let hue = 0
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0)
      break
    case green:
      hue = (blue - red) / delta + 2
      break
    default:
      hue = (red - green) / delta + 4
      break
  }

  return { hue: hue / 6, saturation, lightness }
}

const hueToRgb = (p: number, q: number, t: number) => {
  let next = t
  if (next < 0) next += 1
  if (next > 1) next -= 1
  if (next < 1 / 6) return p + (q - p) * 6 * next
  if (next < 1 / 2) return q
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
  return p
}

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  if (saturation === 0) return { red: lightness, green: lightness, blue: lightness }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q

  return {
    red: hueToRgb(p, q, hue + 1 / 3),
    green: hueToRgb(p, q, hue),
    blue: hueToRgb(p, q, hue - 1 / 3),
  }
}

const rgbaString = (red: number, green: number, blue: number, alpha: number) => (
  `rgba(${Math.round(red * 255)},${Math.round(green * 255)},${Math.round(blue * 255)},${alpha})` as Color
)

export const makeAppIconColor = (color: RGBAColor, alpha = 1): Color => (
  rgbaString(color.red, color.green, color.blue, alpha)
)

const rowGlassShape = {
  type: "rect" as const,
  cornerRadius: 20,
}

const isPurpleHue = (hue: number) => hue >= 0.68 && hue <= 0.86

const makeAppIconBackgroundRgb = (dominantColor: RGBAColor) => {
  const hsl = rgbToHsl(dominantColor.red, dominantColor.green, dominantColor.blue)
  const isPurple = isPurpleHue(hsl.hue)
  const saturation = clamp(hsl.saturation * (isPurple ? 0.95 : 0.9))
  const lightnessBoost = isPurple
    ? (hsl.lightness > 0.5 ? 0.03 : 0.12)
    : (hsl.lightness > 0.5 ? 0.08 : 0.14)
  const lightness = clamp(hsl.lightness + lightnessBoost, 0, 0.9)
  return hslToRgb(hsl.hue, saturation, lightness)
}

export const makeAppIconBackgroundTintColor = (dominantColor: RGBAColor): Color => {
  const rgb = makeAppIconBackgroundRgb(dominantColor)
  return rgbaString(rgb.red, rgb.green, rgb.blue, 0.12)
}

const makeAppIconGradient = (dominantColor: RGBAColor, startAlpha: number, middleAlpha: number) => {
  const rgb = makeAppIconBackgroundRgb(dominantColor)
  return gradient("linear", {
    stops: [
      { color: rgbaString(rgb.red, rgb.green, rgb.blue, startAlpha), location: 0 },
      { color: rgbaString(rgb.red, rgb.green, rgb.blue, middleAlpha), location: 0.48 },
      { color: rgbaString(rgb.red, rgb.green, rgb.blue, 0), location: 1 },
    ],
    startPoint: "topLeading",
    endPoint: "bottomTrailing",
  })
}

export const makeAppIconBackgroundGradient = (dominantColor: RGBAColor) => {
  const hsl = rgbToHsl(dominantColor.red, dominantColor.green, dominantColor.blue)
  const isPurple = isPurpleHue(hsl.hue)

  return {
    light: makeAppIconGradient(
      dominantColor,
      isPurple ? 0.34 : 0.29,
      isPurple ? 0.16 : 0.13
    ),
    dark: makeAppIconGradient(
      dominantColor,
      isPurple ? 0.23 : 0.19,
      isPurple ? 0.095 : 0.07
    ),
  }
}

export function AppIconAccentBackground({ dominantColor }: { dominantColor: RGBAColor }) {
  return (
    <ZStack
      allowsHitTesting={false}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
    >
      <Rectangle
        fill={makeAppIconBackgroundGradient(dominantColor)}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        clipShape={rowGlassShape}
      />
      <RoundedRectangle
        cornerRadius={20}
        fill="clear"
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        stroke={{
          shapeStyle: {
            light: "rgba(0,0,0,0.16)",
            dark: "rgba(255,255,255,0.42)",
          },
          strokeStyle: { lineWidth: 0.35 },
        }}
      />
    </ZStack>
  )
}

export const makeAppIconRowStyleProps = (dominantColor: RGBAColor): CachedAppIcon["rowStyleProps"] => ({
  background: <AppIconAccentBackground dominantColor={dominantColor} />,
})

const extractDominantColor = (image: UIImage, _iconUrl: string) => {
  try {
    const dominantColors = (image as UIImage & { dominantColors?: (count?: number) => DominantColor[] }).dominantColors
    if (typeof dominantColors !== "function") return null

    const colors = dominantColors.call(image, 8)
    return colors.find(isUsableDominantColor)?.color ?? null
  } catch {
    return null
  }
}

const buildState = (iconUrl: string, image: UIImage | null, dominantColor: RGBAColor | null, fallbackToUrl = false): CachedAppIconState => ({
  iconUrl,
  image,
  dominantColor,
  fallbackToUrl,
})

const readCachedState = async (iconUrl: string) => {
  const cached = await getAppIconAsset(iconUrl)
  if (!cached?.image) return null

  const image = UIImage.fromData(cached.image)
  if (!image) return null

  const color = parseColor(cached.dominant_color)

  if (!color || !isUsableDominantColor({ color, fraction: 1 })) {
    const nextColor = extractDominantColor(image, iconUrl)
    await putAppIconAsset({
      iconUrl,
      image: cached.image,
      dominantColor: nextColor,
    }).catch(() => {})
    return buildState(iconUrl, image, nextColor)
  }

  return buildState(iconUrl, image, color)
}

const loadCachedAppIcon = async (iconUrl: string): Promise<CachedAppIconState> => {
  const cached = await readCachedState(iconUrl)
  if (cached) return cached

  try {
    const image = await UIImage.fromURL(iconUrl)
    if (!image) return buildState(iconUrl, null, null, true)

    const dominantColor = extractDominantColor(image, iconUrl)
    // 只编码一次 PNG，避免日志/落库各调一次 toPNGData
    const imageData = image.toPNGData()
    await putAppIconAsset({
      iconUrl,
      image: imageData,
      dominantColor,
    }).catch(() => {})

    return buildState(iconUrl, image, dominantColor)
  } catch {
    return buildState(iconUrl, null, null, true)
  }
}

const resolveCachedAppIcon = (iconUrl: string): Promise<CachedAppIconState> => {
  const cached = memoryCache.get(iconUrl)
  if (cached) return Promise.resolve(cached)

  const pending = pendingTasks.get(iconUrl)
  if (pending) return pending

  const task = loadCachedAppIcon(iconUrl)
    .then(state => {
      putMemoryCache(iconUrl, state)
      return state
    })
    .finally(() => {
      pendingTasks.delete(iconUrl)
    })

  pendingTasks.set(iconUrl, task)
  return task
}

export const useCachedAppIcon = (iconUrl?: string | null): CachedAppIcon => {
  const state = useObservable<CachedAppIconState>(emptyState(iconUrl ?? null))

  useEffect(() => {
    const nextIconUrl = iconUrl ?? null
    if (!nextIconUrl) {
      state.setValue(emptyState(null))
      return
    }

    if (state.value.iconUrl === nextIconUrl && state.value.image) return

    let cancelled = false
    state.setValue(emptyState(nextIconUrl))

    resolveCachedAppIcon(nextIconUrl).then(nextState => {
      if (!cancelled) state.setValue(nextState)
    })

    return () => {
      cancelled = true
    }
  }, [iconUrl])

  const current = state.value
  return {
    ...current,
    rowStyleProps: current.dominantColor ? makeAppIconRowStyleProps(current.dominantColor) : {},
  }
}
