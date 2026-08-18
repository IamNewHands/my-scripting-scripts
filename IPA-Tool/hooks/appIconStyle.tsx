import {
  Rectangle,
  RoundedRectangle,
  ZStack,
  gradient,
  type Color,
} from "scripting";

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const luminance = (color: RGBAColor) =>
  0.299 * color.red + 0.587 * color.green + 0.114 * color.blue;

export const isUsableDominantColor = (item: DominantColor) => {
  const color = item.color;
  const lightness = luminance(color);

  return color.alpha > 0.5 && lightness > 0.1 && lightness < 0.97;
};

const rgbToHsl = (red: number, green: number, blue: number) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return { hue: 0, saturation: 0, lightness };

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return { hue: hue / 6, saturation, lightness };
};

const hueToRgb = (p: number, q: number, t: number) => {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  if (saturation === 0)
    return { red: lightness, green: lightness, blue: lightness };

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    red: hueToRgb(p, q, hue + 1 / 3),
    green: hueToRgb(p, q, hue),
    blue: hueToRgb(p, q, hue - 1 / 3),
  };
};

const rgbaString = (red: number, green: number, blue: number, alpha: number) =>
  `rgba(${Math.round(red * 255)},${Math.round(green * 255)},${Math.round(blue * 255)},${alpha})` as Color;

export const makeAppIconColor = (color: RGBAColor, alpha = 1): Color =>
  rgbaString(color.red, color.green, color.blue, alpha);

type AppIconColorMode = "light" | "dark";

const isAppIconBaseColorUsable = (color: RGBAColor) => {
  const hsl = rgbToHsl(color.red, color.green, color.blue);
  const lightness = luminance(color);
  const isBlack = lightness < 0.1 || hsl.lightness < 0.08;
  const isWhite = lightness > 0.92 || (hsl.lightness > 0.88 && hsl.saturation < 0.18);

  return color.alpha > 0.5 && !isBlack && !isWhite;
};

const normalizeAppIconColors = (
  colors: RGBAColor[] | RGBAColor | null | undefined
) => (Array.isArray(colors) ? colors : colors ? [colors] : []).filter(isAppIconBaseColorUsable);

const isBrightYellow = (hsl: ReturnType<typeof rgbToHsl>, lightness: number) =>
  hsl.hue >= 0.1 &&
  hsl.hue <= 0.18 &&
  hsl.lightness > 0.68 &&
  hsl.saturation > 0.34 &&
  lightness > 0.72;

export const isAppIconLightModeAccentColorUsable = (color: RGBAColor) => {
  const hsl = rgbToHsl(color.red, color.green, color.blue);
  const lightness = luminance(color);
  const isTooLight = hsl.lightness > 0.78 || lightness > 0.82;
  const isBrightWhite = hsl.lightness > 0.86 && hsl.saturation < 0.22;

  return !isTooLight && !isBrightWhite && !isBrightYellow(hsl, lightness);
};

const pickAppIconAccentColor = (
  colors: RGBAColor[] | RGBAColor | null | undefined,
  mode: AppIconColorMode
) => {
  const candidates = normalizeAppIconColors(colors);
  if (mode === "dark") return candidates[0] ?? null;

  return candidates.find(isAppIconLightModeAccentColorUsable) ?? candidates[0] ?? null;
};

export const pickAppIconLightModeAccentColor = (
  colors: RGBAColor[] | RGBAColor | null | undefined
) => pickAppIconAccentColor(colors, "light");

export const pickAppIconDarkModeAccentColor = (
  colors: RGBAColor[] | RGBAColor | null | undefined
) => pickAppIconAccentColor(colors, "dark");

const makeAdjustedAppIconAccentColor = (
  color: RGBAColor,
  mode: AppIconColorMode,
  alpha: number
) => {
  const hsl = rgbToHsl(color.red, color.green, color.blue);
  const isNeutral = hsl.saturation < 0.12;
  const saturation = isNeutral
    ? hsl.saturation
    : mode === "light"
      ? clamp(hsl.saturation * 1.08, 0.36, 0.82)
      : clamp(hsl.saturation * 1.04, 0.32, 0.86);
  const lightness = mode === "light"
    ? clamp(hsl.lightness, 0.32, isBrightYellow(hsl, luminance(color)) ? 0.52 : 0.58)
    : clamp(hsl.lightness, 0.5, 0.76);
  const rgb = hslToRgb(hsl.hue, saturation, lightness);

  return rgbaString(rgb.red, rgb.green, rgb.blue, alpha);
};

export const makeAppIconAccentColor = (
  colors: RGBAColor[] | RGBAColor | null | undefined,
  alpha = 1,
  fallback?: Color
): Color => {
  const lightColor = pickAppIconAccentColor(colors, "light");
  const darkColor = pickAppIconAccentColor(colors, "dark");
  const fallbackColor = fallback ?? "systemBlue";

  return {
    light: lightColor
      ? makeAdjustedAppIconAccentColor(lightColor, "light", alpha)
      : fallbackColor,
    dark: darkColor
      ? makeAdjustedAppIconAccentColor(darkColor, "dark", alpha)
      : fallbackColor,
  } as unknown as Color;
};

const rowGlassShape = {
  type: "rect" as const,
  cornerRadius: 20,
};

const isPurpleHue = (hue: number) => hue >= 0.68 && hue <= 0.86;

export const pickAppIconBackgroundColor = (
  colors: RGBAColor[] | RGBAColor | null | undefined
) => {
  const candidates = normalizeAppIconColors(colors);
  return candidates.find(color => {
    const hsl = rgbToHsl(color.red, color.green, color.blue);
    return hsl.saturation > 0.16;
  }) ?? candidates[0] ?? null;
};

const makeBaseAppIconBackgroundRgb = (dominantColor: RGBAColor) => {
  const hsl = rgbToHsl(
    dominantColor.red,
    dominantColor.green,
    dominantColor.blue
  );
  const isPurple = isPurpleHue(hsl.hue);
  const saturation = isPurple
    ? clamp(hsl.saturation * 0.9, 0.26, 0.58)
    : clamp(hsl.saturation * 0.82, 0.24, 0.54);
  const lightness = hsl.lightness > 0.56
    ? clamp(hsl.lightness - 0.06, 0.42, 0.66)
    : clamp(hsl.lightness + 0.16, 0.42, 0.66);

  return hslToRgb(hsl.hue, saturation, lightness);
};

export const makeAppIconBackgroundTintColor = (
  dominantColor: RGBAColor
): Color => {
  const rgb = makeBaseAppIconBackgroundRgb(dominantColor);
  return rgbaString(rgb.red, rgb.green, rgb.blue, 0.12);
};

const makeAppIconGradient = (
  dominantColor: RGBAColor,
  mode: AppIconColorMode
) => {
  const rgb = makeBaseAppIconBackgroundRgb(dominantColor);
  const hsl = rgbToHsl(dominantColor.red, dominantColor.green, dominantColor.blue);
  const isPurple = isPurpleHue(hsl.hue);
  const startAlpha = mode === "light"
    ? isPurple ? 0.34 : 0.3
    : isPurple ? 0.3 : 0.26;
  const middleAlpha = mode === "light"
    ? isPurple ? 0.16 : 0.13
    : isPurple ? 0.13 : 0.105;

  return gradient("linear", {
    stops: [
      {
        color: rgbaString(rgb.red, rgb.green, rgb.blue, startAlpha),
        location: 0,
      },
      {
        color: rgbaString(rgb.red, rgb.green, rgb.blue, middleAlpha),
        location: 0.48,
      },
      { color: rgbaString(rgb.red, rgb.green, rgb.blue, 0), location: 1 },
    ],
    startPoint: "topLeading",
    endPoint: "bottomTrailing",
  });
};

export const makeAppIconBackgroundGradient = (dominantColor: RGBAColor) => ({
  light: makeAppIconGradient(dominantColor, "light"),
  dark: makeAppIconGradient(dominantColor, "dark"),
});

export function AppIconAccentBackground({
  colors,
}: {
  colors: RGBAColor[] | RGBAColor;
}) {
  const dominantColor = pickAppIconBackgroundColor(colors);
  if (!dominantColor) return null;

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
  );
}
