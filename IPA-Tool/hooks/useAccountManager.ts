import { useState } from "scripting"
import { useAuth } from "./useAuth"
import { countryCodeToFlag, storeIdToCode } from "../utils/countries"

type ManagedAccount = ReturnType<typeof useAuth>["accountHistory"][number]

/**
 * 从账号对象中提取账号管理 UI 常用展示信息。
 *
 * 这里只返回结构化信息，不绑定任何列表、弹窗或按钮样式。
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
 * 账号管理 Hook。
 *
 * 用于账号管理页 / 历史账号列表删除按钮。
 * 这里只提供“数据 + 删除方法”，不绑定任何确认弹窗或 UI。
 *
 * 返回值说明：
 * - accounts：可管理的账号列表，当前复用 login_history；
 * - getAccountDisplayInfo：账号结构化展示信息，由调用方自行渲染；
 * - canManageAccount：是否存在可管理账号；
 * - isDeleting：是否正在删除，可用于按钮 loading/disabled；
 * - deleteAccount：删除账号，同时清理后端 CK session 和前端 login_history。
 */
export const useAccountManager = () => {
  const { accountHistory, deleteAccount: deleteAuthAccount } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * 删除账号。
   *
   * 可以传：
   * - account 字符串；
   * - login_history 账号对象。
   *
   * 内部会同时清理：
   * - 后端 CK session；
   * - 前端 login_history；
   * - 当前 authState。
   */
  const deleteAccount = async (account: string | ManagedAccount) => {
    if (isDeleting) return

    try {
      setIsDeleting(true)
      await deleteAuthAccount(account)
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    accounts: accountHistory,
    getAccountDisplayInfo,
    canManageAccount: accountHistory.length > 0,
    isDeleting,
    deleteAccount,
  }
}
