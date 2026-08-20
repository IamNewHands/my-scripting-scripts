import { Button, Divider, HStack, Image, Menu, Text } from "scripting"
import { useAuth, useQuickSwitchAccount } from "../../../hooks"

export default function QuickSwitchAccountMenu() {
  const { authState } = useAuth()
  const {
    accounts,
    getAccountDisplayInfo,
    canQuickSwitch,
    isSwitching,
    switchAccount,
  } = useQuickSwitchAccount()
  const activeInfo = authState.account ? getAccountDisplayInfo(authState) : undefined

  if (!authState.isLoggedIn) {
    return <Image systemName="person.badge.minus" foregroundStyle="secondaryLabel" />
  }

  const handleSwitchAccount = (account: typeof accounts[number]) => {
    switchAccount(account).catch(error => {
      Dialog.actionSheet({
        title: "快速切换失败",
        message: error instanceof Error ? error.message : String(error),
        actions: [{ label: "知道了" }],
      })
    })
  }

  return (
    <Menu
      disabled={!canQuickSwitch || isSwitching}
      label={(
        <HStack spacing={4}>
          <Text font="caption" fontWeight="semibold" lineLimit={1}>
            {activeInfo?.username ?? "账号"}
          </Text>
          <Text font="body" lineLimit={1}>
            {activeInfo?.flag ?? "🌐"}
          </Text>
        </HStack>
      )}
    >
      {accounts.flatMap((account, index) => {
        const info = getAccountDisplayInfo(account)
        return [
          <Button
            key={account.account}
            title={`${info.flag}${info.email}`}
            systemImage={account.account === authState.account ? "checkmark" : undefined}
           
            action={() => handleSwitchAccount(account)}
          />,
          index < accounts.length - 1 ? <Divider key={`${account.account}-divider`} /> : null,
        ]
      })}
    </Menu>
  )
}
