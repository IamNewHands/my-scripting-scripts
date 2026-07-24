/** 红涨绿跌（与金价小组件一致用 red/green 字面量）。redUp=false 则取反 */
export function pnlColor(
  v: number | null | undefined,
  redUp: boolean = true
): "red" | "green" | "secondaryLabel" {
  if (v == null || !Number.isFinite(v) || v === 0) return "secondaryLabel"
  const up = v > 0
  if (redUp) return up ? "red" : "green"
  return up ? "green" : "red"
}

export function formatPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "--"
  const sign = v > 0 ? "+" : ""
  return `${sign}${v.toFixed(digits)}%`
}

export function formatMoney(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return "--"
  // 接近零：统一返回 "0.00"，避免浮点误差导致 "+0"/"-0"
  if (Math.abs(v) < 0.005) return "0.00"
  const sign = v > 0 ? "+" : ""
  const abs = Math.abs(v)
  // 小额（绝对値 <10）自动用 2 位小数，避免整数显示佔错
  const d = abs < 10 ? Math.max(digits, 2) : digits
  if (abs >= 10000) {
    return `${sign}${(v / 10000).toFixed(2)}万`
  }
  return `${sign}${v.toFixed(d)}`
}

export function formatPlainMoney(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "--"
  return v.toFixed(digits)
}

export function formatPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "--"
  if (v >= 100) return v.toFixed(2)
  if (v >= 1) return v.toFixed(3)
  return v.toFixed(4)
}

export function shortName(name: string, max = 8): string {
  if (!name) return "--"
  return name.length > max ? name.slice(0, max) : name
}

/** 缩写基金名称：去掉公司前缀（易方达、招商、华夏等），保留关键词 */
export function abbreviateFundName(name: string, maxLen = 6): string {
  if (!name) return "--"
  // 常见基金公司前缀列表
  const prefixes = [
    "易方达", "招商", "华夏", "南方", "嘉实", "广发", "汇添富", "富国",
    "博时", "鹏华", "工银瑞信", "建信", "兴全", "交银施罗德", "中欧",
    "银华", "国泰", "华安", "景顺长城", "上投摩根", "天弘", "诺安",
    "中银", "农银汇理", "光大保德信", "浦银安盛", "民生加银", "信诚",
    "金鹰", "泰达宏利", "国投瑞银", "华宝", "长盛", "东方", "万家",
  ]
  let result = name
  // 尝试去掉公司前缀
  for (const p of prefixes) {
    if (result.startsWith(p)) {
      result = result.slice(p.length)
      break
    }
  }
  // 去掉常见后缀（股票、混合、债券、指数、型、LOF、A、C等）
  result = result
    .replace(/股票型?$/, "")
    .replace(/混合型?$/, "")
    .replace(/债券型?$/, "")
    .replace(/指数型?$/, "")
    .replace(/\(LOF\)/, "")
    .replace(/[AC]$/, "")
    .trim()
  // 截断到最大长度
  return result.length > maxLen ? result.slice(0, maxLen) : result
}

export function formatClock(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

/** 今日 YYYY-MM-DD（东八区粗略：本地时区，用户在国内即可） */
export function todayDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
