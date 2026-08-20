import { Button, HStack, RoundedRectangle } from "scripting";
import { AnimText } from "../../../../components/AnimText";
import { loginButtonFill, squircleRadius } from "./styles";

export function LoginButton({ action }: { action: () => void }) {
  return (
    <Button buttonStyle="plain" action={action}>
      <HStack
        padding={{ vertical: 15 }}
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
  );
}
