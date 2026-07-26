/**
 * 调试日志工具。
 * 写日志到脚本根目录的 IPA-Tool_debug.log。
 * 开关通过 AppConfig.notification.debugLogging 控制。
 */

import { AppConfig } from "../constants/AppConfig"

const LOG_FILE = "IPA-Tool_debug.log"

/** 格式化时间戳 */
const timestamp = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/** 获取日志文件路径（脚本根目录） */
const logPath = () => {
  // 脚本根目录 = FileManager.documentsDirectory
  return Path.join(FileManager.documentsDirectory, LOG_FILE)
}

/** 追加一行日志 */
const appendLine = (line: string) => {
  try {
    const path = logPath()
    const existing = FileManager.existsSync(path) ? FileManager.read(path) as string : ""
    FileManager.write(path, existing + line + "\n")
  } catch {
    // 写日志失败不抛异常，避免影响主流程
  }
}

/** 清空日志文件 */
export const clearLog = () => {
  try {
    FileManager.write(logPath(), "")
  } catch {}
}

/**
 * 调试日志：仅当 debugLogging 开启时写入文件。
 * 用法：Logger.debug("下载完成", appId, status)
 */
export const Logger = {
  debug: (...args: unknown[]) => {
    if (!AppConfig.notification.debugLogging) return
    const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
    appendLine(`[${timestamp()}] [DEBUG] ${message}`)
  },

  /** 始终写入（非调试关键信息，如错误/启动） */
  info: (...args: unknown[]) => {
    const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
    appendLine(`[${timestamp()}] [INFO] ${message}`)
  },

  /** 错误日志（始终写入） */
  error: (...args: unknown[]) => {
    const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")
    appendLine(`[${timestamp()}] [ERROR] ${message}`)
  },
}