/**
 * 小组件字号档位与布局工具（仅小组件内部使用）。
 * 集中放在 common 目录便于列表/图表视图共享。
 */
import type { WidgetFontSize } from "../../lib/types"

/** 判断股票代码是否为 ETF（51/52/56/58/59/15 开头） */
export function isETF(code: string): boolean {
  if (!code || code.length < 6) return false
  const prefix = code.slice(0, 2)
  return ["51", "52", "56", "58", "59", "15"].includes(prefix)
}

/** 将时间戳格式化为 YYYY-MM-DD */
export function formatYmd(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** 字号档位 → 相对 medium 的偏移 */
export function fontDelta(size: WidgetFontSize): number {
  if (size === "xsmall") return -3
  if (size === "small") return -2
  if (size === "large") return 2
  if (size === "xlarge") return 3
  return 0
}

/** 根据控制台字号档位缩放（全界面统一） */
export function getFontSize(base: number, size: WidgetFontSize): number {
  return Math.max(6, base + fontDelta(size))
}

/**
 * 数值列宽度：随字号略增，但封顶，避免大字号把名称列挤没。
 * 名称列始终用 maxWidth: infinity 吃剩余空间。
 */
export function scaleW(base: number, size: WidgetFontSize): number {
  const d = fontDelta(size)
  // 比原先更克制：每档约 +4%，且不超过 base+10
  const w = Math.round(base * (1 + d * 0.04))
  return Math.max(30, Math.min(base + 10, w))
}

/** 名称列建议最小宽度（字号越大略增，仍优先保证可见） */
export function nameMinW(size: WidgetFontSize): number {
  return scaleW(56, size)
}

export function layoutPad(size: WidgetFontSize): {
  leading: number
  trailing: number
  top: number
  bottom: number
} {
  const d = fontDelta(size)
  // 四周预留足够空间，避免点状文本贴近边缘
  const h = Math.max(14, 16 + d)
  const v = Math.max(10, 12 + Math.floor(d / 2))
  return { leading: h, trailing: h, top: v, bottom: v }
}
