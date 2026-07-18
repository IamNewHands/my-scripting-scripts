import { Script } from "scripting";
import { importFiles } from "./importFiles";

/**
 * Intent 模式下的 IPA 文件导入与跳转处理
 *
 * 功能：
 * 1. 将用户选择的 IPA 文件复制到 App Group 共享目录
 * 2. 通过 URL Scheme 跳转回主应用进行安装
 *
 * @param fileURLs - Intent 传入的文件 URL 列表
 */
export const redirectIpaToApp = async (fileURLs: string[]) => {
  
  const targetPaths = await importFiles(
    fileURLs,
    "appGroupDocumentsDirectory",
    "copyFile"
  );


  if (!targetPaths?.length) {
    return Script.exit();
  }

  const url = Script.createRunSingleURLScheme("IPA-Tool", {
    fileURLs: JSON.stringify(targetPaths),
  });

  Safari.openURL(url).then(() => Script.exit())
};
