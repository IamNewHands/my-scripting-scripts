import { collect, expect } from "./runner"
import { migrateFontSize } from "../lib/storage"
import { getFontSize, scaleW } from "../widget/common/fontScale"
import { formatMoney, formatPct, pnlColor, formatPrice } from "../lib/format"

// ── migrateFontSize ──
collect("migrateFontSize 旧字符串档位映射", () => {
  expect(migrateFontSize("xsmall")).toBe(0.85)
  expect(migrateFontSize("small")).toBe(0.95)
  expect(migrateFontSize("medium")).toBe(1.0)
  expect(migrateFontSize("large")).toBe(1.1)
  expect(migrateFontSize("xlarge")).toBe(1.25)
})

collect("migrateFontSize 数字 0.8-1.5 直接返回", () => {
  expect(migrateFontSize(0.8)).toBe(0.8)
  expect(migrateFontSize(1.0)).toBe(1.0)
  expect(migrateFontSize(1.5)).toBe(1.5)
  expect(migrateFontSize(1.08)).toBe(1.08)
})

collect("migrateFontSize 80-150 整数百分比转缩放比", () => {
  expect(migrateFontSize(80)).toBe(0.8)
  expect(migrateFontSize(100)).toBe(1.0)
  expect(migrateFontSize(150)).toBe(1.5)
  expect(migrateFontSize(108)).toBe(1.08)
})

collect("migrateFontSize 非法值 → 1.0", () => {
  expect(migrateFontSize(undefined)).toBe(1.0)
  expect(migrateFontSize(null)).toBe(1.0)
  expect(migrateFontSize("unknown")).toBe(1.0)
  expect(migrateFontSize(NaN)).toBe(1.0)
  expect(migrateFontSize(0)).toBe(1.0)
  expect(migrateFontSize(2.0)).toBe(1.0)
})

// ── getFontSize ──
collect("getFontSize 正常缩放", () => {
  expect(getFontSize(10, 1.0)).toBe(10)
  expect(getFontSize(10, 1.2)).toBe(12)
  expect(getFontSize(10, 0.8)).toBe(8)
  expect(getFontSize(9, 1.5)).toBe(14)
  expect(getFontSize(6, 0.8)).toBe(6)
})

collect("getFontSize 最小字号 6", () => {
  expect(getFontSize(6, 0.5)).toBe(6)
  expect(getFontSize(4, 1.0)).toBe(6)
})

// ── scaleW ──
collect("scaleW 随缩放比变化", () => {
  expect(scaleW(44, 1.0)).toBe(44)
  expect(scaleW(44, 1.2)).toBe(53)
  expect(scaleW(44, 0.8)).toBe(35)
})

// ── formatMoney 万单位 ──
collect("formatMoney 万单位边界", () => {
  expect(formatMoney(10000, 0)).toBe("+1.00万")
  expect(formatMoney(9999, 0)).toBe("+9999")
  expect(formatMoney(-10000, 0)).toBe("-1.00万")
  expect(formatMoney(1234567, 0)).toBe("+123.46万")
})

// ── formatPct 边界 ──
collect("formatPct 零和边界", () => {
  expect(formatPct(0)).toBe("0.00%")
  expect(formatPct(0.0001)).toBe("+0.00%")
  expect(formatPct(-0.0001)).toBe("-0.00%")
})

// ── formatPrice ──
collect("formatPrice 按值域精度", () => {
  expect(formatPrice(0.1234)).toBe("0.1234")
  expect(formatPrice(1.5)).toBe("1.500")
  expect(formatPrice(100.5)).toBe("100.50")
  expect(formatPrice(null)).toBe("--")
})

// ── pnlColor ──
collect("pnlColor 零值/空值 → secondaryLabel", () => {
  expect(pnlColor(0)).toBe("secondaryLabel")
  expect(pnlColor(null)).toBe("secondaryLabel")
  expect(pnlColor(undefined)).toBe("secondaryLabel")
  expect(pnlColor(NaN)).toBe("secondaryLabel")
})

collect("pnlColor redUp=true 红涨绿跌", () => {
  expect(pnlColor(1.5, true)).toBe("red")
  expect(pnlColor(-1.5, true)).toBe("green")
})

collect("pnlColor redUp=false 绿涨红跌", () => {
  expect(pnlColor(1.5, false)).toBe("green")
  expect(pnlColor(-1.5, false)).toBe("red")
})