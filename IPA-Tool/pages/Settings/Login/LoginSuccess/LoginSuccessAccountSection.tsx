import { VStack } from "scripting"
import { useAuth } from "../../../../hooks/useAuth"
import { countryCodeToFlag, storeIdToCode } from "../../../../utils/countries"
import { AccountCard } from "./AccountCard"
import { SuccessHeader } from "./SuccessHeader"

/**
 * 登录成功页账号展示区。
 *
 * 单独订阅 authState，快速切换账号时只刷新账号展示相关内容，
 * 避免 LoginSuccessView 整体跟随账号状态重绘。
 */
export function LoginSuccessAccountSection() {
  const { authState } = useAuth()
  const { account, username, storeFront, lastLogin } = authState
  const flag = countryCodeToFlag(storeIdToCode(storeFront) ?? "")
  const displayName = username || account || "Apple Account"
  const accountText = account || "Apple ID 已同步"

  return (
    <>
      <SuccessHeader displayName={displayName} />
      <VStack spacing={10} frame={{ maxWidth: "infinity" }}>
        <AccountCard
          displayName={displayName}
          flag={flag}
          accountText={accountText}
          lastLogin={lastLogin}
        />
      </VStack>
    </>
  )
}
