import { Image, Rectangle, type CommonViewProps } from "scripting"
import type { CachedAppIcon } from "../../../hooks"

type CachedAppIconImageProps = CommonViewProps & {
  icon: CachedAppIcon
  iconUrl?: string | null
  resizable?: boolean
}

const placeholderFill = {
  light: "rgba(255,255,255,0.92)",
  dark: "rgba(38,38,42,1)",
} as const

export default function CachedAppIconImage({
  icon,
  iconUrl,
  frame,
  clipShape,
  ...props
}: CachedAppIconImageProps) {
  if (icon.image) {
    return (
      <Image
        image={icon.image}
        frame={frame}
        clipShape={clipShape}
        {...props}
      />
    )
  }

  if (icon.fallbackToUrl && iconUrl) {
    return (
      <Image
        imageUrl={iconUrl}
        frame={frame}
        clipShape={clipShape}
        {...props}
      />
    )
  }

  return (
    <Rectangle
      fill={placeholderFill}
      frame={frame}
      clipShape={clipShape}
    />
  )
}
