import { NavigationStack, VStack, useEffect, useRef } from "scripting"
import GlassLoginView from "../pages/Settings/Login/LoginFormView/GlassLogin"
import { useAuth, useLoginToast } from "../hooks"
import { useLoginHandler } from "../hooks/useLoginHandler"
import CloseButton from "./CloseButton"

/**
 * 「登录其他账号」弹层
 *
 * 复用设置页登录表单，在不影响当前登录账号的情况下登录一个新的 Apple ID。
 * 登录成功后会写入 login_history（可随后在「切换账号」里切换）。
 */
export default function AddAccountSheet({ onDismiss }: { onDismiss: () => void }) {
  const { showToast, toastConfig } = useLoginToast()
  const { login, authState } = useAuth()
  const { handleLogin } = useLoginHandler(login, showToast)
  const initialAccountRef = useRef(authState.account ?? "")

  // 登录成功（账号变为新账号）后自动关闭弹层
  useEffect(() => {
    if (authState.isLoggedIn && authState.account !== initialAccountRef.current) {
      onDismiss()
    }
  }, [authState, onDismiss])

  return (
    <NavigationStack>
      <VStack
        navigationTitle="登录其他账号"
        toolbar={{ topBarLeading: <CloseButton /> }}
        toast={toastConfig}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      >
        <GlassLoginView
          onLogin={handleLogin}
          toastConfig={toastConfig}
          showToast={showToast}
        />
      </VStack>
    </NavigationStack>
  )
}