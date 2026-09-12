import { Image, Rectangle, ZStack, type CommonViewProps } from "scripting"

const placeholderFill = {
  light: "rgba(255,255,255,0.92)",
  dark: "rgba(38,38,42,1)",
} as const

/** 图标缓存读取完成前使用的统一占位视图。 */
export default function AppIconPlaceholder({
  frame,
  clipShape,
}: Pick<CommonViewProps, "frame" | "clipShape">) {
  return (
    <ZStack frame={frame} clipShape={clipShape} unredacted={true}>
      <Rectangle fill={placeholderFill} />
      <Image
        systemName="app.dashed"
        imageScale="large"
        foregroundStyle="secondaryLabel"
      />
    </ZStack>
  )
}
