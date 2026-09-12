import { HStack, Image, Text } from "scripting"
import { useAuth } from "../../../hooks"
import { countryCodeToFlag, storeIdToCode } from "../../../utils/countries"

function LoggedOutAccount() {
  return <Image systemName="person.crop.circle" foregroundStyle="secondaryLabel" />
}

function LoggedInAccount({
  account,
  username,
  storeFront,
}: {
  account: string
  username: string
  storeFront: string
}) {
  const countryCode = storeIdToCode(storeFront) || ""
  const flag = countryCodeToFlag(countryCode) || "🌐"
  const accountName = username || account || "账号"

  return (
    <HStack spacing={4}>
      <Text font="body" lineLimit={1}>
        {flag}
      </Text>
      <Text font="caption" fontWeight="semibold" lineLimit={1}>
        {accountName}
      </Text>
    </HStack>
  )
}

/** 展示当前登录账号和国家；未登录时显示占位图标。 */
export default function PurchasedAccountToolbarItem() {
  const { authState } = useAuth()
  return authState.isLoggedIn ? (
    <LoggedInAccount
      account={authState.account}
      username={authState.username}
      storeFront={authState.storeFront}
    />
  ) : <LoggedOutAccount />
}
