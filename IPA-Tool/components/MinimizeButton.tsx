import { Button, Script } from "scripting"

/**
 * 最小化到后台运行按钮
 *
 * 点击后隐藏当前 UI，但脚本实例继续在后台运行（下载任务等不受影响）。
 * 恢复：从 Scripting App 的运行中脚本列表重新进入。
 * 仅在当前环境支持最小化时显示。
 */
export default function MinimizeButton() {
  // 环境不支持最小化（如部分扩展上下文）时不渲染按钮
  if (!Script.supportsMinimization()) return null

  return (
    <Button
      title=""
      systemImage="arrow.down.right.and.arrow.up.left"
      action={() => Script.minimize()}
    />
  )
}