import { collect, expect } from "./runner"
import { isETF, formatYmd } from "../widget/common/fontScale"

collect("isETF 6 位代码前缀判定", () => {
  // 沪市 ETF
  expect(isETF("510300")).toBe(true)
  expect(isETF("512880")).toBe(true)
  expect(isETF("588000")).toBe(true)
  expect(isETF("588080")).toBe(true)
  expect(isETF("560000")).toBe(true)
  expect(isETF("159001")).toBe(true)
  // 非 ETF
  expect(isETF("600519")).toBe(false)
  expect(isETF("000001")).toBe(false)
  expect(isETF("300750")).toBe(false)
  expect(isETF("688981")).toBe(false)
  // 边界
  expect(isETF("")).toBe(false)
  expect(isETF("12345")).toBe(false) // 不到 6 位
})

collect("formatYmd YYYY-MM-DD 补零", () => {
  const d = new Date(2026, 0, 5) // 1 月 5 日
  expect(formatYmd(d.getTime())).toBe("2026-01-05")
  const d2 = new Date(2026, 11, 31)
  expect(formatYmd(d2.getTime())).toBe("2026-12-31")
})
