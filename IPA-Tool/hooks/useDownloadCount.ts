import { useAppsHook } from "./useAppsState"
import type { DownloadTaskDown, DownloadTaskState } from "./useAppsState"
import type { DownloadStatus } from "../modules/download"

export type DownloadTaskItem = DownloadTaskState & { down: DownloadTaskDown }

const taskStatuses: DownloadStatus[] = ["fetching", "downloading", "completed", "cancelled", "queued", "failed"]

const getDownloadOrder = (task: DownloadTaskItem) =>
  task.downloadOrder ?? Number.MAX_SAFE_INTEGER

const isDownloadTask = (task: DownloadTaskState): task is DownloadTaskItem => !!task.down?.id

export const useDownloadCount = () => {
  const [appsState] = useAppsHook()

  const downTask: DownloadTaskItem[] = []
  Object.values(appsState).forEach(task => {
    isDownloadTask(task) && taskStatuses.includes(task.status) && downTask.unshift(task)
  })
  downTask.sort((a, b) => getDownloadOrder(a) - getDownloadOrder(b))

  return { downTask }
}
