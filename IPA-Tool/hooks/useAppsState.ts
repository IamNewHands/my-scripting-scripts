import { Path, useEffect, useRef, useState } from "scripting"
import { createGlobalState } from "../modules/createGlobalStateUtils"
import { AppConfig } from "../constants/AppConfig"
import { DownloadTask } from "../modules/download/DownloadTask"
import { cleanupOrphanRows } from "../modules/AppDB"

import type {
  DownloadTaskOptions,
  DownloadStatus,
  Progress,
} from "../modules/download"

export type DownloadTaskDown = Omit<DownloadTaskOptions, "id"> & {
  id: string
  displayVersion?: string
  externalVersionId?: string
  bundleId?: string
  icon?: string
  accountEmail?: string
}

export type DownloadTaskState = {
  down?: DownloadTaskDown
  status: DownloadStatus
  localPath?: string
  localSize?: number
  downloadOrder?: number
}
export type DownloadTasksState = Record<string, DownloadTaskState>

// 初始状态
const initState: DownloadTasksState = {}

// 创建全局状态管理
export const useAppsHook = createGlobalState(
  (state: DownloadTasksState, action: (prev: DownloadTasksState) => DownloadTasksState) => {
    return { ...state, ...action(state) }
  },
  initState,
  { storageKey: AppConfig.storageKeys.downloadTasks }
)

const getZipPath = (down: DownloadTaskDown) =>
  DownloadTask.filePath(down) + ".zip"

const getIpaPath = (down: DownloadTaskDown) =>
  Path.join(FileManager.documentsDirectory, down.folder, `${down.name}_${down.displayVersion ?? ""}.ipa`)

const getNormalizedStatus = (state: DownloadTaskState) => {
  if (!state.down || state.status === "deleted") return "default"

  if (state.status === "queued") return "queued"

  if (state.status === "completed") {
    return FileManager.existsSync(getIpaPath(state.down)) ? "completed" : "default"
  }

  return FileManager.existsSync(getZipPath(state.down)) ? state.status : "default"
}

//启动时状态预处理
useAppsHook.setState(appsState => {
  Object.keys(appsState).forEach(key => {
    const appState = appsState[key]
    const status = getNormalizedStatus(appState)

    switch (status) {
      case "queued":
      case "downloading":
        appState.status = "cancelled"
        break

      case "failed":
      case "cancelled":
      case "completed":
        break

      default:
        delete appsState[key]
        break
    }
  })

  return appsState
})

const protectedSqlIds = Object.values(useAppsHook.getState() ?? {})
  .filter(app => app.status !== "deleted")
  .map(app => app.down ? `${app.down.name}_${app.down.displayVersion}` : "")
  .filter(Boolean)
cleanupOrphanRows(AppConfig.file.folder, protectedSqlIds).catch(() => { })

/**
 * 应用下载状态管理
 *
 * 全部采用模块级导出：只暴露 useAppsHook（响应式 Hook）和纯函数 setter/getter。
 * 组件内通过 useAppsHook() 订阅状态；非组件场景（service、异步回调）通过模块级函数操作。
 */

/** 读单项快照（非响应式），不触发组件订阅 */
export const getAppState = (id: string): Partial<DownloadTaskState> => useAppsHook.getState()?.[id] ?? {}

/** 更新状态 */
export const setAppStatus = (id: string, status: DownloadStatus) => {
  useAppsHook.dispatchState(prev => ({ [id]: { ...prev[id], status } }))
}

/** 更新应用完整属性（合并） */
export const setAppState = (id: string, prop: Partial<DownloadTaskState>) => {
  useAppsHook.dispatchState(prev => ({ [id]: { ...prev[id], ...prop } }))
}

/** 静默同步下载页排序：写入持久化状态，不触发订阅刷新 */
export const setDownloadOrder = (ids: string[]) => {
  useAppsHook.setState(prev => ({
    ...prev,
    ...Object.fromEntries(
      ids
        .filter(id => prev[id])
        .map((id, index) => [id, { ...prev[id], downloadOrder: index }])
    ),
  }))
}

/** 移除应用状态（标记为 deleted） */
export const removeAppState = (id: string) => {
  removeAppStates([id])
}

/** 批量移除应用状态（标记为 deleted） */
export const removeAppStates = (ids: string[]) => {
  useAppsHook.dispatchState(() =>
    Object.fromEntries(ids.map(id => [id, { status: "deleted" }]))
  )
}

/** 清理活跃下载状态，不删除文件/SQL，不写 deleted tombstone。 */
export const clearAppState = (id: string) => {
  useAppsHook.dispatchState(prev => {
    const next = { ...prev }
    delete next[id]
    return next
  })
}

// ── 进度（独立 createGlobalState，不持久化）──

const _progress: Record<string, Progress> = (() => {
  const appsSnapshot = useAppsHook.getState()
  return Object.fromEntries(
    Object.entries(appsSnapshot)
      .map(([id, app]) => {
        const total = app.down?.totalSize
        if (!total || !app.down) return
        const localPath = getZipPath(app.down)
        const downloaded = FileManager.existsSync(localPath) ? FileManager.statSync(localPath).size : 0
        return [id, { downloaded, total, percent: total > 0 ? downloaded / total : 0 }]
      })
      .filter((entry): entry is [string, Progress] => Boolean(entry))
  )
})()

/** 服务层写进度 */
export const setProgress = (id: string, progress: Progress) => {
  _progress[id] = progress
}

/** 非组件读进度快照 */
export const getProgress = (id: string): Progress =>
  _progress[id] ?? { downloaded: 0, total: 0, percent: 0 }

/** 组件自轮询进度 hook */
export const useProgress = (id: string, status?: DownloadStatus | string, interval = 100) => {
  const [local, setLocal] = useState<Progress>(() => getProgress(id))
  const lastRef = useRef(local.downloaded)
  const isRunning = status === undefined || status === "fetching" || status === "downloading"

  useEffect(() => {
    const current = getProgress(id)
    lastRef.current = current.downloaded
    setLocal(current)

    if (!isRunning) return

    let active = true
    const poll = () => {
      if (!active) return
      const next = getProgress(id)
      if (next.downloaded !== lastRef.current) {
        lastRef.current = next.downloaded
        setLocal(next)
      }
      setTimeout(poll, interval)
    }
    poll()
    return () => { active = false }
  }, [id, isRunning, interval])

  return local
}
