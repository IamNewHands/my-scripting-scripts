import type { Color, ShapeStyle } from "scripting"
import { pageBackgroundStyle } from "../../../components/EditableGlassListPipeline"

type BarGradient = {
  colors: [Color, Color]
  startPoint: "top"
  endPoint: "bottom"
}

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const hexToRgb = (color: Color) => {
  const hex = String(color).replace("#", "")

  if (hex.length !== 6) return null

  return {
    red: parseInt(hex.slice(0, 2), 16) / 255,
    green: parseInt(hex.slice(2, 4), 16) / 255,
    blue: parseInt(hex.slice(4, 6), 16) / 255,
  }
}

const rgbToHex = (red: number, green: number, blue: number): Color => {
  const value = [red, green, blue]
    .map(channel => clampChannel(channel)
      .toString(16)
      .padStart(2, "0"))
    .join("")

  return `#${value}` as Color
}

const tuneVisibility = (color: Color, mode: "light" | "dark"): Color => {
  const rgb = hexToRgb(color)

  if (!rgb) return color

  const tune = mode === "dark"
    ? (channel: number) => channel * 255 * 1.22 + 12
    : (channel: number) => channel * 255 * 0.82

  return rgbToHex(tune(rgb.red), tune(rgb.green), tune(rgb.blue))
}

const transparentColor = (color: Color, alpha: number): Color => {
  const rgb = hexToRgb(color)

  if (!rgb) return `rgba(255,255,255,${alpha})` as Color

  return `rgba(${Math.round(rgb.red * 255)},${Math.round(rgb.green * 255)},${Math.round(rgb.blue * 255)},${alpha})` as Color
}

const createBarGradient = (color: Color, mode: "light" | "dark"): BarGradient & ShapeStyle => {
  const tunedColor = tuneVisibility(color, mode)

  return {
    colors: [
      tunedColor,
      transparentColor(tunedColor, mode === "dark" ? 0.18 : 0.28),
    ],
    startPoint: "top",
    endPoint: "bottom",
  }
}

export const searchHistoryBarGradient = {
  light: createBarGradient(pageBackgroundStyle.accent.light, "light"),
  dark: createBarGradient(pageBackgroundStyle.accent.dark, "dark"),
} satisfies Record<"light" | "dark", BarGradient & ShapeStyle>
