/**
 * File: pages/Settings/Config/InstallConfigSection.tsx
 *
 * 安装配置组件
 */

import { EmptyView, Picker, TextField, Toggle, useState, useEffect, VStack } from "scripting";
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
    disableUpdateCheck: boolean;
  };
  onChange: (value: {
    plistServer: string;
    disableUpdateCheck: boolean;
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
      // 已是自定义 URL 则保留；从预设切过来才清空便于输入
      if (isPresetUrl(value.plistServer)) {
        const updatedValue = { ...value, plistServer: "" };
        setValue(updatedValue);
        onChange(updatedValue);
      }
      return;
    }
    // 选中了预设值
    const updatedValue = { ...value, plistServer: tag };
    setValue(updatedValue);
    onChange(updatedValue);
  };

  const pickerValue = isPresetUrl(value.plistServer) ? value.plistServer : customTag;
  const showCustomInput = !isPresetUrl(value.plistServer);

  const handleDisableUpdateCheckChange = (disableUpdateCheck: boolean) => {
    const updatedValue = { ...value, disableUpdateCheck };
    setValue(updatedValue);
    onChange(updatedValue);
  };

  return (
    <ConfigSection title="安装配置">
      <ConfigItem
        title="Plist 服务"
        description="选择用于生成安装描述文件的服务"
        showSeparator={true}
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
              keyboardType="URL"
              onChanged={(text: string) => {
                // 输入中不强 trim 中间空格；落盘时去首尾
                const updatedValue = { ...value, plistServer: text.trim() };
                setValue(updatedValue);
                onChange(updatedValue);
              }}
            />
          )}
        </VStack>
      </ConfigItem>
      <ConfigItem
        title="禁用更新检查"
        description="安装后移除软件更新字段，App Store 不再提示更新（旧版降级保留）"
        showSeparator={false}
      >
        <Toggle
          frame={{ width: 50 }}
          title=""
          value={value.disableUpdateCheck}
          onChanged={handleDisableUpdateCheckChange}
        />
      </ConfigItem>
    </ConfigSection>
  );
};
