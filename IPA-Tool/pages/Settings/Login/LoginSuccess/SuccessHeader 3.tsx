import { VStack } from "scripting";
import { AnimText } from "../../../../components/AnimText";

type SuccessHeaderProps = {
  displayName: string;
};

export function SuccessHeader({ displayName }: SuccessHeaderProps) {
  return (
    <VStack spacing={8} alignment="center">
      <AnimText font="largeTitle" fontWeight="bold" foregroundStyle="label">
        登录成功
      </AnimText>
      <AnimText
        font="title3"
        foregroundStyle="label"
        multilineTextAlignment="center"
      >
        您的 Apple ID（{displayName}）
      </AnimText>
      <AnimText font="title3" foregroundStyle="label">
        已验证并同步完成。
      </AnimText>
    </VStack>
  );
}
