import { collect, expect } from "./runner"
import {
  abbreviateFundName,
  formatClock,
  formatMoney,
  formatPct,
  formatPlainMoney,
  formatPrice,
  pnlColor,
  shortName,
  todayDateStr,
} from "../lib/format"

// pnlColor
collect("pnlColor 0/null/undefined → secondaryLabel", () => {
  const e = expect(pnlColor(0))
  e.toBe("secondaryLabel")
  expect(pnlColor(null)).toBe("secondaryLabel")
  expect(pnlColor(undefined)).toBe("secondaryLabel")
  expect(pnlColor(NaN)).toBe("secondaryLabel")
})

collect("pnlColor redUp=true: 正→red, 负→green", () => {
  expect(pnlColor(1.5, true)).toBe("red")
  expect(pnlColor(-1.5, true)).toBe("green")
  expect(pnlColor(0.01, true)).toBe("red")
  expect(pnlColor(-0.01, true)).toBe("green")
})

collect("pnlColor redUp=false: 正→green, 负→red", () => {
  expect(pnlColor(1.5, false)).toBe("green")
  expect(pnlColor(-1.5, false)).toBe("red")
})

// formatPct
collect("formatPct 正常/边界/null", () => {
  expect(formatPct(1.234)).toBe("+1.23%")
  expect(formatPct(-2.5)).toBe("-2.50%")
  expect(formatPct(0)).toBe("0.00%")
  expect(formatPct(null)).toBe("--")
  expect(formatPct(undefined)).toBe("--")
  expect(formatPct(NaN)).toBe("--")
  // digits 参数
  expect(formatPct(1.23456, 4)).toBe("+1.2346%")
})

// formatMoney
collect("formatMoney 自动进位/防零跳变/万单位", () => {
  // digits=0 默认：1234.56 → "+1235"
  expect(formatMoney(1234.56)).toBe("+1235")
  // digits=2：1234.56 → "+1234.56"
  expect(formatMoney(1234.56, 2)).toBe("+1234.56")
  // abs >= 10000 走万单位
  expect(formatMoney(15000)).toBe("+1.50万")
  // 负数
  expect(formatMoney(-15000)).toBe("-1.50万")
  // 接近零：1e-4 → 0.00
  expect(formatMoney(0.001)).toBe("0.00")
  expect(formatMoney(-0.001)).toBe("0.00")
  // 小额(<10) 自动 2 位
  expect(formatMoney(9.999)).toBe("+10.00") // 9.999.toFixed(2) = "10.00"
  // null/NaN
  expect(formatMoney(null)).toBe("--")
  expect(formatMoney(NaN)).toBe("--")
})

// formatPlainMoney
collect("formatPlainMoney 简单", () => {
  expect(formatPlainMoney(1.234)).toBe("1.23")
  expect(formatPlainMoney(1.234, 3)).toBe("1.234")
  expect(formatPlainMoney(null)).toBe("--")
})

// formatPrice
collect("formatPrice 按值域精度", () => {
  // v < 1: 4 位
  expect(formatPrice(0.5)).toBe("0.5000")
  // 1 <= v < 100: 3 位
  expect(formatPrice(2.34567)).toBe("2.346")
  expect(formatPrice(1.5)).toBe("1.500")
  // v >= 100: 2 位
  expect(formatPrice(150.5)).toBe("150.50")
  expect(formatPrice(1234.567)).toBe("1234.57")
  // null
  expect(formatPrice(null)).toBe("--")
})

// shortName
collect("shortName 截断/空", () => {
  expect(shortName("贵州茅台", 4)).toBe("贵州茅台")
  expect(shortName("贵州茅台股份有限公司", 4)).toBe("贵州茅台")
  expect(shortName("", 4)).toBe("--")
  expect(shortName(null as unknown as string, 4)).toBe("--")
})

// abbreviateFundName
collect("abbreviateFundName 去公司前缀+常见后缀", () => {
  // “易方达”在前缀表里 → 去前缀 + 去后缀
  const r1 = abbreviateFundName("易方达沪深300ETF")
  expect(r1).toBeTruthy()
  expect(r1.includes("易方达")).toBe(false)
  // “招商”在前缀表里
  const r2 = abbreviateFundName("招商中证白酒指数")
  expect(r2.includes("招商")).toBe(false)
  // 不匹配表中的前缀 → 保留原名
  expect(abbreviateFundName("某某小盘精选")).toBe("某某小盘精选")
  // 空
  expect(abbreviateFundName("")).toBe("--")
})

// formatClock
collect("formatClock 补零 HH:MM", () => {
  const d = new Date(2026, 6, 24, 9, 5)
  expect(formatClock(d.getTime())).toBe("09:05")
  const d2 = new Date(2026, 6, 24, 23, 59)
  expect(formatClock(d2.getTime())).toBe("23:59")
})

// todayDateStr
collect("todayDateStr 格式 YYYY-MM-DD", () => {
  const s = todayDateStr()
  expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
