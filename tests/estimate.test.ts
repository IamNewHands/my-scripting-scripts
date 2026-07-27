import { collect, expect } from "./runner"
import { estimateFundChangePct, estimateNav } from "../lib/calc/estimate"
import type { FundHoldingRow, StockQuote } from "../lib/types"

const h = (code: string, weightPct: number, secid?: string): FundHoldingRow => ({
  code,
  name: code,
  weightPct,
  exchange: secid ? secid.split(".")[0] : "1",
  secid: secid || `1.${code}`,
})

const q = (code: string, changePct: number, secid?: string): StockQuote => ({
  code,
  name: code,
  secid: secid || `1.${code}`,
  price: 10,
  changePct,
  change: 0,
})

collect("estimateFundChangePct 空持仓 → null", () => {
  const r = estimateFundChangePct([], [q("1", 1)])
  expect(r.estPct).toBeNull()
  expect(r.coveredWeight).toBe(0)
})

collect("estimateFundChangePct 全无行情 → null", () => {
  const r = estimateFundChangePct([h("1", 5)], [])
  expect(r.estPct).toBeNull()
  expect(r.coveredWeight).toBe(0)
})

collect("estimateFundChangePct 全覆盖 1只 100%：-1.413", () => {
  // 1 只持仓 100% 权重，涨跌幅 -1.413%：归一化 = -1.413
  const holdings = [h("1", 100, "1.000001")]
  const quotes = [q("000001", -1.413, "1.000001")]
  const r = estimateFundChangePct(holdings, quotes)
  expect(r.estPct).toBeCloseTo(-1.413, 3)
  expect(r.coveredWeight).toBeCloseTo(100, 2)
})

collect("estimateFundChangePct 单只 45.27% 覆盖归一化为 pct 本人（该仓库设计）", () => {
  // 作者设计：归一化 = sum / covered * 100，
  // sum = 0.4527 * -1.413 = -0.6396；covered = 45.27
  // estPct = -0.6396 / 45.27 * 100 = -1.413（等价于直接使用原 pct）
  // 隐含假设：剩余 54.73% 走势与已知部分一致。
  const holdings = [h("1", 45.27, "1.000001")]
  const quotes = [q("000001", -1.413, "1.000001")]
  const r = estimateFundChangePct(holdings, quotes)
  expect(r.estPct).toBeCloseTo(-1.413, 3)
  expect(r.coveredWeight).toBeCloseTo(45.27, 2)
})

collect("estimateFundChangePct 多只覆盖 100% 加权", () => {
  // 2 只各占 50%，一只 +2%，一只 -4%
  // 归一化：(0.5*2 + 0.5*-4) / (50+50) * 100 = (1 - 2) / 100 * 100 = -1
  const holdings = [h("A", 50, "1.A"), h("B", 50, "1.B")]
  const quotes = [q("A", 2, "1.A"), q("B", -4, "1.B")]
  const r = estimateFundChangePct(holdings, quotes)
  expect(r.estPct).toBeCloseTo(-1, 5)
  expect(r.coveredWeight).toBe(100)
})

collect("estimateFundChangePct 部分覆盖：跳过无行情", () => {
  const holdings = [h("A", 10, "1.A"), h("B", 20, "1.B"), h("C", 30, "1.C")]
  const quotes = [q("A", 5, "1.A"), q("C", -3, "1.C")] // 缺 B
  const r = estimateFundChangePct(holdings, quotes)
  // sum = 0.1*5 + 0.3*-3 = 0.5 - 0.9 = -0.4
  // covered = 10 + 30 = 40
  // 归一化 = -0.4 / 40 * 100 = -1
  expect(r.estPct).toBeCloseTo(-1, 5)
  expect(r.coveredWeight).toBe(40)
})

collect("estimateFundChangePct 混合 secid/code 索引都能命中", () => {
  const holdings = [h("600519", 30, "1.600519")]
  // 只用 code 提供的 quote
  const quotes = [q("600519", 1.5)]
  const r = estimateFundChangePct(holdings, quotes)
  // 30% 覆盖、1 只 +1.5%：归一化 = 1.5
  expect(r.estPct).toBeCloseTo(1.5, 3)
})

// estimateNav
collect("estimateNav 基础换算", () => {
  expect(estimateNav(2.0, 1.5)).toBeCloseTo(2.03, 5)
  expect(estimateNav(null, 1.5)).toBeNull()
  expect(estimateNav(2.0, null)).toBeNull()
  expect(estimateNav(2.0, 0)).toBe(2.0)
})
