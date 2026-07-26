import { Button, HStack, Image, RoundedRectangle, VStack } from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { buttonRadius, buttonShape, cardGlass } from "./styles";

type SuccessActionsProps = {
  canSwitch: boolean;
  isSwitching: boolean;
  onContinue: () => void;
  onLogout: () => void;
  onSwitchAccount: () => void;
};

export function SuccessActions({
  canSwitch,
  isSwitching,
  onContinue,
  onLogout,
  onSwitchAccount,
}: SuccessActionsProps) {
  return (
    <VStack  frame={{ maxWidth: "infinity" }}>
      <Button buttonStyle="plain" action={onContinue}>
        <HStack
          spacing={10}
          frame={{ maxWidth: "infinity", minHeight: 60 }}
          background={{
            light: "rgba(0,122,255,0.92)",
            dark: "rgba(10,132,255,0.78)",
          }}
          overlay={
            <RoundedRectangle
              padding={-0.5}
              cornerRadius={buttonRadius}
              stroke={{
                shapeStyle: "rgba(255,255,255,0.38)",
                strokeStyle: { lineWidth: 0.5 },
              }}
            />
          }
          clipShape={{ type: "rect", cornerRadius: buttonRadius, style: "continuous" }}
          shadow={{ color: "rgba(0,90,220,0.24)", radius: 14, y: 6 }}
        >
          <AnimText font="title3" fontWeight="semibold" foregroundStyle="white">
            继续
          </AnimText>
          <Image systemName="arrow.right" font={22} fontWeight="semibold" foregroundStyle="white" />
        </HStack>
      </Button>

      <HStack spacing={14} frame={{ maxWidth: "infinity" }}>
        <Button buttonStyle="plain" action={onLogout}>
          <HStack
            spacing={8}
            frame={{ maxWidth: "infinity", minHeight: 56 }}
            glassEffect={{ glass: cardGlass, shape: buttonShape }}
            overlay={
              <RoundedRectangle
                padding={-0.5}
                cornerRadius={buttonRadius}
                stroke={{
                  shapeStyle: {
                    light: "rgba(255,255,255,0.50)",
                    dark: "rgba(255,255,255,0.24)",
                  },
                  strokeStyle: { lineWidth: 0.5 },
                }}
              />
            }
            clipShape={{ type: "rect", cornerRadius: buttonRadius, style: "continuous" }}
          >
            <Image systemName="rectangle.portrait.and.arrow.right" font={19} foregroundStyle="systemRed" />
            <AnimText font="body" fontWeight="semibold" foregroundStyle="systemRed">
              退出登录
            </AnimText>
          </HStack>
        </Button>

        <Button
          buttonStyle="plain"
          disabled={isSwitching || !canSwitch}
          action={onSwitchAccount}
        >
          <HStack
            spacing={8}
            opacity={isSwitching || !canSwitch ? 0.55 : 1}
            frame={{ maxWidth: "infinity", minHeight: 56 }}
            glassEffect={{ glass: cardGlass, shape: buttonShape }}
            overlay={
              <RoundedRectangle
                padding={-0.5}
                cornerRadius={buttonRadius}
                stroke={{
                  shapeStyle: {
                    light: "rgba(255,255,255,0.50)",
                    dark: "rgba(255,255,255,0.24)",
                  },
                  strokeStyle: { lineWidth: 0.5 },
                }}
              />
            }
            clipShape={{ type: "rect", cornerRadius: buttonRadius, style: "continuous" }}
          >
            <Image systemName="person.2.circle" font={19} foregroundStyle="secondaryLabel" />
            <AnimText font="body" fontWeight="semibold" foregroundStyle="secondaryLabel">
              {isSwitching ? "登录中" : "切换账号"}
            </AnimText>
          </HStack>
        </Button>
      </HStack>
    </VStack>
  );
}
