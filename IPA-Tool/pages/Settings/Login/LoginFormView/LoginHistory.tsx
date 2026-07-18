import { Button, HStack, Image, Spacer, Text, VStack, useState } from "scripting"
import { useAccountManager, useAuth } from "../../../../hooks"
import { countryCodeToFlag, storeIdToCode } from "../../../../utils/countries"
import { pillGlass, pillGlassProps } from "./styles"
import { AccountSelectionSheet } from "../components/AccountSelectionSheet"
import type { SetLoginFormData } from "./types"

type HistoryAccount = ReturnType<typeof useAuth>["accountHistory"][number]

type LoginHistoryProps = {
  setFormData: SetLoginFormData
}

const getAccountFlag = (account: HistoryAccount) => {
  const countryCode = storeIdToCode(account.storeFront) ?? ""
  return countryCodeToFlag(countryCode)
}

const getAccountDisplayName = (account: HistoryAccount) => account.username || "未命名账号"

const getAccountEmail = (account: HistoryAccount) => account.account || "未填写邮箱"


export function LoginHistory({ setFormData }: LoginHistoryProps) {
  const { accountHistory } = useAuth()
  const { deleteAccount } = useAccountManager()
  const [selectedAccount, setSelectedAccount] = useState<HistoryAccount | null>(null)
  const [isAccountPickerPresented, setAccountPickerPresented] = useState(false)
  const primaryAccount = selectedAccount ?? accountHistory.find(item => item.isActive) ?? accountHistory[0]
  const hasMore = accountHistory.length > 0

  const selectAccount = (account: HistoryAccount) => {
    setSelectedAccount(account)
    setFormData({
      username: account.account,
      password: account.password,
      captcha: "",
    })
  }

  const handleSelectMore = () => {
    setAccountPickerPresented(true)
  }

  const handleDeleteAccount = async (account: HistoryAccount) => {
    try {
      await deleteAccount(account)
    } catch (error) {
      await Dialog.actionSheet({
        title: "删除失败",
        message: error instanceof Error ? error.message : String(error),
        actions: [{ label: "知道了" }],
      })
    }
  }

  if (!primaryAccount) {
    return (
      <HStack spacing={16} {...pillGlassProps}>
        <Image
          systemName="person.crop.circle.badge.questionmark"
          resizable
          frame={{ width: 30, height: 30 }}
          foregroundStyle="secondaryLabel"
        />
        <VStack alignment="leading" spacing={2}>
          <Text font="body" foregroundStyle="label" lineLimit={1}>
            暂无历史登录账号
          </Text>
          <Text
            font="footnote"
            foregroundStyle="secondaryLabel"
            lineLimit={1}
          >
            登录成功后会在这里显示最近账号
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    )
  }

  const primaryFlag = getAccountFlag(primaryAccount)
  const primaryName = getAccountDisplayName(primaryAccount)
  const primaryEmail = getAccountEmail(primaryAccount)

  return (
    <VStack
      spacing={8}
      sheet={isAccountPickerPresented ? {
        isPresented: true,
        onChanged: presented => {
          if (!presented) setAccountPickerPresented(false)
        },
        content: (
          <AccountSelectionSheet
            presentationDragIndicator="visible"
            presentationDetents={[accountHistory.length > 3 ? 700 : "medium"]}
            accounts={accountHistory}
            onSelect={account => {
              selectAccount(account)
              setAccountPickerPresented(false)
            }}
            onDelete={handleDeleteAccount}
          />
        ),
      } : undefined}
    >
      <HStack spacing={12} {...pillGlassProps}>
        <Button
          buttonStyle="plain"
          action={() => selectAccount(primaryAccount)}
        >
          <HStack
            spacing={16}
            frame={{ maxWidth: "infinity", alignment: "leading" }}
          >
            <Image
              systemName="person.crop.circle.fill"
              resizable
              frame={{ width: 50, height: 50 }}
              foregroundStyle="secondaryLabel"
            />
            <VStack
              alignment="leading"
              spacing={3}
              frame={{ maxWidth: "infinity", alignment: "leading" }}
            >
              <HStack spacing={6}>
                <Text
                  font="body"
                  fontWeight="semibold"
                  foregroundStyle="label"
                  lineLimit={1}
                >
                  {primaryName}
                </Text>
                <Text
                  font="body"
                  lineLimit={1}
                >
                  {primaryFlag}
                </Text>
              </HStack>
              <Text
                font="footnote"
                foregroundStyle="secondaryLabel"
                lineLimit={1}
              >
                {primaryEmail}
              </Text>
              <Text
                font="caption"
                foregroundStyle="tertiaryLabel"
                lineLimit={1}
              >
                上次登录：{primaryAccount.lastLogin}
              </Text>
            </VStack>
          </HStack>
        </Button>
        {hasMore && (
          <Button
            buttonStyle="plain"
            controlSize="small"
            action={handleSelectMore}
          >
            <Image
              padding={10}
              glassEffect={{
                glass: pillGlass,
                shape: "circle",
              }}
              systemName="chevron.right"
              font={14}
              foregroundStyle="label"
            />
          </Button>
        )}
      </HStack>
    </VStack>
  )
}
