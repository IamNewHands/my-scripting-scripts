/**
 * File: pages/Settings/Config/ConfigItem.tsx
 *
 * 配置项通用组件
 * 封装配置项的布局结构，接受两个标题和一个控件组件
 */

import { Divider, HStack, VStack, Spacer } from "scripting";
import { AnimText } from "../../../components/AnimText"

interface ConfigItemProps {
  title: string;
  description: string;
  children: JSX.Element;
  showSeparator?: boolean;
}

// 组件内部样式配置
const styles = {
  container: {
    listRowSeparator: "hidden" as const,
  },
  row: {
    padding: 12,
    spacing: 12,
    alignment: "center" as const,
  },
  labelContainer: {
    spacing: 4,
    alignment: "leading" as const,
  },
  labelText: {
    font: "body" as const,
    foregroundStyle: "label" as const,
  },
  descriptionText: {
    font: "caption" as const,
    foregroundStyle: "secondaryLabel" as const,
  },
};

/**
 * 配置项组件
 * 统一配置项的布局和样式
 */
export const ConfigItem = ({
  title,
  description,
  children,
  showSeparator = true,
}: ConfigItemProps) => {
  return (
    <VStack spacing={0} {...styles.container}>
      <HStack {...styles.row}>
        <VStack {...styles.labelContainer}>
          <AnimText {...styles.labelText}>{title}</AnimText>
          <AnimText {...styles.descriptionText}>{description}</AnimText>
        </VStack>
        <Spacer />
        {children}
      </HStack>
      {showSeparator && <Divider padding={{ leading: 12 }} />}
    </VStack>
  );
};
