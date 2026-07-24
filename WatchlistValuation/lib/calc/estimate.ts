import type { FundHoldingRow, StockQuote } from "../types"
import { indexQuotes } from "../api/stock"

/**
 * 持仓加权估算基金当日涨跌幅（%）。
 * 
 * 策略：
 * 1. 对每只股票：权重% × 涨跌% 累加
 * 2. 若覆盖权重 < 100%（如前10大只占45%），归一化到100%
 *    estPct = sum / coveredWeight * 100
 * 3. 注意：基于季报持仓，可能与实际偏差较大
 * 
 * 参考：https://github.com/x2rr/funds/blob/master/src/background.js#L200
 */
export function estimateFundChangePct(
  holdings: FundHoldingRow[],
  quotes: StockQuote[]
): { estPct: number | null; coveredWeight: number } {
  if (!holdings.length) {
    return { estPct: null, coveredWeight: 0 }
  }
  const map = indexQuotes(quotes)
  let sum = 0
  let covered = 0
  let used = false

  for (const h of holdings) {
    const q =
      map.get(h.secid) ||
      map.get(h.code) ||
      map.get(`1.${h.code}`) ||
      map.get(`0.${h.code}`)
    const pct = q?.changePct
    if (pct == null || !Number.isFinite(pct)) continue
    const w = (h.weightPct || 0) / 100
    sum += w * pct
    covered += h.weightPct || 0
    used = true
  }

  if (!used || covered <= 0) return { estPct: null, coveredWeight: covered }
  
  // 归一化到100%：sum是加权贡献，covered是覆盖的权重%
  // 例如：sum=-1.413, covered=45.27 → estPct = -1.413/45.27*100 ≈ -3.12%
  const estPct = (sum / covered) * 100
  
  return { estPct, coveredWeight: covered }
}

export function estimateNav(
  nav: number | null,
  estPct: number | null
): number | null {
  if (nav == null || estPct == null) return null
  return nav * (1 + estPct / 100)
}
