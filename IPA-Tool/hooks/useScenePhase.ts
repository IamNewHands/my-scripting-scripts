/**
 * 场景阶段处理 Hook
 * 用于监听应用场景阶段变化，并根据 URL 参数切换标签页
 */

import { useEffect, Script } from "scripting"
import { useStartAppDownload } from "./useStartAppDownload"
import { switchTab } from "./useTabs"
import { importFiles } from "../utils/importFiles"
import { onDownloadShowToast } from "../pages/Download/store/toast"

type ScenePhaseType = "fileURLs" | "urls" | undefined

interface Pages {
  id: string
  name: string
  internalVersion: string
}

const handleFileURLs = async () => {
  const { fileURLs } = Script.queryParameters
  const ipaPaths: string[] = JSON.parse(fileURLs ?? "[]")
  await importFiles(ipaPaths)
  setTimeout(() => {
    switchTab(1)
  }, 300)
}

const handleURLs = (
  startAppDownload?: ReturnType<typeof useStartAppDownload>["startAppDownload"],
  pages?: Pages
) => {
  if (pages) startAppDownload?.(pages, {
    onBeforeDownload: () => setTimeout(() => {
       onDownloadShowToast.run("loading", "正在准备下载...")
    }, 100),
    onSuccess: () => onDownloadShowToast.run("success", "已加入下载任务"),
    onError: (err) => onDownloadShowToast.run("error", err.toString())
  })
  switchTab(1)
}

export const useScenePhase = () => {
  const { urls } = Script.queryParameters
  const pages = JSON.parse(urls ?? "{}")
  const { startAppDownload } = useStartAppDownload()
  useEffect(() => {
    const scenePhase = Object.keys(Script.queryParameters)[0] as ScenePhaseType

    switch (scenePhase) {
      case "fileURLs":
        handleFileURLs()
        return
      case "urls":
        handleURLs(startAppDownload, pages)
        return
    }
  }, [])
}
