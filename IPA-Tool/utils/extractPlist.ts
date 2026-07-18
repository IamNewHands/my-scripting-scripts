import { parseXML, parseBinary, PlistValue } from "./plist-parser";
import { Path } from "scripting";
import { AppConfig } from "../constants/AppConfig";

/**
 * 从 Archive 中提取并解析 Plist 文件
 * 自动识别 XML 和二进制格式
 *
 * @param archive - Archive 对象
 * @param targetPath - 要提取的 plist 文件路径
 * @param callback - 解析成功后的回调函数，接收解析后的数据
 *
 * @example
 * ```ts
 * await extractAndParsePlist<ITunesMetadata>(
 *   archive,
 *   "iTunesMetadata.plist",
 *   (data) => {
 *     const { bundleDisplayName, itemId } = data;
 *     state[itemId] = { name: bundleDisplayName };
 *   }
 * );
 * ```
 */
export const extractAndParsePlist = async <T extends PlistValue = PlistValue>(
  archive: Archive,
  targetPath: string,
  callback: (data: T) => void
): Promise<void> => {
  // 提取文件内容
  const chunks: Data[] = [];
  await archive.extract(targetPath, chunk => chunks.push(chunk));
  const rawString = Data.combine(chunks).toRawString();

  await Promise.try(async () => {
    // 确认文件头是 xml 格式（可以直接从内存解析）
    if (rawString && rawString.startsWith("<?xml")) {
      callback(parseXML<T>(rawString));
      return;
    }

    // 二进制格式（需要写入临时文件后解析）
    const tempDir = Path.join(
      FileManager.temporaryDirectory,
      AppConfig.file.folder,
      Path.basename(targetPath)
    );

    // 创建临时目录
    await FileManager.createDirectory(Path.dirname(tempDir), true);

    // 删除旧的临时文件（避免重复提取）
    if (await FileManager.exists(tempDir)) {
      await FileManager.remove(tempDir);
    }

    // 提取到临时目录
    await archive.extractTo(targetPath, tempDir);

    // 读取临时文件
    const fileData = (await FileManager.readAsData(tempDir)).toUint8Array();

    //确认二进制文件头是 bplist
    if (
      !fileData ||
      !String.fromCharCode(...fileData.slice(0, 6)).includes("bplist")
    ) {
      throw new Error("不支持的 Plist 格式");
    }

    // 解析二进制文件 并调用回调函数
    callback(parseBinary<T>(fileData));

    // 清理临时文件
    await FileManager.remove(tempDir);
  }).catch(err => {
    throw new Error(`提取并解析 Plist 文件失败: ${err.message}`);
  });
};
