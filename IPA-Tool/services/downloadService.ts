import type { DownloadTaskDown, DownloadTaskState } from "../hooks/useAppsState";
import {
  getAppState,
  removeAppState,
  removeAppStates,
  setAppStatus,
  setProgress,
} from "../hooks/useAppsState";
import {
  DownloadManager,
  DownloadTask,
  type DownloadStatus,
} from "../modules/download";
import { removeAppFile } from "../utils/appsFilesStore";
import { authorizeApp, sendNotification } from "../utils";
import { AppConfig, onConfigChange } from "../constants/AppConfig";

export const downloadManager = new DownloadManager(AppConfig.download);

onConfigChange((_, value) => {
  downloadManager.updateLimits(value);
}, "download");

export const startDownload = (
  id: string,
  down: DownloadTaskDown,
  isRun = true
) => {
  const task = downloadManager.findTaskById(id);
  if (task && task.status !== "deleted") return task.start(isRun);
  if (task) downloadManager.releaseTask(task);

  const handleStatusChange = (status: DownloadStatus) => {
    setAppStatus(id, status);
  };

  const handleRemove = () => {
    removeAppState(id);
  };

  const handleFinally = async (status: DownloadStatus, task: DownloadTask) => {
    if (status !== "completed") return;
    try {
      await authorizeApp(down);
      sendNotification(
        "downloadSuccess",
        `${task.name.replace("zip", "ipa")} 下载完成 ✅`
      );
      setAppStatus(id, "completed");
      downloadManager.releaseTask(task);
    } catch (e) {
      sendNotification("downloadFailed", `签名失败：${String(e)} ❌`);
      setAppStatus(id, "failed");
    }
  };

  return downloadManager
    .createTask({ ...down, name: `${down.name}.zip` })
    .onProgress(progress => {
      setProgress(id, progress);
    })
    .onStatusChange(handleStatusChange)
    .onRemove(handleRemove)
    .onFailed((status, error) => {
      if (status === "failed")
        sendNotification("downloadFailed", `${error.toString()} ❌`);
    })
    .onFinally(handleFinally)
    .start(isRun);
};

export const removeDownloadTask = (
  id: string,
  options: { emitRemove?: boolean } = {}
) => {
  const existingTask = downloadManager.findTaskById(id);
  const state = getAppState(id);
  const task =
    existingTask ??
    (state.down ? startDownload(id, state.down, false) : undefined);
  task?.remove(options);
};

type DownloadListActionItem = {
  id: string;
  appId: string;
  appKey: string;
  source: "task" | "file";
  path?: string;
  zipPath?: string;
  status: string;
};

function uniqueItemsBy<T>(items: T[], key: (item: T) => string) {
  return [...new Map(items.map(item => [key(item), item])).values()];
}

/** 多选操作必须先在源操作层合并，避免同一个文件/任务被重复删除、暂停或启动。 */
export const removeDownloadItems = async (
  items: DownloadListActionItem[],
  onRemoveDerived?: (ids: string[]) => void,
  stateSnapshots?: Record<string, Partial<DownloadTaskState>>
) => {
  const mergedItems = uniqueItemsBy(
    items,
    item => `${item.source}_${item.appId}_${item.appKey}`
  );
  const taskItems = mergedItems.filter(item => item.source === "task");
  const appIds = uniqueItemsBy(taskItems, item => item.appId).map(
    item => item.appId
  );
  const removedAppKeys = uniqueItemsBy(mergedItems, item => item.appKey).map(
    item => item.appKey
  );
  const appStateSnapshots = stateSnapshots ?? Object.fromEntries(
    appIds.map(id => [id, getAppState(id)])
  );
  const getSnapshotZipPath = (appId: string) => {
    const down = appStateSnapshots[appId]?.down;
    return down ? DownloadTask.filePath(down) + ".zip" : undefined;
  };

  if (removedAppKeys.length) onRemoveDerived?.(removedAppKeys);
  if (appIds.length) removeAppStates(appIds);

  for (const item of mergedItems) {
    try {
      const snapshotZipPath = item.zipPath ?? getSnapshotZipPath(item.appId);

      if (item.source === "task")
        removeDownloadTask(item.appId, { emitRemove: false });
      await removeAppFile(
        item.appKey,
        item.path,
        snapshotZipPath
      );
    } catch (e) {
      console.log(
        "downloadFailed",
        `删除 ${item.appKey} 失败：${String(e)} ❌`
      );
    }
  }
};

export const cancelQueuedTask = (id: string) => {
  const task = downloadManager.findTaskById(id);
  if (!task || task.status !== "queued") return;
  task.status = "cancelled";
  setAppStatus(id, "cancelled");
};

export const toggleDownloadItems = (
  items: DownloadListActionItem[],
  action: "pause" | "start"
) => {
  for (const item of uniqueItemsBy(
    items.filter(item => item.source === "task"),
    item => item.appId
  )) {
    if (action === "pause") {
      if (item.status === "downloading") {
        downloadManager.findTaskById(item.appId)?.cancel();
      } else if (item.status === "queued") {
        cancelQueuedTask(item.appId);
      }
    }

    if (action === "start") {
      const task = getAppState(item.appId);
      if (task.down && /queued|cancelled|failed/.test(item.status)) {
        startDownload(item.appId, task.down);
      }
    }
  }
};
