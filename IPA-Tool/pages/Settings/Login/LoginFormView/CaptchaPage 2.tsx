import {
  Button,
  Spacer,
  HStack,
  RoundedRectangle,
  VStack,
  ZStack,
  Navigation,
  useEffect,
  useRef,
  useState,
} from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { PageBackground } from "../../../../components/EditableGlassListPipeline";
import { CaptchaCodeInput } from "./CaptchaCodeInput";
import { loginButtonFill, squircleRadius } from "./styles";
import type { UseLoginToastReturn } from "../../../../hooks/useLoginToast";

type CaptchaPageProps = {
  account: string;
  password: string;
  onLogin: (
    account: string,
    password: string,
    captcha: string,
    setCaptchaPagePresented: (state: boolean) => void
  ) => void;
  toastConfig: UseLoginToastReturn["toastConfig"];
  resetToken: number;
};

export function CaptchaPage({
  account,
  password,
  onLogin,
  toastConfig,
  resetToken,
}: CaptchaPageProps) {
  const [captcha, setCaptcha] = useState("");
  const submittedRef = useRef(false);
  const updateCaptcha = (value: string) =>
    setCaptcha(value.replace(/\D/g, "").slice(0, 6));
  const canSubmit = captcha.length === 6;
  const dismiss = Navigation.useDismiss();

  useEffect(() => {
    submittedRef.current = false;
    setCaptcha("");
  }, [resetToken]);

  useEffect(() => {
    if (captcha.length < 6) {
      submittedRef.current = false;
      return;
    }

    if (submittedRef.current) return;
    submittedRef.current = true;
    onLogin(account, password, captcha, closeCaptchaPage);
  }, [captcha]);

  const closeCaptchaPage = (state: boolean) => {
    if (!state) dismiss();
  };

  return (
    <ZStack
      navigationTitle="验证码"
      navigationBarTitleDisplayMode="inline"
      toast={toastConfig}
    >
      <PageBackground />
      <VStack padding={{ horizontal: 24 }}>
        <HStack
          spacing={2}
          frame={{ maxWidth: "infinity", alignment: "leading" }}
        >
          <AnimText font="callout" foregroundStyle="secondaryLabel">
            请输入发送至
          </AnimText>
          <AnimText font="callout" fontWeight="semibold" foregroundStyle="systemBlue" lineLimit={1} truncationMode="middle">
            {account}
          </AnimText>
          <AnimText font="callout" foregroundStyle="secondaryLabel">
            的 6 位验证码。
          </AnimText>
        </HStack>

        <CaptchaCodeInput
          padding={{ top: 100, bottom: 30 }}
          value={captcha}
          onChanged={updateCaptcha}
        />
        <Button
          buttonStyle="plain"
          disabled={!canSubmit}
          action={() => onLogin(account, password, captcha, closeCaptchaPage)}
        >
          <HStack
            padding={{ vertical: 15 }}
            opacity={canSubmit ? 1 : 0.5}
            frame={{ maxWidth: "infinity", minHeight: 56 }}
            background={{
              style: loginButtonFill,
              shape: {
                type: "rect",
                cornerRadius: squircleRadius,
                style: "continuous",
              },
            }}
            clipShape={{
              type: "rect",
              cornerRadius: squircleRadius,
              style: "continuous",
            }}
            overlay={
              <RoundedRectangle
                padding={-0.5}
                cornerRadius={squircleRadius}
                stroke={{
                  shapeStyle: {
                    light: "rgba(255,255,255,0.56)",
                    dark: "rgba(255,255,255,0.26)",
                  },
                  strokeStyle: { lineWidth: 0.5 },
                }}
              />
            }
            shadow={{ color: "rgba(0,90,220,0.22)", radius: 14, y: 6 }}
          >
            <AnimText
              font="body"
              fontWeight="semibold"
              foregroundStyle="white"
              frame={{ maxWidth: "infinity" }}
            >
              登录
            </AnimText>
          </HStack>
        </Button>

        <Spacer />
      </VStack>
    </ZStack>
  );
}
