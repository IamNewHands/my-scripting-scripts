import { useObservable, useState, useEffect, useRef, Path } from "scripting"
import { useDownloadCount } from "../../../hooks/useDownloadCount"
import type { DownloadTaskItem } from "../../../hooks/useDownloadCount"
import { DownloadTask } from "../../../modules/download"
import { getApp } from "../../../modules/AppDB"
import { onAppsFilesChanged, scanAppsFiles, type AppFileInfo, type AppsFilesState } from "../../../utils/appsFilesStore"

export type MergedItemSource = "task" | "file"

export type MergedItem = {
  id: string
  appId: string
  appKey: string
  source: MergedItemSource
  name: string
  displayVersion: string
  icon: string | null | undefined
  bundleId: string
  path: string
  size: number
  fileName: string
  status: string
  zipPath?: string
  accountEmail?: string
}

const getFileSize = (path: string) =>
  FileManager.existsSync(path) ? FileManager.statSync(path).size : 0

const getTaskPackagePaths = (task: DownloadTaskItem) => {
  const base = DownloadTask.filePath({ folder: task.down.folder, id: task.down.id, name: task.down.name })
  const zipPath = base + ".zip"
  const ipaPath = task.localPath ?? Path.join(Path.dirname(base), `${task.down.name}_${task.down.displayVersion ?? ""}.ipa`)
  return { zipPath, ipaPath }
}

const taskId = (task: DownloadTaskItem) =>
  `${task.down.name}_${task.down.displayVersion}`

const itemFingerprint = (items: MergedItem[]) =>
  items.map(item => {
    const stableSize = item.status === "completed" ? item.size : 0
    return `${item.source}_${item.appId}_${item.appKey}_${item.status}_${item.path}_${stableSize}`
  }).join(",")

const tasksFingerprint = (tasks: DownloadTaskItem[]) =>
  tasks.map(task => `${taskId(task)}_${task.status}_${task.down.id}_${task.down.displayVersion ?? ""}`).join(",")

const localOnlyAppFiles = (items: MergedItem[]): AppsFilesState =>
  Object.fromEntries(
    items
      .filter(item => item.status === "completed" && FileManager.existsSync(item.path))
      .map((item): [string, AppFileInfo] => [item.appKey, {
        name: item.name,
        path: item.path,
        displayVersion: item.displayVersion,
        size: item.size,
        icon: item.icon,
        bundleId: item.bundleId,
        fileName: item.fileName,
      }])
  )

const completedTaskAppFiles = async (tasks: DownloadTaskItem[]) => {
  const result: AppsFilesState = {}
  for (const task of tasks) {
    if (task.status !== "completed") continue
    const id = taskId(task)
    const { ipaPath } = getTaskPackagePaths(task)
    if (!FileManager.existsSync(ipaPath)) continue

    const app = await getApp(id)
    if (!app) continue

    result[id] = {
      name: app.name,
      path: ipaPath,
      displayVersion: app.version,
      size: getFileSize(ipaPath),
      icon: app.icon ?? task.down.icon,
      bundleId: app.bundle_id ?? task.down.bundleId ?? "",
      fileName: `${id}.ipa`,
      accountEmail: task.down.accountEmail,
    }
  }
  return result
}

const buildItems = (tasks: DownloadTaskItem[], appFiles: AppsFilesState) => {
  const existingAppFiles = Object.fromEntries(
    Object.entries(appFiles).filter(([, app]) => FileManager.existsSync(app.path))
  ) as AppsFilesState
  const downloadIds = new Set<string>()
  const merged = tasks.map(task => {
    const id = taskId(task)
    const { ipaPath, zipPath } = getTaskPackagePaths(task)
    const path = task.status === "completed" ? ipaPath : zipPath
    downloadIds.add(id)

    const appId = String(task.down.id)
    const base: MergedItem = {
      id,
      appId,
      appKey: id,
      source: "task",
      name: task.down.name,
      displayVersion: task.down.displayVersion ?? "",
      icon: task.down.icon,
      bundleId: task.down.bundleId ?? "",
      path,
      size: getFileSize(path),
      fileName: `${id}.ipa`,
      status: task.status,
      zipPath,
      accountEmail: task.down.accountEmail,
    }
    return existingAppFiles[id] ? { ...base, ...existingAppFiles[id] } : base
  })

  for (const [id, app] of Object.entries(existingAppFiles)) {
    if (!downloadIds.has(id)) {
      merged.push({
        id,
        appId: "",
        appKey: id,
        source: "file",
        ...app,
        status: "completed",
      })
    }
  }

  return merged
}

export const useDownloadItems = () => {
  const { downTask: tasks } = useDownloadCount()
  const items = useObservable<MergedItem[]>(buildItems(tasks, {}))
  const [isEmpty, setIsEmpty] = useState(!items.value.length)
  const fingerprint = useRef(itemFingerprint(items.value))

  const setItems = (next: MergedItem[]) => {
    const nextFingerprint = itemFingerprint(next)
    if (fingerprint.current === nextFingerprint) return
    fingerprint.current = nextFingerprint
    withAnimation(() => {
      items.setValue(next)
      setIsEmpty(!next.length)
    })
  }

  const syncItems = async (appFiles = localOnlyAppFiles(items.value)) => {
    setItems(buildItems(tasks, {
      ...appFiles,
      ...await completedTaskAppFiles(tasks),
    }))
  }

  const syncTaskItems = () => {
    setItems(buildItems(tasks, localOnlyAppFiles(items.value)))
  }

  const rescanAppsFiles = async () => {
    await syncItems(await scanAppsFiles())
  }

  const removeDerivedAppFiles = (ids: string[]) => {
    const removedIds = new Set(ids)
    setItems(items.value.filter(item => !removedIds.has(item.appKey)))
  }

  useEffect(() => {
    onAppsFilesChanged(rescanAppsFiles)
    rescanAppsFiles()
  }, [])

  useEffect(() => {
    syncTaskItems()
  }, [tasksFingerprint(tasks)])

  return { items, isEmpty, rescanAppsFiles, removeDerivedAppFiles }
}
