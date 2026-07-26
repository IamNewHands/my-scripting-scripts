/**
 * File: pages/Settings/Config/InstallConfigSection.tsx
 *
 * 安装配置组件
 */

import { EmptyView, Picker, TextField, useState, useEffect, VStack } from "scripting";
import { ConfigSection } from "./ConfigSection";
import { ConfigItem } from "./ConfigItem";
import { AnimText } from "../../../components/AnimText";

const customTag = "__custom__";

const plistServerOptions = [
  { title: "Scripting", url: "https://api.scripting.fun/ipa-plist" },
  { title: "代理模块", url: "https://xiaobai.app/install" },
  { title: "自定义…", url: customTag },
];

const presetUrls = plistServerOptions.slice(0, 2).map(o => o.url);
const isPresetUrl = (url: string) => presetUrls.includes(url);

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

  const handlePlistServerChange = (tag: string) => {
    if (tag === customTag) {
      const updatedValue = { ...value, plistServer: "" };
      setValue(updatedValue);
      onChange(updatedValue);
    } else {
      // 选中了预设值
      const updatedValue = { ...value, plistServer: tag };
      setValue(updatedValue);
      onChange(updatedValue);
    }
  };

  const pickerValue = isPresetUrl(value.plistServer) ? value.plistServer : customTag;
  const showCustomInput = !isPresetUrl(value.plistServer);

  return (
    <ConfigSection title="安装配置">
      <ConfigItem
        title="Plist 服务"
        description="选择用于生成安装描述文件的服务"
        showSeparator={false}
      >
        <VStack alignment="trailing" spacing={8}>
          <Picker
            label={<EmptyView />}
            pickerStyle="menu"
            value={pickerValue}
            onChanged={handlePlistServerChange}
          >
            {plistServerOptions.map(option => (
              <AnimText key={option.url} tag={option.url}>
                {option.title}
              </AnimText>
            ))}
          </Picker>
          {showCustomInput && (
            <TextField
              title=""
              prompt="https://你的域名/ipa-plist"
              value={value.plistServer}
              textFieldStyle="plain"
              textInputAutocapitalization="never"
              onChanged={(text: string) => {
                const updatedValue = { ...value, plistServer: text.trim() };
                setValue(updatedValue);
                onChange(updatedValue);
              }}
            />
          )}
        </VStack>
      </ConfigItem>
    </ConfigSection>
  );
};
