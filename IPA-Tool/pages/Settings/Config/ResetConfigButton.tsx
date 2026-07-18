/**
 * File: pages/Settings/Config/ResetConfigButton.tsx
 *
 * 重置配置按钮组件
 */

import { Section, Button, Path, Navigation } from "scripting";
import type { ToastType } from "../../../components/Toast";
import { resetConfig, AppConfig, getAllStorageKeys } from "../../../constants/AppConfig";
import { EditableGlassListRow } from "../../../components/EditableGlassListPipeline";
import { AnimText } from "../../../components/AnimText"

interface Props {
  showToast: (type: ToastType, message: string) => void;
  dismiss: () => void;
}

// 组件内部样式配置
const styles = {
  button: {
    padding: { horizontal: true } as const,
    buttonStyle: "plain" as const,
  },
  buttonText: {
    font: "body" as const,
    foregroundStyle: "systemRed" as const,
  },
};

const handleResetConfig = async (
  showToast: Props["showToast"],
  dismiss: () => void
) => {
  try {
    const selectedIndex = await Dialog.actionSheet({
      title: "是否重置应用",
      message:
        "重置应用将重启app 并清除所有配置数据，包括下载任务、通知设置等。",
      actions: [
        {
          label: "是",
          destructive: true,
        },
      ],
    });

    if (selectedIndex === undefined) return;
    const {
      file: { folder },
    } = AppConfig;
    showToast("loading", "重置中");

    // 删除文件
    const dir = Path.join(FileManager.documentsDirectory, folder);
    FileManager.existsSync(dir) && FileManager.removeSync(dir);

    // 清空所有本地业务 key
    getAllStorageKeys().forEach(key => Storage.remove(key));
    resetConfig();

    showToast("success", "重置成功");

    setTimeout(dismiss, 1000);
  } catch {
    showToast("error", "重置失败 ❌");
  }
};

/**
 * 重置应用按钮组件
 * @param config 完整的 AppConfig 对象
 */
export const ResetConfigButton = ({ showToast, dismiss }: Props) => {
  return (
    <EditableGlassListRow>
      <Section>
        <Button
          {...styles.button}
          action={() => handleResetConfig(showToast, dismiss)}
        >
          <AnimText {...styles.buttonText}>重置应用</AnimText>
        </Button>
      </Section>
    </EditableGlassListRow>
  );
};
