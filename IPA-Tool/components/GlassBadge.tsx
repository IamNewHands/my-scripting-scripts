import type { Color, ContentTransition, Font, FontWeight, TextProps, VirtualNode } from "scripting"
import { Circle, HStack } from "scripting"
import { AnimText } from "./AnimText"

export type GlassBadgeStyle = "info" | "success" | "warning" | "error" | "neutral" | "teal"

type AdaptiveColor = Color | {
  light: Color
  dark: Color
}

type GlassBadgeTokens = {
  tint: AdaptiveColor
  background: AdaptiveColor
  border: AdaptiveColor
}

type GlassBadgeProps = {
  style?: GlassBadgeStyle
  children: VirtualNode | VirtualNode[]
  showDot?: boolean
}

type AnimTextGlassBadgeProps = {
  style?: GlassBadgeStyle
  children: Extract<TextProps, { children: any }>["children"]
  showDot?: boolean
  anim?: ContentTransition
  dur?: number
  font?: number | Font | { name: string; size: number }
  fontWeight?: FontWeight
}

const badgeTokenMap: Record<GlassBadgeStyle, GlassBadgeTokens> = {
  info: {
    tint: { light: "#0057B8", dark: "systemBlue" },
    background: { light: "rgba(0,122,255,0.18)", dark: "rgba(0,122,255,0.16)" },
    border: { light: "rgba(0,122,255,0.34)", dark: "rgba(0,122,255,0.32)" },
  },
  success: {
    tint: { light: "#1F7A35", dark: "systemGreen" },
    background: { light: "rgba(52,199,89,0.18)", dark: "rgba(52,199,89,0.16)" },
    border: { light: "rgba(52,199,89,0.34)", dark: "rgba(52,199,89,0.32)" },
  },
  warning: {
    tint: { light: "#9A5A00", dark: "systemOrange" },
    background: { light: "rgba(255,149,0,0.20)", dark: "rgba(255,149,0,0.16)" },
    border: { light: "rgba(255,149,0,0.36)", dark: "rgba(255,149,0,0.32)" },
  },
  error: {
    tint: { light: "#B42318", dark: "systemRed" },
    background: { light: "rgba(255,59,48,0.18)", dark: "rgba(255,59,48,0.16)" },
    border: { light: "rgba(255,59,48,0.34)", dark: "rgba(255,59,48,0.32)" },
  },
  neutral: {
    tint: { light: "#4F4F55", dark: "secondaryLabel" },
    background: { light: "rgba(142,142,147,0.17)", dark: "rgba(142,142,147,0.14)" },
    border: { light: "rgba(142,142,147,0.32)", dark: "rgba(142,142,147,0.28)" },
  },
  teal: {
    tint: { light: "#087989", dark: "systemTeal" },
    background: { light: "rgba(48,176,199,0.18)", dark: "rgba(48,176,199,0.16)" },
    border: { light: "rgba(48,176,199,0.34)", dark: "rgba(48,176,199,0.32)" },
  },
}

export const getGlassBadgeTokens = (style: GlassBadgeStyle) => badgeTokenMap[style]

export function GlassBadge({ style = "neutral", children, showDot = false }: GlassBadgeProps) {
  const tokens = getGlassBadgeTokens(style)

  return (
    <HStack
      spacing={6}
      padding={{ horizontal: 10, vertical: 5 }}
      background={{ style: tokens.background, shape: "capsule" }}
      border={{ style: tokens.border, width: 0.5 }}
      clipShape="capsule"
    >
      {showDot && <Circle fill={tokens.tint} frame={{ width: 6, height: 6 }} />}
      {children}
    </HStack>
  )
}

export function AnimTextGlassBadge({
  style = "neutral",
  children,
  showDot = false,
  anim,
  dur,
  font,
  fontWeight,
}: AnimTextGlassBadgeProps) {
  const tokens = getGlassBadgeTokens(style)

  return (
    <GlassBadge style={style} showDot={showDot}>
      <AnimText
        font={font}
        fontWeight={fontWeight}
        anim={anim}
        dur={dur}
        foregroundStyle={tokens.tint}
      >
        {children}
      </AnimText>
    </GlassBadge>
  )
}
