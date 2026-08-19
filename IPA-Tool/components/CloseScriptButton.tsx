import { Button, Script } from "scripting"

/**
 * 「关闭脚本」按钮（主界面左上角）
 *
 * 与最小化按钮明确区分：
 * - 最小化（MinimizeButton）＝隐藏 UI，脚本后台继续跑；
 * - 关闭（本按钮）＝结束当前脚本会话，调用 Script.exit() 真正退出。
 *
 * 不再依赖 Navigation.useDismiss() 的 present 关闭链，避免最小化恢复后
 * 「关闭被当成再次最小化」的歧义。
 */
export default function CloseScriptButton() {
  return (
    <Button title="" systemImage="xmark" action={() => Script.exit()} />
  )
}