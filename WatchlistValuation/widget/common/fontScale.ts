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

/** 规范化缩放比：非法值回落 1.0，限制 0.8–1.5 */
function normalizeScale(scale: WidgetFontSize): number {
  const n = typeof scale === "number" ? scale : Number(scale)
  if (!Number.isFinite(n)) return 1
  if (n > 3) return Math.max(0.8, Math.min(1.5, n / 100))
  return Math.max(0.8, Math.min(1.5, n))
}

/** 根据字号缩放比例计算实际字号（fontSize 为 0.8-1.5 的数字） */
export function getFontSize(base: number, scale: WidgetFontSize): number {
  return Math.max(6, Math.round(base * normalizeScale(scale)))
}

/**
 * 数值列宽度：随字号缩放，避免大字号把名称列挤没。
 * 名称列始终用 maxWidth: infinity 吃剩余空间。
 */
export function scaleW(base: number, scale: WidgetFontSize): number {
  return Math.max(20, Math.round(base * normalizeScale(scale)))
}

/** 名称列建议最小宽度（字号越大略增，仍优先保证可见） */
export function nameMinW(scale: WidgetFontSize): number {
  return scaleW(56, scale)
}

export function layoutPad(scale: WidgetFontSize): {
  leading: number
  trailing: number
  top: number
  bottom: number
} {
  // 四周预留足够空间，避免点状文本贴近边缘
  const s = normalizeScale(scale)
  const h = Math.max(12, Math.round(16 * s))
  const v = Math.max(8, Math.round(12 * s))
  return { leading: h, trailing: h, top: v, bottom: v }
}
