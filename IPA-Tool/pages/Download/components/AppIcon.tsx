import { Image, useMemo } from "scripting"
import type { CachedAppIcon } from "../../../hooks"
import AppIconPlaceholder from "../../../components/AppIconPlaceholder"

const b64toImage = (input: string) => UIImage.fromData(Data.fromBase64String(input)!)

const resolveIcon = (icon: string | null | undefined, appIcon?: CachedAppIcon) => {
  if (appIcon?.image) return { image: appIcon.image }
  if (!icon) return { systemName: "apple.logo" }
  return icon.startsWith("http") ? null : { image: b64toImage(icon)! }
}

export default function AppIcon({ icon, appIcon }: { icon: string | null | undefined, appIcon?: CachedAppIcon }) {
  const source = useMemo(() => resolveIcon(icon, appIcon), [icon, appIcon?.image])
  const frame = { width: source?.systemName ? 55 : 60, height: 60 }
  const clipShape = { type: "rect", cornerRadius: 16, style: "continuous" } as const

  if (!source) {
    return <AppIconPlaceholder frame={frame} clipShape={clipShape} />
  }

  return (
    <Image
      {...source}
      resizable
      frame={frame}
      clipShape={clipShape}
    />
  )
}
