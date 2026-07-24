import { collect, expect } from "./runner"
import { parseNumber } from "../lib/http"

collect("parseNumber 正常/边界/null/undefined/空串/dash", () => {
  expect(parseNumber("1.5")).toBe(1.5)
  expect(parseNumber(1.5)).toBe(1.5)
  expect(parseNumber("-1.5")).toBe(-1.5)
  expect(parseNumber("  3.14  ")).toBe(3.14)
  expect(parseNumber("")).toBeNull()
  expect(parseNumber("--")).toBeNull()
  expect(parseNumber(null)).toBeNull()
  expect(parseNumber(undefined)).toBeNull()
  expect(parseNumber("abc")).toBeNull()
  expect(parseNumber(NaN)).toBeNull()
  expect(parseNumber(Infinity)).toBeNull()
})
