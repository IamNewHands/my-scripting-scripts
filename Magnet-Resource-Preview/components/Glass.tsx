import {
  Button,
  HStack,
  Image,
  RoundedRectangle,
  Text,
} from "scripting";

// 主题常量
export const BLUE = "#0A84FF";
export const GLASS_TINT = "rgba(255,255,255,0.18)";
export const GLASS_STROKE = { light: "rgba(255,255,255,0.58)", dark: "rgba(255,255,255,0.16)" };
export const GLASS_FILL = { light: "rgba(255,255,255,0.36)", dark: "rgba(44,44,46,0.52)" };
export const INPUT_GLASS_FILL = { light: "rgba(255,255,255,0.28)", dark: "rgba(28,28,30,0.50)" };
export const SEARCH_PAGE_SIZE = 20;

export type GlassVariant = "card" | "input" | "control" | "prominent" | "icon";

export function glassFillFor(variant: GlassVariant = "card") {
  if (variant === "input") return INPUT_GLASS_FILL;
  if (variant === "prominent") return "rgba(10,132,255,0.68)";
  if (variant === "icon") return { light: "rgba(10,132,255,0.10)", dark: "rgba(10,132,255,0.18)" };
  return GLASS_FILL;
}

export function glassTintFor(variant: GlassVariant = "card") {
  if (variant === "prominent" || variant === "icon") return "rgba(110,198,255,0.32)";
  return GLASS_TINT;
}

export function glassShadowFor(variant: GlassVariant = "card") {
  if (variant === "prominent") return { color: "rgba(10,132,255,0.24)", radius: 12, x: 0, y: 6 };
  if (variant === "input") return { color: "rgba(30,88,160,0.08)", radius: 8, x: 0, y: 4 };
  if (variant === "control") return { color: "rgba(30,88,160,0.10)", radius: 12, x: 0, y: 6 };
  return { color: "rgba(30,88,160,0.10)", radius: 14, x: 0, y: 7 };
}

export function glassEffectFor(cornerRadius: number, variant: GlassVariant = "card", interactive = true) {
  const glass = interactive
    ? UIGlass.clear().interactive().tint(glassTintFor(variant))
    : UIGlass.clear().interactive(false).tint(glassTintFor(variant));
  return { glass, shape: { type: "rect", cornerRadius } };
}

export function glassSurface(cornerRadius = 28, variant: GlassVariant = "card", interactive = true, withShadow = true): any {
  const props: any = {
    background: <GlassShape cornerRadius={cornerRadius} fill={glassFillFor(variant)} />,
    glassEffect: glassEffectFor(cornerRadius, variant, interactive),
  };
  if (withShadow) props.shadow = glassShadowFor(variant) as any;
  return props;
}

export function GlassShape({ cornerRadius = 28, fill = GLASS_FILL }: { cornerRadius?: number; fill?: any }) {
  return <RoundedRectangle cornerRadius={cornerRadius} fill={fill as any} stroke={GLASS_STROKE as any} />;
}

export function GlassButtonContent({
  systemName,
  title,
  prominent = false,
}: {
  systemName: string;
  title: string;
  prominent?: boolean;
}) {
  return (
    <HStack
      spacing={8}
      frame={{ maxWidth: "infinity" }}
      padding={{ vertical: 13, horizontal: 14 }}
      {...glassSurface(18, prominent ? "prominent" : "control")}
    >
      <Image systemName={systemName} frame={{ width: 20, height: 20 }} foregroundStyle={prominent ? "white" : BLUE} />
      <Text font={16} fontWeight="semibold" foregroundStyle={prominent ? "white" : "label"}>{title}</Text>
    </HStack>
  );
}

// 通用按钮组件
export function BackButton({ action }: { action: () => void }) {
  return (
    <Button action={action} buttonStyle="plain">
      <Image systemName="chevron.left" fontWeight="semibold" foregroundStyle="#007AFF" />
    </Button>
  );
}

export function CloseButton({ action }: { action: () => void }) {
  return (
    <Button action={action} buttonStyle="plain">
      <Image systemName="xmark" foregroundStyle="#FF3B30" fontWeight="semibold" />
    </Button>
  );
}

export function MetaLine({ label, value }: { label: string; value: string | number }) {
  return (
    <HStack spacing={6} frame={{ maxWidth: "infinity", alignment: "leading" }}>
      <Text foregroundStyle="secondaryLabel" font={15}>{label}：</Text>
      <Text foregroundStyle="secondaryLabel" font={15} textSelection frame={{ maxWidth: "infinity", alignment: "leading" }}>{String(value)}</Text>
    </HStack>
  );
}

export function SmallResultButton({ title, action }: { title: string; action: () => void }) {
  return (
    <Button action={action} buttonStyle="plain">
      <Text
        font={13}
        fontWeight="semibold"
        padding={{ vertical: 7, horizontal: 10 }}
        {...glassSurface(14, "control", true, false)}
      >
        {title}
      </Text>
    </Button>
  );
}