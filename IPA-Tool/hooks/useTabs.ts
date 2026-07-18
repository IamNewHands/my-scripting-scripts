import { useObservable } from "scripting"
import { getAuthStateSnapshot } from "./useAuth"

/** Tab 页面对应的 value 值 */
export const Tab = {
  Search: 0,   // 搜索
  Download: 1, // 下载
  Settings: 2, // 设置
} as const

export type TabValue = (typeof Tab)[keyof typeof Tab]

let _selection: ReturnType<typeof useObservable<number>> | null = null

/**
 * Tab 选择 Hook
 *
 * @param initialTab 初始选中的 Tab，默认 `Tab.Search`
 * @returns 可观察的 selection，传给 `<TabView selection={...}>`
 *
 * @example
 * // 默认打开搜索页
 * const selection = useTabs()
 *
 * // 指定打开下载页
 * const selection = useTabs(Tab.Download)
 */
const getDefaultTab = () => getAuthStateSnapshot().isLoggedIn ? Tab.Search : Tab.Settings

export function useTabs(initialTab: TabValue = getDefaultTab()) {
  if (_selection) return _selection

  const selection = useObservable<number>(initialTab)
  _selection = selection
  return selection
}

/**
 * 全局切换 Tab（任意位置可调用）
 *
 * @param value 目标 Tab，例如 `Tab.Settings`
 *
 * @example
 * switchTab(Tab.Settings) // 跳到设置页
 * switchTab(Tab.Files)    // 跳到文件页
 */
export function switchTab(value: TabValue) {
  withAnimation(() => _selection?.setValue(value))
}
