/**
 * 三大市场（A 股 / 港股 / 美股）交易时段判定。
 * 用于决定小组件运行时是否需要从接口拉数据。
 *
 * 设计：
 * - 简化版只判断「周末 + 时段」，**不包含节假日表**
 * - 节假日表可后续加（先看效果，简单版已经覆盖 80% 场景）
 * - 全部用本地时间计算（手机系统时区应设为 Asia/Shanghai）
 *
 * 时段参考（北京时间）：
 * - A 股: 周一-周五 09:30-11:30 / 13:00-15:00
 * - 港股: 周一-周五 09:30-12:00 / 13:00-16:00
 * - 美股: 周一-周五 21:30-04:00 (夏令时) / 22:30-05:00 (冬令时)
 *        注意跨午夜，需特殊处理
 */

export type MarketKey = "cn" | "hk" | "us"

/** A 股 6 位数字 → "cn"；港股 5 位数字 → "hk"；美股字母 → "us" */
export function marketKeyOfCode(code: string, secid?: string): MarketKey | null {
  const c = String(code || "").trim()
  const sid = String(secid || "").trim()
  // 优先看 secid 前缀
  if (sid.startsWith("0.") || sid.startsWith("1.")) return "cn"
  if (sid.startsWith("116.")) return "hk"
  if (sid.startsWith("105.") || sid.startsWith("106.") || sid.startsWith("107.")) return "us"
  // 退化用 code 格式
  if (/^\d{6}$/.test(c)) return "cn"
  if (/^\d{5}$/.test(c)) return "hk"
  if (/^[A-Za-z]{1,5}$/.test(c)) return "us"
  return null
}

/** 取得当前时间对应的分钟数（本地时间 0-1439） */
function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** 周末判断：周日=0, 周六=6 */
function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/** A 股是否在交易时段（纯函数版本：不依赖 Date，用于测试） */
export function isCnMarketOpenByMinute(min: number, day: number): boolean {
  // day: 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  // 09:30-11:29 = 570-690 交易中（11:30 是收盘，11:31 后才认为收盘，11:30 本身仍算）
  // 采用 < 691 表示 11:30:00 仍交易、11:30:01 算收盘
  // 13:00-14:59 交易中，15:00 收盘
  return (min >= 570 && min < 691) || (min >= 780 && min < 901)
}

/** 港股是否在交易时段（纯函数版本） */
export function isHkMarketOpenByMinute(min: number, day: number): boolean {
  if (day === 0 || day === 6) return false
  // 12:00:00 仍交易中（最后一秒），12:00:01 午休
  // 16:00:00 仍交易中（最后一秒），16:00:01 收盘
  return (min >= 570 && min < 721) || (min >= 780 && min < 961)
}

/** 美股是否在交易时段（纯函数版本；注意跨午夜） */
export function isUsMarketOpenByMinute(min: number, day: number): boolean {
  // day: 0=Sun, 6=Sat
  if (day === 0) return false
  // 22:30 开盘到 04:00 收盘（北京时间，夏令时为 21:30 / 冬令时为 22:30）
  // 跨午夜判定：
  //   - 22:30-23:59：当前 day 是周一-周五（1-5）→ 开（周六 22:30 还未到下周一）
  //   - 00:00-04:00：当前 day 是周二-周六（2-6）→ 开
  if (min >= 22 * 60 + 30 && day >= 1 && day <= 5) return true
  if (min <= 4 * 60 && day >= 2 && day <= 6) return true
  return false
}

/** A 股是否在交易时段 */
export function isCnMarketOpen(now: Date = new Date()): boolean {
  return isCnMarketOpenByMinute(minuteOfDay(now), now.getDay())
}

/** 港股是否在交易时段 */
export function isHkMarketOpen(now: Date = new Date()): boolean {
  return isHkMarketOpenByMinute(minuteOfDay(now), now.getDay())
}

/**
 * 美股是否在交易时段（北京时间）。
 * 美股 9:30 PM - 4:00 AM ET → 北京时间 21:30-04:00（夏令时）/ 22:30-05:00（冬令时）
 * 简化版：取夏冬令时中点（22:30-04:30）作为估算窗口
 * 实际不需要绝对精确，覆盖 90% 场景即可
 */
export function isUsMarketOpen(now: Date = new Date()): boolean {
  return isUsMarketOpenByMinute(minuteOfDay(now), now.getDay())
}

/** 统一接口：按市场 key 判定 */
export function isMarketOpen(key: MarketKey, now: Date = new Date()): boolean {
  if (key === "cn") return isCnMarketOpen(now)
  if (key === "hk") return isHkMarketOpen(now)
  if (key === "us") return isUsMarketOpen(now)
  return false
}

/**
 * 给定一组自选（funds + stocks），判断是否**任一市场在交易**。
 * 任意一个开放就视作"需要拉数据"——因为快照要包含所有自选。
 */
export function anyMarketOpen(
  items: Array<{ code?: string; secid?: string }>,
  now: Date = new Date()
): boolean {
  for (const it of items) {
    const k = marketKeyOfCode(it.code || "", it.secid || "")
    if (k && isMarketOpen(k, now)) return true
  }
  // 全部是 A 股基金（无 secid 也没法判断）—— 视作 CN
  return isCnMarketOpen(now)
}
