import { collect, expect } from "./runner"
import { searchStock } from "../lib/api/stock"

/** 验证腾讯 smartbox 返回的 CJK 字段被正确反转义（无 \\uXXXX 显示给用户） */
collect("searchStock 兆易创新 → 中文名正确（非 unicode 转义）", async () => {
  const hits = await searchStock("兆易创新")
  // 至少命中一只 A 股 兆易创新
  const found = hits.find((h) => h.code === "603986")
  if (found) {
    expect(found.name).toBe("兆易创新")
    expect(found.name.includes("\\u")).toBe(false)
    expect(found.market).toBe("CN")
    expect(found.secid).toBe("1.603986")
  } else {
    // 至少返回结果且名字不含 \u
    expect(hits.length).toBeTruthy()
    for (const h of hits) {
      expect(h.name.includes("\\u")).toBe(false)
    }
  }
})

collect("searchStock 600519 贵州茅台 不含 unicode", async () => {
  const hits = await searchStock("600519")
  const found = hits.find((h) => h.code === "600519")
  expect(found).toBeTruthy()
  expect(found!.name).toBe("贵州茅台")
  expect(found!.name.includes("\\u")).toBe(false)
})

collect("searchStock 腾讯控股 港股 中文名正确", async () => {
  const hits = await searchStock("腾讯")
  const found = hits.find((h) => h.secid === "116.00700")
  if (found) {
    expect(found.name).toBe("腾讯控股")
    expect(found.name.includes("\\u")).toBe(false)
  }
})

collect("searchStock maotai 拼音搜索", async () => {
  const hits = await searchStock("maotai")
  const found = hits.find((h) => h.code === "600519")
  if (found) {
    expect(found.name.includes("\\u")).toBe(false)
    expect(found.name.length).toBeTruthy()
  }
})
