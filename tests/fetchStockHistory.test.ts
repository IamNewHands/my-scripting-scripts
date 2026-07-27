import { collect, expect } from "./runner"
import { fetchStockHistory } from "../lib/api/stock"

/**
 * 回归：A 股 K 线从东财 push2his（被 iOS 网络层拦截）改为腾讯 web.ifzq.gtimg.cn fqkline。
 * 这些用例确保 A 股 / 港股 K 线正常返回。
 */

collect("fetchStockHistory A 股 600519 贵州茅台 7 日", async () => {
  const rows = await fetchStockHistory("1.600519", 7)
  expect(rows.length).toBeTruthy()
  // 最新一天日期
  const last = rows[rows.length - 1]
  expect(last.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(last.close).toBeTruthy()
  expect(typeof last.close).toBe("number")
})

collect("fetchStockHistory A 股 000001 平安银行 7 日", async () => {
  const rows = await fetchStockHistory("0.000001", 7)
  expect(rows.length).toBeTruthy()
  expect(typeof rows[0].close).toBe("number")
})

collect("fetchStockHistory A 股 300750 宁德时代 7 日", async () => {
  const rows = await fetchStockHistory("0.300750", 7)
  expect(rows.length).toBeTruthy()
  expect(typeof rows[0].close).toBe("number")
})

collect("fetchStockHistory 港股 00700 腾讯 7 日", async () => {
  const rows = await fetchStockHistory("116.00700", 7)
  expect(rows.length).toBeTruthy()
  expect(typeof rows[0].close).toBe("number")
})

collect("fetchStockHistory 美股 105.AAPL 返回空（腾讯不服务）", async () => {
  const rows = await fetchStockHistory("105.AAPL", 7)
  expect(rows).toEqual([])
})

collect("fetchStockHistory 非法 secid 返回空", async () => {
  const rows = await fetchStockHistory("abc", 7)
  expect(rows).toEqual([])
})
