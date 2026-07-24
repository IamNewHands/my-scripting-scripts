/**
 * 极简测试运行器：collect() 注册测试，run() 执行，summary() 输出。
 * 失败立即停止（fail-fast），适合本地开发。
 */

export type TestFn = () => void | Promise<void>

const tests: Array<{ name: string; fn: TestFn }> = []

/** 注册一个测试用例 */
export function collect(name: string, fn: TestFn): void {
  tests.push({ name, fn })
}

/** 极简断言工具 */
export function expect<T>(actual: T): {
  toBe: (expected: T) => void
  toEqual: (expected: T) => void
  toBeNull: () => void
  toBeCloseTo: (expected: number, digits?: number) => void
  toBeTruthy: () => void
  toBeFalsy: () => void
  toThrow: (matcher?: RegExp | string) => void
  toContain: (item: unknown) => void
  toMatch: (re: RegExp) => void
} {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`expected ${stringify(actual)} === ${stringify(expected)}`)
      }
    },
    toEqual(expected: T) {
      if (!deepEqual(actual, expected)) {
        throw new Error(`expected ${stringify(actual)} deep-equal ${stringify(expected)}`)
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`expected ${stringify(actual)} to be null`)
      }
    },
    toBeCloseTo(expected: number, digits = 5) {
      if (typeof actual !== "number") {
        throw new Error(`actual is not a number: ${stringify(actual)}`)
      }
      const tol = Math.pow(10, -digits) / 2
      if (Math.abs((actual as number) - expected) > tol) {
        throw new Error(`expected ${actual} ≈ ${expected} (digits=${digits})`)
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`expected ${stringify(actual)} to be truthy`)
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`expected ${stringify(actual)} to be falsy`)
      }
    },
    toThrow(matcher?: RegExp | string) {
      let thrown: unknown = null
      try {
        if (typeof actual === "function") {
          ;(actual as unknown as () => unknown)()
        }
      } catch (e) {
        thrown = e
      }
      if (thrown == null) {
        throw new Error(`expected to throw, but did not`)
      }
      if (matcher) {
        const msg = String((thrown as Error)?.message ?? thrown)
        if (matcher instanceof RegExp) {
          if (!matcher.test(msg)) {
            throw new Error(`thrown message ${msg} does not match ${matcher}`)
          }
        } else if (!msg.includes(matcher)) {
          throw new Error(`thrown message ${msg} does not include ${matcher}`)
        }
      }
    },
    toContain(item: unknown) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) {
          throw new Error(`array ${stringify(actual)} does not contain ${stringify(item)}`)
        }
      } else if (typeof actual === "string") {
        if (!(actual as string).includes(String(item))) {
          throw new Error(`string ${actual} does not contain ${String(item)}`)
        }
      } else {
        throw new Error(`toContain not supported for ${stringify(actual)}`)
      }
    },
    toMatch(re: RegExp) {
      if (typeof actual !== "string") {
        throw new Error(`toMatch requires string, got ${stringify(actual)}`)
      }
      if (!re.test(actual as string)) {
        throw new Error(`string ${actual} does not match ${re}`)
      }
    },
  }
}

function stringify(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false
    return true
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object)
    const bk = Object.keys(b as object)
    if (ak.length !== bk.length) return false
    for (const k of ak) {
      if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
        return false
      }
    }
    return true
  }
  return false
}

export type RunResult = {
  total: number
  passed: number
  failed: number
  durationMs: number
  failures: Array<{ name: string; error: string }>
}

/** 执行所有注册测试（fail-fast：遇失败立即停止） */
export async function run(): Promise<RunResult> {
  const start = Date.now()
  const failures: Array<{ name: string; error: string }> = []
  let passed = 0
  for (const t of tests) {
    try {
      await t.fn()
      passed++
    } catch (e) {
      failures.push({ name: t.name, error: e instanceof Error ? e.message : String(e) })
      break
    }
  }
  return {
    total: tests.length,
    passed,
    failed: failures.length,
    durationMs: Date.now() - start,
    failures,
  }
}
