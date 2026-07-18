import { RoundedRectangle } from "scripting";

export const cardRadius = 24;
export const buttonRadius = 18;
export const cardGlass = UIGlass.clear().interactive(true);
export const cardShape = {
  type: "rect" as const,
  cornerRadius: cardRadius,
  style: "continuous" as const,
};

export const buttonShape = {
  type: "rect" as const,
  cornerRadius: buttonRadius,
  style: "continuous" as const,
};

export const glassCardProps = {
  frame: { maxWidth: "infinity" as const, alignment: "leading" as const },
  glassEffect: {
    glass: cardGlass,
    shape: cardShape,
  },
  overlay: (
    <RoundedRectangle
      padding={-0.5}
      cornerRadius={cardRadius}
      stroke={{
        shapeStyle: {
          light: "rgba(255,255,255,0.52)",
          dark: "rgba(255,255,255,0.30)",
        },
        strokeStyle: { lineWidth: 0.5 },
      }}
    />
  ),
  shadow: {
    color: "rgba(38,92,160,0.18)",
    radius: 18,
    y: 8,
  },
} as const;
