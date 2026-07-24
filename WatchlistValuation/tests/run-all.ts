/**
 * 单元测试入口：导入所有 test 文件（注册用例），然后执行并打印结果。
 * 运行：scripting-ts run tests/run-all.ts
 */
import { Script } from "scripting"
import { run } from "./runner"

// 副作用：注册测试
import "./format.test"
import "./estimate.test"
import "./profit.test"
import "./http.test"
import "./debounce.test"
import "./fontScale.test"
import "./searchStock.test"
import "./fetchStockHistory.test"
import "./marketHours.test"

async function main() {
  const r = await run()
  // 输出人类可读摘要
  const lines: string[] = []
  lines.push("=".repeat(40))
  lines.push(`总测试数: ${r.total}`)
  lines.push(`通过:     ${r.passed}`)
  lines.push(`失败:     ${r.failed}`)
  lines.push(`耗时:     ${r.durationMs}ms`)
  if (r.failures.length > 0) {
    lines.push("-".repeat(40))
    lines.push("失败用例:")
    for (const f of r.failures) {
      lines.push(`  ✗ ${f.name}`)
      lines.push(`    ${f.error}`)
    }
  }
  lines.push("=".repeat(40))
  console.log(lines.join("\n"))
  Script.exit({
    total: r.total,
    passed: r.passed,
    failed: r.failed,
    failures: r.failures,
  })
}

main()
