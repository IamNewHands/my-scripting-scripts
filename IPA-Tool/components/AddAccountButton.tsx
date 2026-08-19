import { Button, HStack, useState } from "scripting"
import AddAccountSheet from "./AddAccountSheet"

/**
 * 首页「登录其他账号」显眼入口（独立于账号切换菜单）。
 * 点击弹出登录表单，登录成功自动关闭。
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