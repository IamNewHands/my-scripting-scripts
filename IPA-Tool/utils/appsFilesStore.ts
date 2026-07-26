import { Path } from "scripting"
import { AppConfig } from "../constants/AppConfig"
import { getAllAppsByIds, putMeta, remove as removeApp } from "../modules/AppDB"
import { EventBus } from "../modules/EventBus"
import { extractAndParsePlist } from "./extractPlist"

export interface AppFileInfo {
  name: string
  path: string
  displayVersion: string
  size: number
  icon: string | null | undefined
  bundleId: string
  fileName: string
  accountEmail?: string
}

export type AppsFilesState = Record<string, AppFileInfo>

const appsFilesBus = new EventBus()
const APPS_FILES_CHANGED = "appsFilesChanged"

export const onAppsFilesChanged = (cb: () => void) => {
  appsFilesBus.on(APPS_FILES_CHANGED, cb)
}

export const notifyAppsFilesChanged = () => {
  appsFilesBus.emit(APPS_FILES_CHANGED)
}

interface ITunesMetadata {
  bundleDisplayName: string
  bundleShortVersionString: string
  softwareIcon57x57URL: string
  softwareVersionBundleId: string
  appleId?: string
  [key: string]: any
}

interface InfoPlist {
  CFBundleName: string
  CFBundleIdentifier: string
  CFBundleVersion: string
  icon: undefined
  [key: string]: any
}

type AppMeta = { name: string; displayVersion: string; bundleId: string; icon: string | null | undefined; accountEmail?: string }

const parseITunesMetadata = (archive: Archive) =>
  new Promise<AppMeta | null>(resolve => {
    extractAndParsePlist<ITunesMetadata>(archive, "iTunesMetadata.plist", data => {
      resolve({
        name: data.bundleDisplayName,
        displayVersion: data.bundleShortVersionString,
        icon: data.softwareIcon57x57URL,
        bundleId: data.softwareVersionBundleId,
        accountEmail: data.appleId,
      })
    }).catch(() => resolve(null))
  })

const parseInfoPlist = (archive: Archive) =>
  new Promise<AppMeta | null>(resolve => {
    const infoPlistPath = archive.getEntryPaths().find(p => p.endsWith("app/Info.plist"))
    if (!infoPlistPath) return resolve(null)
    extractAndParsePlist<InfoPlist>(archive, infoPlistPath, data => {
      resolve({
        name: data.CFBundleName,
        displayVersion: data.CFBundleVersion,
        icon: data.icon,
        bundleId: data.CFBundleIdentifier,
      })
    }).catch(() => resolve(null))
  })

export const scanAppsFiles = async () => {
  const dir = Path.join(FileManager.documentsDirectory, AppConfig.file.folder)
  const state: AppsFilesState = {}

  if (!FileManager.existsSync(dir)) return state

  const fileInfos = FileManager.readDirectorySync(dir)
    .filter(f => f.endsWith(".ipa"))
    .map(fileName => {
      const id = fileName.replace(/\.ipa$/, "")
      return { fileName, id, path: Path.join(dir, fileName) }
    })

  if (fileInfos.length === 0) return state

  // 一次 SQL 批量查完所有已缓存的元数据
  const ids = fileInfos.map(f => f.id)
  let appsMap: Awaited<ReturnType<typeof getAllAppsByIds>> | null = await getAllAppsByIds(ids)

  try {
    for (const { fileName, id, path } of fileInfos) {
      const { size } = FileManager.statSync(path)
      const app = appsMap[id]

      if (app) {
        state[id] = {
          name: app.name,
          path,
          displayVersion: app.version,
          size,
          icon: app.icon,
          bundleId: app.bundle_id ?? "",
          fileName,
        }
        continue
      }

      const archive = Archive.openForMode(path, "read")
      const meta = archive.contains("iTunesMetadata.plist")
        ? await parseITunesMetadata(archive)
        : await parseInfoPlist(archive)

      if (meta) {
        const { name, displayVersion, bundleId, icon, accountEmail } = meta
        state[bundleId + displayVersion] = { name, path, displayVersion, size, icon, bundleId, fileName, accountEmail }
        putMeta(id, name, displayVersion, bundleId, icon ?? undefined)
      }
    }

    return state
  } finally {
    appsMap = null
  }
}

const removeFileIfExists = async (path?: string) => {
  if (path && FileManager.existsSync(path)) await FileManager.remove(path)
}

const siblingPackagePath = (path?: string) =>
  path?.endsWith(".ipa") ? path.replace(/\.ipa$/, ".zip") : path?.replace(/\.zip$/, ".ipa")

const removeFileLater = (id: string, path?: string) => {
  removeFileIfExists(path).catch(e => {
    console.log("downloadFailed", `删除 ${id} 文件失败：${String(e)} ❌`)
  })
}

/** 删除本地安装包文件和 AppDB SQL 元数据。ipa / zip 都按实际存在清理。 */
export const removeAppFile = async (id: string, path?: string, zipPath?: string) => {
  const siblingPath = siblingPackagePath(path)
  const targets = [
    { label: "path", path },
    { label: "zipPath", path: zipPath },
    { label: "siblingPath", path: siblingPath },
  ]
    .filter((target): target is { label: string; path: string } => Boolean(target.path))
    .filter((target, index, arr) => arr.findIndex(item => item.path === target.path) === index)

  targets.forEach(target => removeFileLater(id, target.path))
  removeApp(id).catch(e => {
    console.log("downloadFailed", `删除 ${id} SQL 元数据失败：${String(e)} ❌`)
  })
}
