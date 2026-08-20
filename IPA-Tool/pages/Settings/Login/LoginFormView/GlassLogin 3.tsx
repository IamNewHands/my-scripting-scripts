import {
  ScrollView,
  Spacer,
  VStack,
  useEffect,
  useRef,
  useState,
} from "scripting";
import { CaptchaPage } from "./CaptchaPage";
import { LoginForm } from "./LoginForm";
import { LoginHeader } from "./LoginHeader";
import { LoginHistory } from "./LoginHistory";
import { OrDivider } from "./OrDivider";
import { initialFormData, type LoginSubmit } from "./types";
import type { UseLoginToastReturn } from "../../../../hooks/useLoginToast";

type GlassLoginViewProps = {
  onLogin: LoginSubmit;
  toastConfig: UseLoginToastReturn["toastConfig"];
  showToast: UseLoginToastReturn["showToast"];
};

export default function GlassLoginView({
  onLogin,
  toastConfig,
  showToast,
}: GlassLoginViewProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [captchaPagePresented, setCaptchaPagePresented] = useState(false);
  const resetTokenRef = useRef(0);

  const updateCaptchaPagePresented = (presented: boolean) => {
    resetTokenRef.current += 1;
    setCaptchaPagePresented(presented);
  };

  useEffect(() => {
    if (captchaPagePresented) showToast("info", "请输入验证码");
  }, [captchaPagePresented]);

  return (
    <ScrollView frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <VStack
        spacing={24}
        padding={{ horizontal: 24, top: 42, bottom: 32 }}
        frame={{ maxWidth: "infinity", minHeight: 680 }}
        navigationDestination={{
          isPresented: captchaPagePresented,
          onChanged: updateCaptchaPagePresented,
          content: (
            <CaptchaPage
              account={formData.username}
              password={formData.password}
              onLogin={onLogin}
              toastConfig={toastConfig}
              resetToken={resetTokenRef.current}
            />
          ),
        }}
      >
        <LoginHeader padding={{ bottom: 10 }} />
        <LoginForm
          onLogin={onLogin}
          formData={formData}
          setFormData={setFormData}
          setCaptchaPagePresented={updateCaptchaPagePresented}
        />
        <OrDivider />
        <LoginHistory setFormData={setFormData} />
        <Spacer />
      </VStack>
    </ScrollView>
  );
}
