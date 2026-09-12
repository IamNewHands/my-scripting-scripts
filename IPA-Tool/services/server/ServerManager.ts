// 文件：scripts/ipaTool/services/server/ServerManager.ts
// 说明：HTTP 文件服务器管理

import { AppConfig } from "../../constants/AppConfig";
import { BackgroundManager } from "../../modules/BackgroundManager";
import { AppEvents, Path } from "scripting";
import { sendNotification } from "../../utils";

let serverStarted = false;

const isServerAlreadyStartedError = (error: unknown) =>
  `${error}`.includes("already") || `${error}`.includes("in use");

export const initServerManager = () => {
  if (serverStarted) return;

  const backgroundManager = new BackgroundManager();
  const root = Path.join(FileManager.documentsDirectory, AppConfig.file.folder);
  const server = new HttpServer();
  server.listenAddressIPv4 = AppConfig.server.host;

  server.registerFilesFromDirectory("/:file", root);


  const error = server.start({ port: AppConfig.server.port, forceIPv4: true });
  
  if (error) {
    if (isServerAlreadyStartedError(error)) return;

    sendNotification("serverNotification", error);
    return;
  }

  serverStarted = true;

  AppEvents.scenePhase.addListener(phase => {
    backgroundManager.setActive(phase === "background");
  });
};
