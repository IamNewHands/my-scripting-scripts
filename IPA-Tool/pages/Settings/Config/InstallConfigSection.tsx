/**
 * File: pages/Settings/Config/InstallConfigSection.tsx
 *
 * 安装配置组件
 */

import { EmptyView, Picker, useState, useEffect } from "scripting";
import { ConfigSection } from "./ConfigSection";
import { ConfigItem } from "./ConfigItem";
import { AnimText } from "../../../components/AnimText";

const plistServerOptions = [
  { title: "Scripting", url: "https://api.scripting.fun/ipa-plist" },
  { title: "代理模块", url: "https://xiaobai.app/install" },
];

interface InstallConfigSectionProps {
  initialValue: {
    plistServer: string;
  };
  onChange: (value: {
    plistServer: string;
  }) => void;
}

/**
 * 安装配置组件
 */
export const InstallConfigSection = ({
  initialValue,
  onChange,
}: InstallConfigSectionProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePlistServerChange = (plistServer: string) => {
    const updatedValue = { ...value, plistServer };
    setValue(updatedValue);
    onChange(updatedValue);
  };

  return (
    <ConfigSection title="安装配置">
      <ConfigItem
        title="Plist 服务"
        description="选择用于生成安装描述文件的服务"
        showSeparator={false}
      >
        <Picker
          label={<EmptyView />}
          pickerStyle="menu"
          value={value.plistServer}
          onChanged={handlePlistServerChange}
        >
          {plistServerOptions.map(option => (
            <AnimText key={option.url} tag={option.url}>
              {option.title}
            </AnimText>
          ))}
        </Picker>
      </ConfigItem>
    </ConfigSection>
  );
};
