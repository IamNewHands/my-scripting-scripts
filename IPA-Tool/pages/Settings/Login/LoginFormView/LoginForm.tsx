import { VStack, useState } from "scripting";
import { GlassInput } from "./GlassInput";
import { LoginButton } from "./LoginButton";
import { type LoginFormData, type LoginSubmit, type SetLoginFormData, updateForm } from "./types";

type LoginFormProps = {
  onLogin: LoginSubmit;
  formData: LoginFormData;
  setFormData: SetLoginFormData;
  setCaptchaPagePresented: (state: boolean) => void;
};

export function LoginForm({
  onLogin,
  formData,
  setFormData,
  setCaptchaPagePresented,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <VStack spacing={20}>
      <GlassInput
        label="Apple ID"
        prompt="example@icloud.com"
        value={formData.username}
        onChanged={username => updateForm(setFormData, { username })}
      />
      <GlassInput
        label="密码"
        prompt="••••••••••"
        value={formData.password}
        onChanged={password => updateForm(setFormData, { password })}
        secure
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword(!showPassword)}
      />
      <LoginButton
        action={() =>
          onLogin(formData.username, formData.password, "", setCaptchaPagePresented)
        }
      />
    </VStack>
  );
}
