import { Circle, Image, ZStack, useColorScheme } from "scripting";
import { cardGlass } from "./styles";

export function SuccessBadge(props: Record<string, unknown>) {
  const isDark = useColorScheme() === "dark";
  const glowColor = isDark ? "rgba(191,90,242,0.16)" : "rgba(48,209,88,0.16)";
  const shadowColor = isDark ? "rgba(191,90,242,0.28)" : "rgba(52,199,89,0.28)";

  return (
    <ZStack frame={{ width: 154, height: 154 }} {...props}>
      <Circle
        fill={glowColor}
        frame={{ width: 154, height: 154 }}
        blur={18}
      />
      <Circle
        fill={{
          light: "rgba(52,199,89,0.9)",
          dark: "rgba(191,90,242,0.32)",
        }}
        frame={{ width: 104, height: 104 }}
        glassEffect={{ glass: cardGlass, shape: "circle" }}
        shadow={{
          color: shadowColor,
          radius: 22,
          y: 10,
        }}
      />
      <Image
        systemName="checkmark"
        font={56}
        fontWeight="bold"
        foregroundStyle="white"
      />
    </ZStack>
  );
}
