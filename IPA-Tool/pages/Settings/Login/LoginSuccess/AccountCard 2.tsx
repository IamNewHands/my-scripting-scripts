import { Circle, Divider, HStack, Image, Spacer, VStack, ZStack } from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { glassCardProps } from "./styles";
import { formatLastLogin } from "./utils";

type AccountCardProps = {
  displayName: string;
  flag: string;
  accountText: string;
  lastLogin: string;
};

export function AccountCard({
  displayName,
  flag,
  accountText,
  lastLogin,
}: AccountCardProps) {
  return (
    <VStack spacing={10} padding={18} {...glassCardProps}>
      <HStack spacing={16} frame={{ maxWidth: "infinity" }}>
        <ZStack frame={{ width: 72, height: 72 }}>
          <Circle
            fill="rgba(88,86,214,0.22)"
            frame={{ width: 72, height: 72 }}
          />
          <Image
            systemName="person.crop.circle.fill"
            font={64}
            foregroundStyle="systemIndigo"
          />
          <Circle
            fill="systemGreen"
            frame={{ width: 16, height: 16 }}
            offset={{ x: 24, y: 24 }}
          />
        </ZStack>

        <VStack spacing={4} alignment="leading">
          <AnimText font="title2" fontWeight="semibold" foregroundStyle="label">
            {displayName} {flag}
          </AnimText>
          <AnimText font="callout" foregroundStyle="secondaryLabel">
            Apple ID
          </AnimText>
          <AnimText
            font="callout"
            foregroundStyle="secondaryLabel"
            lineLimit={1}
          >
            {accountText}
          </AnimText>
        </VStack>

        <Spacer />

        <ZStack padding={{ trailing: 15 }} frame={{ width: 30, height: 30 }}>
          <Circle scaleEffect={1.5} fill="rgba(10,132,255,0.18)" />
          <Image
            systemName="icloud.fill"
            font={24}
            foregroundStyle="systemBlue"
            frame={{ width: 30, height: 30 }}
          />
        </ZStack>
      </HStack>

      <Divider />

      <HStack spacing={10} frame={{ maxWidth: "infinity" }}>
        <Image
          systemName="checkmark.circle"
          font={18}
          foregroundStyle="systemGreen"
        />
        <AnimText font="callout" foregroundStyle="label">
          已验证
        </AnimText>
        <Spacer />
        <AnimText font="callout" foregroundStyle="secondaryLabel">
          最后登录：{formatLastLogin(lastLogin)}
        </AnimText>
      </HStack>
    </VStack>
  );
}
