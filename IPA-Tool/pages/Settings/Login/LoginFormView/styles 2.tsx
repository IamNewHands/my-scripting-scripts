import { RoundedRectangle, type Color, type DynamicShapeStyle } from "scripting";

export const pillGlass = UIGlass.clear().interactive(true);
export const squircleRadius = 18;

export const pillGlassProps = {
  padding: { horizontal: 16, vertical: 12 },
  frame: {
    maxWidth: "infinity" as const,
    minHeight: 56,
    alignment: "leading" as const,
  },
  glassEffect: {
    glass: pillGlass,
    shape: {
      type: "rect" as const,
      cornerRadius: squircleRadius,
      style: "continuous" as const,
    },
  },
  overlay: (
    <RoundedRectangle
      padding={-0.5}
      cornerRadius={squircleRadius}
      stroke={{
        shapeStyle: {
          light: "rgba(255,255,255,0.56)",
          dark: "rgba(255,255,255,0.30)",
        },
        strokeStyle: { lineWidth: 0.5 },
      }}
    />
  ),
  shadow: {
    color: "rgba(72,88,120,0.16)",
    radius: 12,
    y: 5,
  },
} as const;

export const dividerFill = {
  light: {
    colors: [
      "rgba(30,30,30,0.02)",
      "rgba(30,30,30,0.34)",
      "rgba(30,30,30,0.02)",
    ] as Color[],
    startPoint: "leading",
    endPoint: "trailing",
  },
  dark: {
    colors: [
      "rgba(255,255,255,0.04)",
      "rgba(255,255,255,0.42)",
      "rgba(255,255,255,0.04)",
    ] as Color[],
    startPoint: "leading",
    endPoint: "trailing",
  },
} satisfies DynamicShapeStyle;

export const loginButtonFill = {
  light: "rgba(0,122,255,0.72)",
  dark: "rgba(10,132,255,0.62)",
} as const;
