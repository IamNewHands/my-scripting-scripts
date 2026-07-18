import { VStack } from "scripting";
import { AnimText } from "../../../../components/AnimText";

export function LoginHeader() {
  return (
    <VStack
      alignment="leading"
      spacing={6}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
    >
      <AnimText font="title2" fontWeight="bold" foregroundStyle="label">
        登录 Apple 账户
      </AnimText>
      <AnimText font="callout" foregroundStyle="secondaryLabel">
        输入 Apple ID 与密码，用于获取购买记录和下载权限。
      </AnimText>
    </VStack>
  );
}
