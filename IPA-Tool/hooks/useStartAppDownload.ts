/**
 * useStartAppDownload Hook
 * 封装应用下载启动逻辑，可在多处复用
 */

import { AbortController, useRef } from "scripting";
import { apiGetAppInfo } from "../services/api";
import { AppConfig } from "../constants/AppConfig";
import { sendNotification } from "../utils";
import { getAuthStateSnapshot } from "./useAuth";
import { switchTab, Tab } from "./useTabs";
import { getAppState, setAppState, setAppStatus } from "./useAppsState";
import { onSearchShowToast } from "../pages/SearchNext/store/toast";
import { startDownload } from "../services/downloadService";
import { add as addApp } from "../modules/AppDB";
import { notifyAppsFilesChanged } from "../utils/appsFilesStore";
import type { DownloadStatus } from "../modules/download";

export interface StartDownloadParams {
  /** 应用 ID */
  id: string;
  /** 应用名称 */
  name: string;
  /** 内部版本号(可选,不传则下载最新版本) */
  internalVersion?: string;
  /** 应用图标(可选,不传则从 API 获取) */
  icon?: string;
}

export interface StartDownloadOptions {
  /** 下载前的回调 */
  onBeforeDownload?: () => void;
  /** 下载成功后的回调 */
  onSuccess?: () => void;
  /** 下载失败后的回调 */
  onError?: (error: Error) => void;
}

/**
 * 应用下载启动 Hook
 *
 * @returns startAppDownload - 启动下载的函数
 */
export const useStartAppDownload = () => {
  const fetchingController = useRef<AbortController | null>(null);

  /**
   * 启动应用下载
   *
   * @param params - 下载参数
   * @param options - 可选的回调配置
   */
  const startAppDownload = async (
    params: StartDownloadParams,
    options?: StartDownloadOptions
  ) => {
    const { id, internalVersion, icon } = params;
    const appId = id;
    const { onBeforeDownload, onSuccess, onError } = options ?? {};

    Promise.try(async () => {
      let { down, status } = getAppState(appId);
      // 1. 检查登录状态
      if (!getAuthStateSnapshot().isLoggedIn) {
        onSearchShowToast.run("error", "请先登录");
        setTimeout(() => switchTab(Tab.Settings), 1000);
        throw new Error("未登录");
      }

      // 2. 执行下载前回调
      if (status !== "downloading") {
        onBeforeDownload?.();
      }

      // 3. 缺少 down，或下载已完成时，需要重新获取 appInfo/sinf，避免复用旧下载数据。
      if (!down || status === "completed") {
        if (status === "fetching") {
          fetchingController.current?.abort("已取消前置下载");
          return;
        }

        const controller = new AbortController();
        fetchingController.current = controller;

        // 3. 设置前置请求等待ui
        setAppStatus(appId, "fetching");

        const { appInfo } = await apiGetAppInfo(id, internalVersion, {
          signal: controller.signal,
        });

        // 如果再次下载历史版本相同，直接退出
        if (
          status === "completed" &&
          down?.displayVersion === appInfo.displayVersion
        ) {
          setAppStatus(appId, "completed");
          return;
        } else if (status === "completed") {
          notifyAppsFilesChanged();
        }

        const accountEmail = getAuthStateSnapshot().account || undefined;
        down = {
          url: appInfo.url,
          id: appId,
          name: appInfo.name,
          totalSize: appInfo.fileSize,
          folder: AppConfig.file.folder,
          displayVersion: appInfo.displayVersion,
          externalVersionId: appInfo.externalVersionId,
          bundleId: appInfo.bundleId,
          icon: icon ?? appInfo.icon,
          accountEmail,
        };

        // 写入 sinf 到 SQLite（原始字符串，存在则跳过）
        if (appInfo.sinf) {
          await addApp(
            `${appInfo.name}_${appInfo.displayVersion}`,
            appInfo.name,
            appInfo.displayVersion,
            appInfo.bundleId,
            appInfo.sinf,
            id,
            appInfo.metadata ?? "",
            icon ?? appInfo.icon
          );
        } else {
          // sinf 为空，跳过 SQLite 写入
        }

      }

      // 4. 更新状态并启动下载
      setAppState(appId, { down });

      startDownload(appId, down);

      // 5. 执行成功的回调
      onSuccess?.();
    }).catch((error: unknown) => {
      // 6. 错误处理
      fetchingController.current = null;
      const err = (
        error instanceof Error ? error : new Error(String(error))
      ) as Error & { status?: DownloadStatus };
      let status = err.status ?? "failed";
      if (err.name === "AbortError" && err.message === "已取消前置下载") {
        status = "pending";
      }

      if (status === "failed") {
        sendNotification("downloadFailed", `${err.toString()}`);
      }

      setAppStatus(appId, status);
      // 7. 执行错误回调
      onError?.(err);
    });
  };

  return {
    startAppDownload,
    get isLoggedIn() {
      return getAuthStateSnapshot().isLoggedIn;
    },
  };
};
