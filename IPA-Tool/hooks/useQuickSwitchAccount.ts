import { useState } from "scripting"
import { useAuth } from "./useAuth"
import { countryCodeToFlag, storeIdToCode } from "../utils/countries"

/**
 * 快速切换账号使用的账号对象。
 *
 * 当前直接复用 login_history 里的账号对象：
 * - account：邮箱 / Apple ID
 * - username：账号名称
 * - storeFront：Apple Store 地区 ID
 *
 * 注意：这个对象只用于 UI 展示和取 account 发起 CK 切换；
 * 真正被切换的是后端 AuthService 里的 CK session 数组。
 */
type QuickSwitchAccount = ReturnType<typeof useAuth>["accountHistory"][number]

/**
 * 从账号对象中提取常用展示信息。
 *
 * 这里只返回结构化数据，不锁死文案格式：
 * - 搜索页可以展示当前账号胶囊；
 * - 登录成功页可以拼 actionSheet 一行文案；
 * - 其他页面可以自己决定显示邮箱、名称、国旗或国家代码。
 */
const getAccountDisplayInfo = (item: { account: string; username?: string; storeFront: string }) => {
  const countryCode = storeIdToCode(item.storeFront) ?? ""
  const flag = countryCodeToFlag(countryCode)

  return {
    account: item.account,
    email: item.account,
    username: item.username || item.account,
    storeFront: item.storeFront,
    countryCode,
    flag,
  }
}

/**
 * 快速切换账号 Hook。
 *
 * 这里只提供“数据 + 方法”，不绑定任何弹窗、按钮 UI，也不锁死文案格式。
 *
 * 返回值说明：
 * - accounts：可用于展示的账号列表，当前复用 login_history；
 * - getAccountDisplayInfo：把账号转换成结构化展示信息，由调用方自行拼文案/组件；
 * - canQuickSwitch：是否存在可展示的账号；
 * - isSwitching：是否正在执行切换，可用于按钮 loading/disabled；
 * - switchAccount：执行快速切换，只操作 CK session 顺序，不重新登录。
 *
 * actionSheet 使用示例：
 * ```tsx
 * const {
 *   accounts,
 *   getAccountDisplayInfo,
 *   switchAccount,
 * } = useQuickSwitchAccount()
 *
 * const index = await Dialog.actionSheet({
 *   title: "快速切换",
 *   actions: accounts.map(item => {
 *     const info = getAccountDisplayInfo(item)
 *     return { label: info.flag ? `${info.email} ➜ ${info.flag}` : info.email }
 *   }),
 * })
 *
 * if (index != null) {
 *   await switchAccount(accounts[index])
 * }
 * ```
 */
export const useQuickSwitchAccount = () => {
  const { accountHistory, switchAuthSession } = useAuth()
  const [isSwitching, setIsSwitching] = useState(false)

  /**
   * 快速切换当前 CK session。
   *
   * 可以传：
   * - account 字符串；
   * - login_history 账号对象。
   *
   * 内部只取 account 字段，并调用后端 /auth/switch，
   * 把对应 CK session 移动到数组首位。
   */
  const switchAccount = async (account: string | QuickSwitchAccount) => {
    if (isSwitching) return

    const accountId = typeof account === "string" ? account : account.account
    if (!accountId) return

    try {
      setIsSwitching(true)
      await switchAuthSession(accountId)
    } finally {
      setIsSwitching(false)
    }
  }

  return {
    accounts: accountHistory,
    getAccountDisplayInfo,
    canQuickSwitch: accountHistory.length > 0,
    isSwitching,
    switchAccount,
  }
}
