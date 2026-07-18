/**
 * File: pages/Settings/Config/AppearanceConfigSection.tsx
 *
 * 外观配置组件
 */

import { Toggle, useEffect, useState } from "scripting";
import { ConfigSection } from "./ConfigSection";
import { ConfigItem } from "./ConfigItem";

interface AppearanceConfigSectionProps {
  initialValue: {
    appIconAccent: boolean;
  };
  onChange: (value: {
    appIconAccent: boolean;
  }) => void;
}

/**
 * 外观配置组件
 */
export const AppearanceConfigSection = ({
  initialValue,
  onChange,
}: AppearanceConfigSectionProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleAppIconAccentChange = (appIconAccent: boolean) => {
    const updatedValue = { ...value, appIconAccent };
    setValue(updatedValue);
    onChange(updatedValue);
  };

  return (
    <ConfigSection title="外观配置">
      <ConfigItem
        title="图标主色效果"
        description="根据 App 图标主色渲染卡片背景、进度条和按钮颜色"
        showSeparator={false}
      >
        <Toggle
          frame={{ width: 50 }}
          title=""
          value={value.appIconAccent}
          onChanged={handleAppIconAccentChange}
        />
      </ConfigItem>
    </ConfigSection>
  );
};
