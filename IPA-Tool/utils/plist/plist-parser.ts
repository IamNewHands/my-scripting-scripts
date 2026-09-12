/**
 * 轻量级 Plist 解析器
 * 支持 XML 和 二进制 格式
 * 纯原生 TypeScript 实现，零依赖
 */

/** Plist 解析后的值类型 */
export type PlistValue =
  | string
  | number
  | boolean
  | Date
  | PlistObject
  | PlistArray
  | Uint8Array
  | null;

/** Plist 对象（字典）类型 */
interface PlistObject {
  [key: string]: PlistValue;
}

type PlistArray = PlistValue[];

/**
 * 解析 Plist 数据（自动识别 XML 或二进制格式）
 * @param data - Plist 数据（Data 类型）
 * @returns 解析后的 JavaScript 对象
 * @throws 当格式无效或解析失败时抛出错误
 *
 * @example
 * ```ts
 * const data = await FileManager.read(filePath);
 * const parsed = parse(data);
 *
 * // 使用泛型获得类型提示
 * interface AppInfo {
 *   CFBundleName: string;
 *   CFBundleVersion: string;
 * }
 * const appInfo = parse<AppInfo>(data);
 * ```
 */
/**
 * 解析 XML 格式的 Plist
 * @param xml - Plist XML 字符串
 * @returns 解析后的对象
 */
export const parseXML = <T extends PlistValue = PlistValue>(xml: string): T => {
  let pos = 0;

  const skipTo = (str: string): void => {
    const index = xml.indexOf(str, pos);
    if (index === -1) throw new Error("找不到: " + str);
    pos = index;
  };

  const skipWhitespace = (): void => {
    while (pos < xml.length && /\s/.test(xml[pos])) pos++;
  };

  const readTagName = (): string => {
    let name = "";
    while (
      pos < xml.length &&
      xml[pos] !== ">" &&
      xml[pos] !== " " &&
      xml[pos] !== "/"
    ) {
      name += xml[pos++];
    }
    return name;
  };

  const readUntil = (str: string): string => {
    const start = pos;
    const index = xml.indexOf(str, pos);
    if (index === -1) throw new Error("找不到: " + str);
    pos = index;
    return xml.substring(start, index);
  };

  const decodeXML = (str: string): string => {
    return str
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  };

  const parseElement = (): PlistValue => {
    skipWhitespace();
    if (xml[pos] !== "<") throw new Error('期望 "<"');

    pos++; // 跳过 '<'
    const tagName = readTagName();

    // 处理自闭合标签
    if (
      xml[pos] === "/" ||
      (xml[pos] === " " && xml.indexOf("/>", pos) < xml.indexOf(">", pos))
    ) {
      skipTo(">");
      pos++;
      if (tagName === "true") return true;
      if (tagName === "false") return false;
      return null;
    }

    skipTo(">");
    pos++; // 跳过 '>'

    let value: PlistValue;
    switch (tagName) {
      case "dict": {
        const dict: PlistObject = {};
        while (true) {
          skipWhitespace();
          if (xml.substr(pos, 7) === "</dict>") break;

          skipTo("<key>");
          pos += 5;
          const key = readUntil("</key>");
          pos += 6;

          dict[key] = parseElement();
        }
        pos += 7; // 跳过 </dict>
        value = dict;
        break;
      }

      case "array": {
        const arr: PlistArray = [];
        while (true) {
          skipWhitespace();
          if (xml.substr(pos, 8) === "</array>") break;
          arr.push(parseElement());
        }
        pos += 8; // 跳过 </array>
        value = arr;
        break;
      }

      case "string":
        value = decodeXML(readUntil("</string>"));
        pos += 9;
        break;

      case "integer":
        value = parseInt(readUntil("</integer>").trim(), 10);
        pos += 10;
        break;

      case "real":
        value = parseFloat(readUntil("</real>").trim());
        pos += 7;
        break;

      case "date":
        value = new Date(readUntil("</date>").trim());
        pos += 7;
        break;

      case "data":
        value = readUntil("</data>").trim();
        pos += 7;
        break;

      case "true":
        value = true;
        break;

      case "false":
        value = false;
        break;

      case "plist":
        value = parseElement();
        skipTo("</plist>");
        pos += 8;
        return value;

      default:
        throw new Error("未知标签: " + tagName);
    }

    return value;
  };

  // 跳到 plist 标签
  skipTo("<plist");
  skipTo(">");
  pos++;

  return parseElement() as T;
};

/**
 * 解析二进制格式的 Plist
 * @param uint8 - 二进制数据（Uint8Array）
 * @returns 解析后的对象
 */
export const parseBinary = <T extends PlistValue = PlistValue>(
  uint8: Uint8Array
): T => {
  const data = uint8;
  const length = data.length;

  // 验证最小长度（头部8字节 + 尾部32字节）
  if (length < 40) {
    throw new Error("二进制 plist 文件太小，格式无效");
  }

  // 读取尾部 trailer（最后 32 字节）
  const trailerOffset = length - 32;

  // 偏移表中每个偏移值的字节大小
  const offsetSize = data[trailerOffset + 6];
  // 对象引用的字节大小
  const objectRefSize = data[trailerOffset + 7];
  // 对象数量（8 字节，大端序）
  const numObjects = readUint64BE(data, trailerOffset + 8);
  // 根对象索引（8 字节）
  const topObject = readUint64BE(data, trailerOffset + 16);
  // 偏移表的起始位置（8 字节）
  const offsetTableOffset = readUint64BE(data, trailerOffset + 24);

  // 验证参数合理性
  if (offsetSize < 1 || offsetSize > 8) {
    throw new Error(`无效的偏移大小: ${offsetSize}`);
  }
  if (objectRefSize < 1 || objectRefSize > 8) {
    throw new Error(`无效的对象引用大小: ${objectRefSize}`);
  }
  if (numObjects > 1000000) {
    throw new Error(`对象数量过多: ${numObjects}`);
  }

  // 读取偏移表
  const offsetTable: number[] = [];
  for (let i = 0; i < numObjects; i++) {
    const offset = readUintBE(
      data,
      offsetTableOffset + i * offsetSize,
      offsetSize
    );
    offsetTable.push(offset);
  }

  // 对象缓存（避免循环引用时重复解析）
  const objectCache = new Map<number, PlistValue>();

  /**
   * 解析指定索引的对象
   */
  const parseObject = (objectIndex: number): PlistValue => {
    if (objectIndex >= numObjects) {
      throw new Error(`对象索引越界: ${objectIndex}`);
    }

    // 检查缓存
    if (objectCache.has(objectIndex)) {
      return objectCache.get(objectIndex)!;
    }

    const offset = offsetTable[objectIndex];
    if (offset >= length) {
      throw new Error(`偏移值越界: ${offset}`);
    }

    const marker = data[offset];
    const type = (marker & 0xf0) >> 4;
    const info = marker & 0x0f;

    let value: PlistValue;

    switch (type) {
      case 0x0: // 简单类型
        if (info === 0x00) value = null;
        else if (info === 0x08) value = false;
        else if (info === 0x09) value = true;
        else throw new Error(`未知的简单类型: 0x${info.toString(16)}`);
        break;

      case 0x1: // 整数
        value = readInteger(data, offset + 1, 1 << info);
        break;

      case 0x2: // 浮点数
        if (info === 2) {
          // 32-bit float
          value = readFloat32BE(data, offset + 1);
        } else if (info === 3) {
          // 64-bit double
          value = readFloat64BE(data, offset + 1);
        } else {
          throw new Error(`不支持的浮点类型: ${info}`);
        }
        break;

      case 0x3: // 日期（8字节浮点数，表示自 2001-01-01 的秒数）
        if (info === 3) {
          const timestamp = readFloat64BE(data, offset + 1);
          // Core Foundation 时间基准：2001-01-01 00:00:00 UTC
          const cfAbsoluteTimeBase = 978307200000; // 毫秒
          value = new Date(cfAbsoluteTimeBase + timestamp * 1000);
        } else {
          throw new Error(`不支持的日期格式: ${info}`);
        }
        break;

      case 0x4: // 二进制数据
        const dataLength = readLength(data, offset, info);
        const dataOffset =
          offset +
          1 +
          (info === 0x0f ? getLengthByteSize(dataLength.length) : 0);
        value = data.slice(dataOffset, dataOffset + dataLength.length);
        break;

      case 0x5: // ASCII 字符串
        const asciiLength = readLength(data, offset, info);
        const asciiOffset =
          offset +
          1 +
          (info === 0x0f ? getLengthByteSize(asciiLength.length) : 0);
        value = String.fromCharCode(
          ...data.slice(asciiOffset, asciiOffset + asciiLength.length)
        );
        break;

      case 0x6: // UTF-16 字符串
        const utf16Length = readLength(data, offset, info);
        const utf16Offset =
          offset +
          1 +
          (info === 0x0f ? getLengthByteSize(utf16Length.length) : 0);
        const chars: number[] = [];
        for (let i = 0; i < utf16Length.length; i++) {
          chars.push(readUint16BE(data, utf16Offset + i * 2));
        }
        value = String.fromCharCode(...chars);
        break;

      case 0xa: // 数组
        const arrayLength = readLength(data, offset, info);
        const arrayOffset =
          offset +
          1 +
          (info === 0x0f ? getLengthByteSize(arrayLength.length) : 0);
        const arr: PlistArray = [];

        // 先创建占位，处理循环引用
        objectCache.set(objectIndex, arr);

        for (let i = 0; i < arrayLength.length; i++) {
          const objRef = readUintBE(
            data,
            arrayOffset + i * objectRefSize,
            objectRefSize
          );
          arr.push(parseObject(objRef));
        }
        value = arr;
        break;

      case 0xd: // 字典
        const dictLength = readLength(data, offset, info);
        const dictOffset =
          offset +
          1 +
          (info === 0x0f ? getLengthByteSize(dictLength.length) : 0);
        const dict: PlistObject = {};

        // 先创建占位，处理循环引用
        objectCache.set(objectIndex, dict);

        // 键引用在前，值引用在后
        for (let i = 0; i < dictLength.length; i++) {
          const keyRef = readUintBE(
            data,
            dictOffset + i * objectRefSize,
            objectRefSize
          );
          const valRef = readUintBE(
            data,
            dictOffset + (dictLength.length + i) * objectRefSize,
            objectRefSize
          );

          const key = parseObject(keyRef);
          if (typeof key !== "string") {
            throw new Error(`字典键必须是字符串，得到: ${typeof key}`);
          }

          dict[key] = parseObject(valRef);
        }
        value = dict;
        break;

      default:
        throw new Error(
          `不支持的对象类型: 0x${type.toString(
            16
          )} (marker: 0x${marker.toString(16)})`
        );
    }

    objectCache.set(objectIndex, value);
    return value;
  };

  return parseObject(topObject) as T;
};

// ==================== 辅助函数 ====================

/**
 * 读取大端序 uint16
 */
const readUint16BE = (data: Uint8Array, offset: number): number => {
  return (data[offset] << 8) | data[offset + 1];
};

/**
 * 读取大端序 uint32
 */
const readUint32BE = (data: Uint8Array, offset: number): number => {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  );
};

/**
 * 读取大端序 uint64（返回 number，可能丢失精度）
 */
const readUint64BE = (data: Uint8Array, offset: number): number => {
  const high = readUint32BE(data, offset);
  const low = readUint32BE(data, offset + 4);
  return high * 0x100000000 + low;
};

/**
 * 读取任意长度的大端序无符号整数
 */
const readUintBE = (
  data: Uint8Array,
  offset: number,
  length: number
): number => {
  if (length < 1 || length > 8) {
    throw new Error(`不支持的整数长度: ${length}`);
  }

  let value = 0;
  for (let i = 0; i < length; i++) {
    value = value * 256 + data[offset + i];
  }
  return value;
};

/**
 * 读取整数（有符号或无符号）
 */
const readInteger = (
  data: Uint8Array,
  offset: number,
  length: number
): number => {
  if (length === 1) {
    return data[offset];
  } else if (length === 2) {
    return readUint16BE(data, offset);
  } else if (length === 4) {
    return readUint32BE(data, offset);
  } else if (length === 8) {
    return readUint64BE(data, offset);
  } else {
    throw new Error(`不支持的整数长度: ${length}`);
  }
};

/**
 * 读取 32 位浮点数（大端序）
 */
const readFloat32BE = (data: Uint8Array, offset: number): number => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, data[offset + i]);
  }
  return view.getFloat32(0, false); // false = 大端序
};

/**
 * 读取 64 位浮点数（大端序）
 */
const readFloat64BE = (data: Uint8Array, offset: number): number => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, data[offset + i]);
  }
  return view.getFloat64(0, false); // false = 大端序
};

/**
 * 读取长度字段
 * 如果 info < 0x0f，直接返回 info
 * 如果 info = 0x0f，后续字节编码了实际长度
 */
const readLength = (
  data: Uint8Array,
  offset: number,
  info: number
): { length: number } => {
  if (info < 0x0f) {
    return { length: info };
  }

  // info = 0x0f，下一个字节是长度编码
  const lengthMarker = data[offset + 1];
  const lengthType = (lengthMarker & 0xf0) >> 4;
  const lengthInfo = lengthMarker & 0x0f;

  if (lengthType !== 0x1) {
    throw new Error(
      `期望长度标记为整数类型，得到: 0x${lengthType.toString(16)}`
    );
  }

  const lengthSize = 1 << lengthInfo;
  const length = readUintBE(data, offset + 2, lengthSize);

  return { length };
};

/**
 * 获取长度编码所占字节数
 */
const getLengthByteSize = (length: number): number => {
  if (length < 256) return 2; // 标记 + 1字节长度
  if (length < 65536) return 3; // 标记 + 2字节长度
  if (length < 16777216) return 4; // 标记 + 3字节长度
  return 9; // 标记 + 8字节长度
};
