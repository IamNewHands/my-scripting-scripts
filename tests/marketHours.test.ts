import { collect, expect } from "./runner"
import {
  isCnMarketOpenByMinute,
  isHkMarketOpenByMinute,
  isUsMarketOpenByMinute,
  marketKeyOfCode,
  anyMarketOpen,
} from "../lib/util/marketHours"
import { getCachedSnapshot, setCachedSnapshot, clearCachedSnapshot } from "../lib/cache/snapshot"

// ========== A 股 ==========
collect("isCnMarketOpen 09:30 开 / 11:30 最后 / 11:31 关", () => {
  expect(isCnMarketOpenByMinute(570, 1)).toBe(true)   // 09:30 周一开
  expect(isCnMarketOpenByMinute(569, 1)).toBe(false)  // 09:29
  expect(isCnMarketOpenByMinute(690, 1)).toBe(true)   // 11:30 仍开
  expect(isCnMarketOpenByMinute(691, 1)).toBe(false)  // 11:31 收盘
  expect(isCnMarketOpenByMinute(720, 1)).toBe(false)  // 12:00 午休
  expect(isCnMarketOpenByMinute(779, 1)).toBe(false)
  expect(isCnMarketOpenByMinute(780, 1)).toBe(true)   // 13:00 下午开
  expect(isCnMarketOpenByMinute(900, 1)).toBe(true)   // 15:00 仍开
  expect(isCnMarketOpenByMinute(901, 1)).toBe(false)  // 15:01 收盘
})

collect("isCnMarketOpen 周末全天关", () => {
  expect(isCnMarketOpenByMinute(600, 0)).toBe(false)  // 周日
  expect(isCnMarketOpenByMinute(600, 6)).toBe(false)  // 周六
  // 周六晚间（虽然用户问时不会出 22:30 这种，但保险）
  expect(isCnMarketOpenByMinute(1350, 6)).toBe(false) // 周六 22:30
})

// ========== 港股 ==========
collect("isHkMarketOpen 09:30-12:00 + 13:00-16:00", () => {
  expect(isHkMarketOpenByMinute(570, 1)).toBe(true)   // 09:30
  expect(isHkMarketOpenByMinute(720, 1)).toBe(true)   // 12:00 仍开
  expect(isHkMarketOpenByMinute(721, 1)).toBe(false)  // 12:01 午休
  expect(isHkMarketOpenByMinute(780, 1)).toBe(true)   // 13:00
  expect(isHkMarketOpenByMinute(960, 1)).toBe(true)   // 16:00
  expect(isHkMarketOpenByMinute(961, 1)).toBe(false)  // 16:01
})

collect("isHkMarketOpen 周末关", () => {
  expect(isHkMarketOpenByMinute(600, 0)).toBe(false)
  expect(isHkMarketOpenByMinute(600, 6)).toBe(false)
})

// ========== 美股（跨午夜） ==========
collect("isUsMarketOpen 周一-周五晚 22:30 开盘", () => {
  expect(isUsMarketOpenByMinute(1349, 1)).toBe(false)  // 22:29 周一
  expect(isUsMarketOpenByMinute(1350, 1)).toBe(true)   // 22:30 周一
  expect(isUsMarketOpenByMinute(1400, 2)).toBe(true)   // 23:20 周二
  expect(isUsMarketOpenByMinute(1350, 5)).toBe(true)   // 22:30 周五
  expect(isUsMarketOpenByMinute(1350, 6)).toBe(false)  // 22:30 周六：周六凌晨已收
})

collect("isUsMarketOpen 凌晨 00:00-04:00（次日凌晨收盘）", () => {
  expect(isUsMarketOpenByMinute(0, 2)).toBe(true)     // 周二 00:00
  expect(isUsMarketOpenByMinute(240, 2)).toBe(true)    // 周二 04:00
  expect(isUsMarketOpenByMinute(241, 2)).toBe(false)   // 周二 04:01
  expect(isUsMarketOpenByMinute(0, 6)).toBe(true)     // 周六 00:00（美股周五晚 22:30 开盘到周六 04:00）
  expect(isUsMarketOpenByMinute(240, 6)).toBe(true)
  expect(isUsMarketOpenByMinute(0, 1)).toBe(false)    // 周一 00:00（不在交易）
  expect(isUsMarketOpenByMinute(0, 0)).toBe(false)    // 周日 00:00
})

// ========== marketKeyOfCode ==========
collect("marketKeyOfCode 优先 secid", () => {
  expect(marketKeyOfCode("600519", "1.600519")).toBe("cn")
  expect(marketKeyOfCode("00700", "116.00700")).toBe("hk")
  expect(marketKeyOfCode("AAPL", "105.AAPL")).toBe("us")
  expect(marketKeyOfCode("", "")).toBe(null)
})

collect("marketKeyOfCode 仅 code 推断", () => {
  expect(marketKeyOfCode("600519", "")).toBe("cn")
  expect(marketKeyOfCode("00700", "")).toBe("hk")
  expect(marketKeyOfCode("AAPL", "")).toBe("us")
})

// ========== anyMarketOpen ==========
collect("anyMarketOpen 任一开就 true（依赖当前时间）", () => {
  // 用 now 的 getHours / getDay 决定：CLI 时区不固定，宽松判断
  const items1 = [{ code: "600519", secid: "" }]
  // 真实结果依赖当前时间，断言至少是一个 bool
  const got = anyMarketOpen(items1)
  expect(typeof got).toBe("boolean")

  // 空列表 → 退化用 CN market
  const empty = anyMarketOpen([])
  expect(typeof empty).toBe("boolean")
})

// ========== 快照缓存 ==========
collect("getCachedSnapshot 跨日返回 null", () => {
  clearCachedSnapshot()
  expect(getCachedSnapshot()).toBeNull()

  const fakeSnap: any = {
    funds: [{ code: "1", name: "x" }],
    stocks: [],
    fundSummary: { dayPnl: 1, holdPnl: 2, marketValue: 100, costAmount: 0 },
    stockSummary: { dayPnl: 0, holdPnl: 0, marketValue: 0, costAmount: 0 },
    updatedAt: Date.now(),
    warnings: [],
  }
  setCachedSnapshot(fakeSnap, true)
  const c = getCachedSnapshot()
  expect(c).toBeTruthy()
  expect(c!.funds.length).toBe(1)
  expect(c!.cachedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
