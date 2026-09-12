import { Button, HStack, useState } from "scripting"
import AddAccountSheet from "./AddAccountSheet"

/**
 * 「登录其他账号」入口（独立于账号切换菜单）。
 * 点击弹出登录表单，登录成功自动关闭。
 *
 * 背景：设置页在已登录时只显示成功页，搜索页的账号菜单也只列已存账号，
 * 因此新增第二个账号需要这个独立入口。
 */
export default function AddAccountButton() {
  const [presented, setPresented] = useState(false)
  return (
    <HStack
      sheet={presented ? {
        isPresented: true,
        onChanged: (p: boolean) => {
          if (!p) setPresented(false)
        },
        content: <AddAccountSheet onDismiss={() => setPresented(false)} />,
      } : undefined}
    >
      <Button
        title=""
        systemImage="person.badge.plus"
        action={() => setPresented(true)}
      />
    </HStack>
  )
}