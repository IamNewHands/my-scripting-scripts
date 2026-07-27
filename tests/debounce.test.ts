import { collect, expect } from "./runner"
import { debounce } from "../lib/util/debounce"

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

collect("debounce 连续调用只触发一次", async () => {
  let calls = 0
  const fn = debounce((x: number) => { calls += x }, 50)
  fn(1)
  fn(2)
  fn(3)
  await sleep(120)
  expect(calls).toBe(3) // 最后一次 = 1+2 已合并成 3
})

collect("debounce flush 立即触发", async () => {
  let calls = 0
  const fn = debounce((x: number) => { calls += x }, 5000)
  fn(10)
  fn.flush()
  expect(calls).toBe(10)
})

collect("debounce cancel 不触发", async () => {
  let calls = 0
  const fn = debounce((x: number) => { calls += x }, 30)
  fn(1)
  fn.cancel()
  await sleep(80)
  expect(calls).toBe(0)
})

collect("debounce 串行多次触发", async () => {
  let calls: number[] = []
  const fn = debounce((x: number) => { calls.push(x) }, 30)
  fn(1)
  await sleep(60)
  fn(2)
  await sleep(60)
  fn(3)
  await sleep(60)
  expect(calls).toEqual([1, 2, 3])
})
