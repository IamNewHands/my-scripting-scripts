import { Text } from "scripting"

const fontCaption = { font: "footnote" as const, fontWeight: "regular" as const }
const fontAppName = { font: "body" as const, fontWeight: "semibold" as const }

type GlassTagForegroundStyle = "secondaryLabel" | "systemOrange"

function GlassTag({ children, foregroundStyle }: { children: string; foregroundStyle?: GlassTagForegroundStyle }) {
  const style = foregroundStyle ?? "secondaryLabel"
  return (
    <Text
      {...fontCaption}
      foregroundStyle={style}
      padding={{ horizontal: 8, vertical: 4 }}
      glassEffect={{
        glass: UIGlass.clear().interactive(true),
        shape: "buttonBorder"
      }}
      truncationMode="tail"
      lineLimit={1}
    >
      {children}
    </Text>
  )
}

export { GlassTag, fontCaption, fontAppName }
