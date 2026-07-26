// 文件：scripts/ipaTool/services/server/ServerManager.ts
// 说明：HTTP 文件服务器管理，用于提供 IPA 文件下载服务

import { AppConfig } from "../../constants/AppConfig";
import { BackgroundManager } from "../../modules/BackgroundManager";
import { AppEvents, Path } from "scripting";
import { sendNotification } from "../../utils";

let serverStarted = false;

const isServerAlreadyStartedError = (error: unknown) =>
  `${error}`.includes("already") || `${error}`.includes("in use");

export const initServerManager = () => {
  if (serverStarted) return;

  // 创建后台管理器实例，用于控制后台保活
  const backgroundManager = new BackgroundManager();

  // 获取 IPA 文件存储根目录
  const root = Path.join(FileManager.documentsDirectory, AppConfig.file.folder);

  // 创建 HTTP 服务器实例
  const server = new HttpServer();

  /**
   * 注册文件服务路由
   * 路由格式：http://localhost:8000/:file
   * 例如：http://localhost:8000/app.ipa
   */
  server.registerFilesFromDirectory("/:file", root);

  /**
   * 启动服务器
   * 端口：8000
   */
  const error = server.start({ port: 8000 });
  if (error) {
    // 重复启动/端口占用不反复弹通知
    if (isServerAlreadyStartedError(error)) return;
    sendNotification("serverNotification", error);
    return;
  }

  serverStarted = true;

  /**
   * 监听应用生命周期变化
   * - active: 应用进入前台，停用后台保活
   * - background: 应用进入后台，启用后台保活（保持服务器运行）
   */

  AppEvents.scenePhase.addListener(phase => {
    backgroundManager.setActive(phase === "background");
  });
};
