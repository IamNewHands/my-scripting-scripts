import { rates } from "../class/rate"

/** 从本地化价格字符串中尽量提取数字 */
export function parsePriceNumber(price: string): number | null {
  if (!price) return null
  const s = String(price).trim()
  // 免费类文案
  if (/^(free|無料|免费|免費)$/i.test(s)) return 0

  // 去掉货币字母/符号，保留数字与分隔
  let t = s.replace(/[^\d.,]/g, "")
  if (!t) return null

  if (t.includes(".") && t.includes(",")) {
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) {
      t = t.replace(/\./g, "").replace(",", ".")
    } else {
      t = t.replace(/,/g, "")
    }
  } else if (t.includes(",")) {
    if (/,\d{1,2}$/.test(t)) t = t.replace(",", ".")
    else t = t.replace(/,/g, "")
  }

  const n = parseFloat(t)
  if (isNaN(n)) return null
  return n
}

/** 将某币种金额换算为基准货币（默认 CNY）数值 */
export function convertToBase(amount: number, currencyCode: string): number | null {
  if (!isFinite(amount)) return null
  if (amount === 0) return 0
  const code = String(currencyCode || "").toUpperCase()
  if (!code || code === rates.type) return amount
  const rate = rates.getRateSync(code)
  if (rate === null) return null
  return amount / rate
}

/** 格式化为人民币展示 */
export function formatCNY(amount: number | null): string {
  if (amount === null || !isFinite(amount)) return "—"
  if (amount === 0) return "¥0.00"
  return `¥${amount.toFixed(2)}`
}

/**
 * 换算到基准货币展示串。
 * 同币种或无法解析时返回 ""（UI 只显示原价）。
 */
export async function formatPrice(price: string, rateType: string) {
  if (!price) return ""
  if (rates.type === rateType) return ""
  const n = parsePriceNumber(price)
  if (n === null) return ""
  if (n === 0) return ""
  const rate = await rates.getRate(rateType)
  if (rate === null) return ""
  return `≈ ¥${(n / rate).toFixed(2)}`
}

/** 同步版：原价文案 + 币种 → 人民币文案（需先 rates.init） */
export function toCNYLabel(priceText: string, currencyCode?: string): string {
  const n = parsePriceNumber(priceText)
  if (n === null) return "—"
  if (n === 0) return "¥0.00"
  const code = (currencyCode || guessCurrencyFromPrice(priceText) || "").toUpperCase()
  if (!code) return "—"
  const cny = convertToBase(n, code)
  return formatCNY(cny)
}

function guessCurrencyFromPrice(price: string): string | null {
  const s = String(price)
  if (/HK\$|HKD/i.test(s)) return "HKD"
  if (/NT\$|TWD/i.test(s)) return "TWD"
  if (/A\$|AUD/i.test(s)) return "AUD"
  if (/C\$|CAD/i.test(s)) return "CAD"
  if (/¥|CNY|RMB|元/.test(s) && !/円/.test(s)) return "CNY"
  if (/円|JPY|JP¥/i.test(s)) return "JPY"
  if (/€|EUR/i.test(s)) return "EUR"
  if (/£|GBP/i.test(s)) return "GBP"
  if (/\$|USD/i.test(s)) return "USD"
  if (/₩|KRW/i.test(s)) return "KRW"
  if (/S\$|SGD/i.test(s)) return "SGD"
  return null
}

/** 文件大小 */
export function formatBytes(n: any): string {
  const v = Number(n)
  if (!isFinite(v) || v <= 0) return "—"
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 评分 */
export function formatRating(n: any, count?: any): string {
  const r = Number(n)
  if (!isFinite(r) || r <= 0) return "—"
  const c = Number(count)
  if (isFinite(c) && c > 0) {
    if (c >= 10000) return `${r.toFixed(1)}（${(c / 10000).toFixed(1)}万）`
    return `${r.toFixed(1)}（${c}）`
  }
  return r.toFixed(1)
}
