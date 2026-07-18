/**
 * IPA 文件导入 Hook
 * 用于从文件 App 或 iCloud Drive 导入 IPA 文件
 */

import { Path, Notification } from "scripting";
import { AppConfig } from "../constants/AppConfig";

type TargetBaseDir =
  | "documentsDirectory"
  | "temporaryDirectory"
  | "appGroupDocumentsDirectory"
  | "iCloudDocumentsDirectory"
  | "scriptsDirectory";

export const importFiles = async (
  paths?: string[],
  targetBaseDir: TargetBaseDir = "documentsDirectory",
  mode: "copyFile" | "rename" = "rename"
) => {
  try {
    if (!paths) {
      // 打开文件选择器
      paths = await DocumentPicker.pickFiles({
        initialDirectory: FileManager.iCloudDocumentsDirectory,
        allowsMultipleSelection: true,
      });
    }

    // 过滤出 .ipa 文件
    const ipaPaths = paths.filter(p => p.endsWith(".ipa"));

    // 如果没有选择 IPA 文件，直接返回
    if (!ipaPaths.length) return;

    // 创建目标目录
    const targetDir = Path.join(
      FileManager[targetBaseDir],
      AppConfig.file.folder
    );
    await FileManager.createDirectory(targetDir, true);

    const targetPaths: string[] = [];
    // 移动所有 IPA 文件到目标目录
    for (const path of ipaPaths) {
      const targetPath = Path.join(targetDir, Path.basename(path));
      targetPaths.push(targetPath);
      await FileManager[mode](path, targetPath);
    }

    return targetPaths;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    Notification.schedule({
      title: "IPA导入失败",
      body: message,
    });
  }
};
