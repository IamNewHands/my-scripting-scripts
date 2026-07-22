/**
 * 根据应用的主色调生成多种视觉主题，
 * 包括水平、垂直和径向渐变，以及纯色背景。
 *
 * 用于渲染应用图标列表行和详情页的背景，
 * 让 UI 呈现与图标配色匹配的沉浸感。
 */

import { BackgroundColor, ForegroundColor, GradientDirection } from "scripting"

// 类型定义

/** RGBA 颜色，alpha 为 0-1 的浮点数 */
type RGBAColor = { r: number; g: number; b: number; a: number }

/** 从 Image.dominantColor 提取的颜色信息 */
type DominantColor = {
  /** 主色 */
  color: RGBAColor
  /** 在图像中的覆盖比例（0-1） */
  coverage: number
}

// 核心函数

/**
 * 根据应用的主色调生成多种视觉主题。
 *
 * @param primaryColor - 从应用图标中提取的主色调（RGBA）。
 * @returns 返回一个对象，包含水平、垂直和径向渐变，以及纯色背景。
 */
export function getGradientTheme(primaryColor: RGBAColor): {
  hGradient: BackgroundColor
  vGradient: BackgroundColor
  rGradient: BackgroundColor
  solid: ForegroundColor
} {
  // 1. 从主色提取 HSB 分量
  const hsb = rgbaToHsb(primaryColor)

  // 2. 生成多种颜色变体
  const lightColor = hsbToRgba({ h: hsb.h, s: Math.max(hsb.s - 0.15, 0.05), b: 1 })
  const darkColor = hsbToRgba({ h: hsb.h, s: Math.min(hsb.s + 0.15, 1), b: Math.max(hsb.b - 0.15, 0.05) })
  const accentColor = hsbToRgba({ h: (hsb.h + 0.15) % 1, s: hsb.s, b: hsb.b })

  // 3. 构建视觉主题
  return {
    // 水平渐变（适合列表行）
    hGradient: {
      type: "gradient",
      direction: "horizontal",
      colors: [darkColor, accentColor, lightColor],
      colorLocations: [0, 0.5, 1],
    },

    // 垂直渐变（适合详情页）
    vGradient: {
      type: "gradient",
      direction: "vertical",
      colors: [lightColor, primaryColor, darkColor],
      colorLocations: [0, 0.5, 1],
    },

    // 径向渐变（适合图标背景）
    rGradient: {
      type: "gradient",
      direction: "radial",
      colors: [accentColor, primaryColor, darkColor],
      colorLocations: [0, 0.5, 1],
    },

    // 纯色（适合文字叠加）
    solid: {
      type: "color",
      r: primaryColor.r,
      g: primaryColor.g,
      b: primaryColor.b,
      a: 1,
    },
  }
}

/**
 * 根据主色调和次要色调生成更丰富的主题。
 *
 * @param primaryColor - 主色调。
 * @param secondaryColor - 次要色调（通常取 dominantColor 数组中的第二项）。
 * @returns 返回一个包含多种渐变和颜色的主题对象。
 */
export function getDualGradientTheme(
  primaryColor: RGBAColor,
  secondaryColor: RGBAColor,
): {
  hGradient: BackgroundColor
  vGradient: BackgroundColor
  rGradient: BackgroundColor
  diagonalGradient: BackgroundColor
  solid: ForegroundColor
  accentSolid: ForegroundColor
} {
  const pLight = hsbToRgba({ ...rgbaToHsb(primaryColor), s: Math.max(rgbaToHsb(primaryColor).s - 0.1, 0.05), b: 1 })
  const sDark = hsbToRgba({ ...rgbaToHsb(secondaryColor), s: Math.min(rgbaToHsb(secondaryColor).s + 0.1, 1), b: Math.max(rgbaToHsb(secondaryColor).b - 0.1, 0.05) })

  return {
    hGradient: {
      type: "gradient",
      direction: "horizontal",
      colors: [primaryColor, secondaryColor, pLight],
      colorLocations: [0, 0.5, 1],
    },
    vGradient: {
      type: "gradient",
      direction: "vertical",
      colors: [pLight, primaryColor, sDark],
      colorLocations: [0, 0.5, 1],
    },
    rGradient: {
      type: "gradient",
      direction: "radial",
      colors: [secondaryColor, primaryColor, sDark],
      colorLocations: [0, 0.5, 1],
    },
    diagonalGradient: {
      type: "gradient",
      direction: "diagonalTopLeftToBottomRight",
      colors: [pLight, secondaryColor, primaryColor],
      colorLocations: [0, 0.5, 1],
    },
    solid: {
      type: "color",
      r: primaryColor.r,
      g: primaryColor.g,
      b: primaryColor.b,
      a: 1,
    },
    accentSolid: {
      type: "color",
      r: secondaryColor.r,
      g: secondaryColor.g,
      b: secondaryColor.b,
      a: 1,
    },
  }
}

/**
 * 从 Image.dominantColor 中安全提取主色调。
 *
 * @param image - 图像对象（需调用 image.dominantColor()）。
 * @returns 返回 RGBA 颜色对象，如果无法提取则返回默认的白色。
 */
export function extractPrimaryColor(image: { dominantColor: () => DominantColor[] | null }): RGBAColor {
  try {
    const colors = image.dominantColor()
    if (colors && colors.length > 0 && colors[0].coverage > 0.1) {
      return colors[0].color
    }
  } catch {
    // 忽略提取失败
  }
  return { r: 1, g: 1, b: 1, a: 1 } // 默认白色
}

/**
 * 从 HSB 转换为 RGBA。
 * @param hsb - HSB 值，h/s/b 范围 0-1。
 * @returns RGBA 颜色对象。
 */
function hsbToRgba(hsb: { h: number; s: number; b: number }): RGBAColor {
  const { h, s, b } = hsb
  const c = b * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = b - c

  let r = 0,
    g = 0,
    bl = 0

  if (h < 1 / 6) {
    r = c
    g = x
  } else if (h < 2 / 6) {
    r = x
    g = c
  } else if (h < 3 / 6) {
    g = c
    bl = x
  } else if (h < 4 / 6) {
    g = x
    bl = c
  } else if (h < 5 / 6) {
    r = x
    bl = c
  } else {
    r = c
    bl = x
  }

  return {
    r: r + m,
    g: g + m,
    b: bl + m,
    a: 1,
  }
}

/**
 * 从 RGBA 转换为 HSB。
 * @param rgba - RGBA 颜色对象。
 * @returns HSB 值，h/s/b 范围 0-1。
 */
function rgbaToHsb(rgba: RGBAColor): { h: number; s: number; b: number } {
  const { r, g, b } = rgba
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + 6) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h /= 6
  }

  const s = max === 0 ? 0 : delta / max
  const bHsb = max

  return { h, s, b: bHsb }
}

/**
 * 将 RGBA 颜色转换为十六进制字符串（包含 alpha）。
 * @param color - RGBA 颜色对象。
 * @returns 十六进制颜色字符串，格式为 `#RRGGBBAA`。
 */
function rgbaToHex(color: RGBAColor): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0")
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex(color.a)}`
}

/**
 * 将十六进制颜色字符串转换为 RGBA。
 * @param hex - 十六进制颜色字符串，支持 3/4/6/8 位格式。
 * @returns RGBA 颜色对象。
 */
export function hexToRgba(hex: string): RGBAColor {
  const h = hex.replace("#", "")
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16) / 255,
      g: parseInt(h[1] + h[1], 16) / 255,
      b: parseInt(h[2] + h[2], 16) / 255,
      a: 1,
    }
  }
  if (h.length === 4) {
    return {
      r: parseInt(h[0] + h[0], 16) / 255,
      g: parseInt(h[1] + h[1], 16) / 255,
      b: parseInt(h[2] + h[2], 16) / 255,
      a: parseInt(h[3] + h[3], 16) / 255,
    }
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: 1,
    }
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: parseInt(h.slice(6, 8), 16) / 255,
    }
  }
  return { r: 1, g: 1, b: 1, a: 1 }
}

// 实用工具函数

/**
 * 获取应用图标的主色调，支持缓存。
 *
 * @param app - 应用对象。
 * @param cache - 可选的缓存对象，用于存储已提取的颜色。
 * @returns 返回主色调的 RGBA 对象。
 */
export function getCachedPrimaryColor(app: { appId: string }, cache: Map<string, RGBAColor> = new Map()): RGBAColor {
  const cached = cache.get(app.appId)
  if (cached) return cached

  const color = extractPrimaryColor({
    dominantColor: () => null, // 需要外部传入实际的 image 对象
  })

  cache.set(app.appId, color)
  return color
}

/**
 * 生成适配深色模式的背景渐变。
 *
 * @param primaryColor - 主色调。
 * @param darkMode - 是否为深色模式。
 * @returns 返回适配深色模式的垂直渐变背景。
 */
export function getDarkModeGradient(primaryColor: RGBAColor, darkMode: boolean): BackgroundColor {
  if (!darkMode) {
    const { vGradient } = getGradientTheme(primaryColor)
    return vGradient
  }

  // 深色模式下降低亮度，增加对比度
  const hsb = rgbaToHsb(primaryColor)
  const darkened = hsbToRgba({
    h: hsb.h,
    s: Math.min(hsb.s + 0.1, 1),
    b: Math.max(hsb.b * 0.7, 0.1),
  })

  return {
    type: "gradient",
    direction: "vertical",
    colors: [darkened, { ...darkened, b: Math.max(darkened.b - 0.1, 0.05) }],
    colorLocations: [0, 1],
  }
}

/**
 * 生成适配浅色模式的背景渐变。
 *
 * @param primaryColor - 主色调。
 * @param lightMode - 是否为浅色模式。
 * @returns 返回适配浅色模式的垂直渐变背景。
 */
export function getLightModeGradient(primaryColor: RGBAColor, lightMode: boolean): BackgroundColor {
  if (!lightMode) {
    const { vGradient } = getGradientTheme(primaryColor)
    return vGradient
  }

  // 浅色模式下提高亮度
  const hsb = rgbaToHsb(primaryColor)
  const lightened = hsbToRgba({
    h: hsb.h,
    s: Math.max(hsb.s - 0.1, 0.05),
    b: Math.min(hsb.b * 1.2, 1),
  })

  return {
    type: "gradient",
    direction: "vertical",
    colors: [lightened, { ...lightened, b: Math.max(lightened.b + 0.1, 0.95) }],
    colorLocations: [0, 1],
  }
}

/**
 * 从多个颜色中提取混合颜色。
 *
 * @param colors - RGBA 颜色数组。
 * @returns 返回混合后的 RGBA 颜色。
 */
export function mixColors(colors: RGBAColor[]): RGBAColor {
  if (colors.length === 0) return { r: 1, g: 1, b: 1, a: 1 }

  let r = 0,
    g = 0,
    b = 0,
    a = 0

  for (const c of colors) {
    r += c.r * c.a
    g += c.g * c.a
    b += c.b * c.a
    a += c.a
  }

  const count = colors.length
  return {
    r: r / count,
    g: g / count,
    b: b / count,
    a: a / count,
  }
}

/**
 * 调整颜色的亮度。
 *
 * @param color - 原始 RGBA 颜色。
 * @param factor - 亮度调整因子，>1 变亮，<1 变暗。
 * @returns 调整后的 RGBA 颜色。
 */
export function adjustBrightness(color: RGBAColor, factor: number): RGBAColor {
  const hsb = rgbaToHsb(color)
  return hsbToRgba({
    h: hsb.h,
    s: hsb.s,
    b: Math.min(Math.max(hsb.b * factor, 0), 1),
  })
}

/**
 * 调整颜色的饱和度。
 *
 * @param color - 原始 RGBA 颜色。
 * @param factor - 饱和度调整因子，>1 更饱和，<1 更灰。
 * @returns 调整后的 RGBA 颜色。
 */
export function adjustSaturation(color: RGBAColor, factor: number): RGBAColor {
  const hsb = rgbaToHsb(color)
  return hsbToRgba({
    h: hsb.h,
    s: Math.min(Math.max(hsb.s * factor, 0), 1),
    b: hsb.b,
  })
}

/**
 * 调整颜色的色相。
 *
 * @param color - 原始 RGBA 颜色。
 * @param shift - 色相偏移量，范围 -1 到 1。
 * @returns 调整后的 RGBA 颜色。
 */
export function shiftHue(color: RGBAColor, shift: number): RGBAColor {
  const hsb = rgbaToHsb(color)
  return hsbToRgba({
    h: (hsb.h + shift + 1) % 1,
    s: hsb.s,
    b: hsb.b,
  })
}

/**
 * 从应用名称生成颜色种子。
 *
 * @param appName - 应用名称。
 * @returns 返回基于名称生成的色相值（0-1）。
 */
export function getAppColorSeed(appName: string): number {
  let hash = 0
  for (let i = 0; i < appName.length; i++) {
    hash = (hash * 31 + appName.charCodeAt(i)) >>> 0
  }
  return hash / 0xffffffff
}

/**
 * 根据应用名称生成默认颜色。
 *
 * @param appName - 应用名称。
 * @returns 返回 RGBA 颜色对象。
 */
export functiongetDefaultColorForApp(appName: string): RGBAColor {
  const hue = getAppColorSeed(appName)
  return hsbToRgba({
    h: hue,
    s: 0.5 + (getAppColorSeed(appName + "s") * 0.3),
    b: 0.8 + (getAppColorSeed(appName + "b") * 0.2),
  })
}