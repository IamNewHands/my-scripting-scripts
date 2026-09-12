import { Toggle, useEffect, useState } from "scripting";
import { ConfigSection } from "./ConfigSection";
import { ConfigItem } from "./ConfigItem";

interface ExperimentalConfigSectionProps {
  initialValue: {
    sapSignCache: boolean;
  };
  onChange: (value: { sapSignCache: boolean }) => void;
}

/**
 * 实验配置组件
 */
export const ExperimentalConfigSection = ({
  initialValue,
  onChange,
}: ExperimentalConfigSectionProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSapSignCacheChange = (sapSignCache: boolean) => {
    const updatedValue = { ...value, sapSignCache };
    setValue(updatedValue);
    onChange(updatedValue);
  };

  return (
    <ConfigSection title="实验配置">
      <ConfigItem
        title="SAP 签名缓存"
        description="复用 SAP 签名结果"
        showSeparator={false}
      >
        <Toggle
          frame={{ width: 50 }}
          title=""
          value={value.sapSignCache}
          onChanged={handleSapSignCacheChange}
        />
      </ConfigItem>
    </ConfigSection>
  );
};
