/**
 * File: pages/Settings/Config/ConfigSection.tsx
 *
 * 配置区域通用组件
 * 封装 Section，只接受一个标题
 */

import { Section, Rectangle, RoundedRectangle, VStack, ZStack } from "scripting";
import { AnimText } from "../../../components/AnimText"

interface ConfigSectionProps {
  title: string;
  children: JSX.Element | JSX.Element[];
}

// 组件内部样式配置
const sectionHeaderStyle = {
  font: "caption" as const,
  foregroundStyle: "secondaryLabel" as const,
};

const sectionGlass = UIGlass.clear().interactive(true);
const sectionGlassShape = {
  type: "rect" as const,
  cornerRadius: 20,
  style: "continuous" as const,
};

const sectionGlassProps = {
  frame: { maxWidth: "infinity" as const, alignment: "leading" as const },
  glassEffect: {
    glass: sectionGlass,
    shape: sectionGlassShape,
  },
  overlay: (
    <RoundedRectangle
      cornerRadius={20}
      stroke={{
        shapeStyle: {
          light: "rgba(0,0,0,0.16)",
          dark: "rgba(255,255,255,0.42)",
        },
        strokeStyle: { lineWidth: 0.35 },
      }}
    />
  ),
  shadow: {
    color: "rgba(72,88,120,0.16)",
    radius: 12,
    y: 5,
  },
} as const;

/**
 * 配置区域组件
 * 封装 Section，统一配置区域的样式
 */
export const ConfigSection = ({ title, children }: ConfigSectionProps) => {
  return (
    <Section
      listRowBackground={<Rectangle fill="clear" />}
      listRowSeparator="hidden"
      header={<AnimText {...sectionHeaderStyle}>{title}</AnimText>}
    >
      <ZStack {...sectionGlassProps}>
        <VStack padding={10} spacing={0} frame={{ maxWidth: "infinity" }}>
          {children}
        </VStack>
      </ZStack>
    </Section>
  );
};
