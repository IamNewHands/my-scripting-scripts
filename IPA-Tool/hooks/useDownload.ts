import { startDownload, removeDownloadTask, downloadManager } from "../services/downloadService"

export { downloadManager }

export const useDownload = (id: string) => {
  const appId = id
  return {
    startDownload: (down: Parameters<typeof startDownload>[1], isRun = true) => startDownload(appId, down, isRun),
    removeTask: () => removeDownloadTask(appId),
  }
}
