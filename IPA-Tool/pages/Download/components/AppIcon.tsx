import { Image, useMemo } from "scripting"
import type { CachedAppIcon } from "../../../hooks"

const b64toImage = (input: string) => UIImage.fromData(Data.fromBase64String(input)!)

const resolveIcon = (icon: string | null | undefined, appIcon?: CachedAppIcon) => {
  if (appIcon?.image) return { image: appIcon.image }
  if (!icon) return { systemName: "apple.logo" }
  return icon.startsWith("http") ? { imageUrl: icon } : { image: b64toImage(icon)! }
}

export default function AppIcon({ icon, appIcon }: { icon: string | null | undefined, appIcon?: CachedAppIcon }) {
  const source = useMemo(() => resolveIcon(icon, appIcon), [icon, appIcon?.image])
  return (
    <Image
      {...source}
      resizable
      frame={{ width: source.systemName ? 55 : 60, height: 60 }}
      clipShape={{ type: "rect", cornerRadius: 16, style: "continuous" }}
    />
  )
}
