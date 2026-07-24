import { collect, expect } from "./runner"
import {
  buildFundRow,
  buildStockRow,
  fundDayPnl,
  holdPnlFromAmount,
  isOfficialNavDay,
  migrateFundItem,
  migrateStockItem,
  resolveFundShares,
  resolveStockQuantity,
  summarize,
} from "../lib/calc/profit"
import type { FundItem, StockItem } from "../lib/types"

// resolveFundShares
collect("resolveFundShares buyNav 优先", () => {
  const item: FundItem = { code: "1", name: "x", costAmount: 1000, buyNav: 2, shares: 999 }
  expect(resolveFundShares(item, 1.5)).toBeCloseTo(500, 5)
})

collect("resolveFundShares buyNav 缺/0 → 回落 shares", () => {
  const item: FundItem = { code: "1", name: "x", costAmount: 0, buyNav: 0, shares: 333 }
  expect(resolveFundShares(item, 1.5)).toBe(333)
})

collect("resolveFundShares 兜底用 currentNav", () => {
  const item: FundItem = { code: "1", name: "x", costAmount: 1000, buyNav: 0, shares: 0 }
  expect(resolveFundShares(item, 2)).toBeCloseTo(500, 5)
})

collect("resolveFundShares 全部缺失 → 0", () => {
  const item: FundItem = { code: "1", name: "x", costAmount: 0, buyNav: 0 }
  expect(resolveFundShares(item, null)).toBe(0)
})

// resolveStockQuantity（对称）
collect("resolveStockQuantity 同样 buyPrice 优先", () => {
  const s: StockItem = {
    code: "1",
    name: "x",
    market: "CN",
    secid: "1.1",
    costAmount: 10000,
    buyPrice: 10,
    quantity: 999,
  }
  expect(resolveStockQuantity(s, 12)).toBeCloseTo(1000, 5)
})

// fundDayPnl
collect("fundDayPnl 官方净值日：shares × (今日 - 昨日)", () => {
  // shares=1000, 今日净 1.1, 今日涨 +10% → 昨日 = 1.1/1.1 = 1.0
  const r = fundDayPnl({ shares: 1000, nav: 1.1, navChgPct: 10, estNav: null, isOfficial: true })
  expect(r).toBeCloseTo(100, 5) // 1000 * (1.1 - 1.0) = 100
})

collect("fundDayPnl 盘中估算：shares × (estNav - nav)", () => {
  // shares=1000, nav=1.0, estNav=1.02
  const r = fundDayPnl({ shares: 1000, nav: 1.0, navChgPct: null, estNav: 1.02, isOfficial: false })
  expect(r).toBeCloseTo(20, 5)
})

collect("fundDayPnl 无 shares → null", () => {
  expect(fundDayPnl({ shares: 0, nav: 1.1, navChgPct: 10, estNav: null, isOfficial: true })).toBeNull()
})

// holdPnlFromAmount
collect("holdPnlFromAmount 持有收益 + 收益率", () => {
  const r = holdPnlFromAmount(1100, 1000)
  expect(r.holdPnl).toBe(100)
  expect(r.holdRate).toBeCloseTo(10, 5)
})

collect("holdPnlFromAmount 负收益", () => {
  const r = holdPnlFromAmount(900, 1000)
  expect(r.holdPnl).toBe(-100)
  expect(r.holdRate).toBeCloseTo(-10, 5)
})

collect("holdPnlFromAmount null/costAmount=0 → null", () => {
  expect(holdPnlFromAmount(null, 1000).holdPnl).toBeNull()
  expect(holdPnlFromAmount(1100, 0).holdPnl).toBeNull()
})

// isOfficialNavDay
collect("isOfficialNavDay 今天日期 → true", () => {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  expect(isOfficialNavDay(today)).toBe(true)
})

collect("isOfficialNavDay 昨天/空 → false", () => {
  expect(isOfficialNavDay("2020-01-01")).toBe(false)
  expect(isOfficialNavDay("")).toBe(false)
  expect(isOfficialNavDay("--")).toBe(false)
})

// buildFundRow
collect("buildFundRow 净值日：changePct=navChgPct, isOfficial=true", () => {
  const item: FundItem = { code: "1", name: "基金A", costAmount: 1000, buyNav: 1, shares: 1000 }
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const r = buildFundRow(item, {
    code: "1",
    name: "基金A",
    nav: 1.1,
    navDate: todayStr,
    navChgPct: 10,
  }, 0, 0, 1.0, 0)
  expect(r.isOfficial).toBe(true)
  expect(r.changePct).toBe(10)
  expect(r.shares).toBe(1000)
  expect(r.marketValue).toBeCloseTo(1100, 5)
  expect(r.dayPnl).toBeCloseTo(100, 5) // 净值日：shares * (1.1-1.0) = 100
  expect(r.holdPnl).toBeCloseTo(100, 5)
  expect(r.holdRate).toBeCloseTo(10, 5)
})

collect("buildFundRow 盘中估算：changePct=estPct, isOfficial=false", () => {
  const item: FundItem = { code: "1", name: "基金A", costAmount: 1000, buyNav: 1, shares: 1000 }
  const r = buildFundRow(item, {
    code: "1",
    name: "基金A",
    nav: 1.0,
    navDate: "2020-01-01",
    navChgPct: null,
  }, 1.5, 1.015, null, null)
  expect(r.isOfficial).toBe(false)
  expect(r.changePct).toBe(1.5)
  expect(r.estNav).toBe(1.015)
  expect(r.marketValue).toBeCloseTo(1015, 5) // 1000 * 1.015
  expect(r.dayPnl).toBeCloseTo(15, 5)
})

// buildStockRow
collect("buildStockRow 完整", () => {
  const item: StockItem = {
    code: "1",
    name: "股票A",
    market: "CN",
    secid: "1.1",
    costAmount: 10000,
    buyPrice: 10,
    quantity: 1000,
  }
  const r = buildStockRow(item, {
    code: "1", name: "股票A", secid: "1.1", price: 11, changePct: 10, change: 1,
  })
  expect(r.quantity).toBe(1000)
  expect(r.marketValue).toBe(11000)
  // dayPnl = marketValue × changePct% = 11000 × 10% = 1100
  expect(r.dayPnl).toBeCloseTo(1100, 5)
  expect(r.holdPnl).toBe(1000)
  expect(r.holdRate).toBeCloseTo(10, 5)
})

collect("buildStockRow 缺 changePct 改用 change × quantity", () => {
  const item: StockItem = {
    code: "1", name: "x", market: "CN", secid: "1.1",
    costAmount: 0, buyPrice: 0, quantity: 100,
  }
  const r = buildStockRow(item, {
    code: "1", name: "x", secid: "1.1", price: 10, changePct: null, change: 0.5,
  })
  expect(r.dayPnl).toBe(50) // 0.5 * 100
})

// summarize
collect("summarize 合计/忽略 null", () => {
  const r = summarize([
    { dayPnl: 10, holdPnl: 100, marketValue: 1100, costAmount: 1000 },
    { dayPnl: 20, holdPnl: -50, marketValue: 950, costAmount: 1000 },
    { dayPnl: null, holdPnl: null, marketValue: null, costAmount: 0 },
  ])
  expect(r.dayPnl).toBe(30)
  expect(r.holdPnl).toBe(50)
  expect(r.marketValue).toBe(2050)
  expect(r.costAmount).toBe(2000)
})

// migrate
collect("migrateFundItem 旧版 shares 反推 buyNav", () => {
  const m = migrateFundItem({ code: "1", name: "x", costAmount: 1000, shares: 500 })
  expect(m).toBeTruthy()
  expect(m!.buyNav).toBeCloseTo(2, 5)
  expect(m!.shares).toBe(500)
})

collect("migrateFundItem 新版 buyNav 已有则保留", () => {
  const m = migrateFundItem({ code: "1", name: "x", costAmount: 1000, buyNav: 2.5, shares: 400 })
  expect(m!.buyNav).toBe(2.5)
  expect(m!.shares).toBe(400)
})

collect("migrateFundItem 无效输入 → null", () => {
  expect(migrateFundItem(null)).toBeNull()
  expect(migrateFundItem({})).toBeNull()
  expect(migrateFundItem({ code: 123 })).toBeNull()
})

collect("migrateStockItem 旧版 quantity 反推 buyPrice", () => {
  const m = migrateStockItem({
    code: "1", name: "x", secid: "1.1", market: "CN",
    costAmount: 10000, quantity: 1000,
  })
  expect(m!.buyPrice).toBeCloseTo(10, 5)
  expect(m!.market).toBe("CN")
})

collect("migrateStockItem market 异常 → CN 兜底", () => {
  const m = migrateStockItem({
    code: "1", name: "x", secid: "1.1", market: "??",
    costAmount: 0, buyPrice: 0, quantity: 0,
  })
  expect(m!.market).toBe("CN")
})
