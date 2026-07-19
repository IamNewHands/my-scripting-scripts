import { useRef } from "scripting";
import type { ToastType } from "../components/Toast";

export const useLoginHandler = (
  login: (appleId: string, password: string, code: string) => Promise<void>,
  showToast: (type: ToastType, message: string) => void
) => {
  const isLoggingInRef = useRef(false);

  const handleLogin = async (
    account: string,
    password: string,
    captcha = "",
    setCaptchaPagePresented: (state: boolean) => void
  ) => {
    if (isLoggingInRef.current) return;
    try {
      if (!account || !password) {
        throw new Error("请输入用户名、密码");
      }

      isLoggingInRef.current = true;
      showToast("loading", "正在登录...");
      await login(account, password, captcha);

      showToast("success", "登录成功！");
      setTimeout(() => setCaptchaPagePresented(false), 800);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isCaptcha = message.includes(
        "MZFinance.BadLogin.Configurator_message"
      );

      if (isCaptcha) {
        setCaptchaPagePresented(isCaptcha);
      } else {
        showToast("error", message.replace(",,", "\n"));
        setTimeout(() => setCaptchaPagePresented(false), 800);
      }
    } finally {
      isLoggingInRef.current = false;
    }
  };

  return { handleLogin };
};
