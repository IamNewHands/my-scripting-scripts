import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  ProgressView,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  Tab,
  TabView,
  useEffect,
  useObservable,
  useRef,
  useState,
} from "scripting"
import {
  getLogDirectory,
  isDebugModeEnabled,
  logEvent,
  readLatestLog,
  setDebugModeEnabled,
} from "./services/logs"
import {
  cancelDownload,
  cleanupTempOrphans,
  detectMediaPlatform,
  downloadMedia,
  extractFirstURL,
  getToolStatus,
  installYtDlp,
  mediaPlatformLabel,
  probeMedia,
  saveResult,
  type ConcurrentDownloads,
  type DownloadResult,
  type MediaChoice,
  type MediaProbe,
  type SaveMode,
  type ToolStatus,
} from "./services/media"
import {
  addHistoryRecord,
  clearHistoryRecordsAndFiles,
  deleteHistoryRecord,
  getHistoryStorageSummary,
  isHistoryFileAvailable,
  listHistoryRecords,
  pruneHistoryStorage,
  removeHistoryManagedFile,
  type DownloadHistoryRecord,
  type HistoryStorageSummary,
} from "./services/history"
import {
  getPreferences,
  setPreferences,
  type YoinksPreferences,
} from "./services/preferences"
import {
  authPlatformLabel,
  beginPlatformLogin,
  clearPlatformLogin,
  createTaskCookieFile,
  disposePlatformSession,
  isAuthPlatform,
  isFreshCookieError,
  removeTaskCookieFile,
  restorePersistentPlatformSession,
  supportedAuthPlatforms,
  type AuthPlatform,
  type PlatformAuthSession,
} from "./services/platform-auth"
import { AboutPage } from "./pages/AboutPage"
import { LogPage } from "./pages/LogPage"
import { formatBytes, formatProgressDetail } from "./utils/format"
import { openWithOtherApps, presentNativePlayer } from "./pages/NativePlayerPage"

const HISTORY_TAB = 0
const DOWNLOAD_TAB = 1
const SETTINGS_TAB = 2
type YoinksTab = typeof HISTORY_TAB | typeof DOWNLOAD_TAB | typeof SETTINGS_TAB

const CONCURRENCY_LABELS: Record<ConcurrentDownloads, string> = {
  1: "单线程",
  2: "2 线程（推荐）",
  4: "4 线程",
  8: "8 线程",
}
const SAVE_LABELS: Record<SaveMode, string> = {
  ask: "下载后询问",
  photos: "自动保存到相册",
  files: "自动导出到文件",
}

function formatHistoryDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false })
}

function toolLabel(status: ToolStatus | null) {
  if (!status) return "正在检查"
  return status.ytDlpVersion ? `yt-dlp ${status.ytDlpVersion}` : "yt-dlp 未安装"
}

function statusIcon(installed: boolean) {
  return installed ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"
}

function isHTTPURL(source: string): boolean {
  try {
    const url = new URL(source)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function mediaSourceURL(source: string): string {
  return isHTTPURL(source) ? source : `file://${encodeURI(source)}`
}

function safeJavaScriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

function playerHTML(source: string, useRelativeLocalURL = false): string {
  const mediaURL = safeJavaScriptString(
    useRelativeLocalURL
      ? encodeURI(source.slice(source.lastIndexOf("/") + 1))
      : mediaSourceURL(source),
  )
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
  html, body { width: 100%; height: 100%; margin: 0; background: #000; overflow: hidden; }
  video { width: 100%; height: 100%; object-fit: contain; background: #000; }
</style>
</head>
<body>
<video id="player" controls autoplay playsinline></video>
<script>
  const player = document.getElementById("player")
  player.src = ${mediaURL}
  const report = (event) => {
    window.webkit.messageHandlers.mediaEvent.postMessage({
      event,
      currentTime: player.currentTime,
      duration: player.duration,
      error: player.error ? player.error.message : null,
    })
  }
  player.addEventListener("loadedmetadata", () => report("loadedmetadata"))
  player.addEventListener("playing", () => report("playing"))
  player.addEventListener("error", () => report("error"))
  player.play().catch(() => report("play.failed"))
</script>
</body>
</html>`
}

async function presentHTML5Player(source: string, title: string): Promise<void> {
  const webView = new WebViewController({ ephemeral: true })
  const isRemote = isHTTPURL(source)
  if (!isRemote && !source.startsWith("/")) throw new Error("本地视频路径无效")
  const localDirectory = source.slice(0, source.lastIndexOf("/"))
  const localPagePath = `${source}.yoinks-player.html`
  try {
    await webView.addScriptMessageHandler("mediaEvent", (details: Record<string, unknown> = {}) => {
      void logEvent({ level: details.event === "error" ? "error" : "info", event: "html5-player.event", details: { ...details, title } })
      return true
    })
    const loaded = isRemote
      ? await webView.loadHTML(playerHTML(source), source)
      : await (async () => {
          await FileManager.writeAsString(localPagePath, playerHTML(source, true))
          return webView.loadFile(localPagePath, localDirectory)
        })()
    if (!loaded) throw new Error("无法加载视频页面")
    await logEvent({ level: "info", event: "html5-player.opened", details: { title, isRemote } })
    await webView.present({ fullscreen: true, navigationTitle: "播放" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logEvent({ level: "error", event: "html5-player.failed", details: { title, message } })
    await Dialog.alert({ title: "播放失败", message })
  } finally {
    webView.dispose()
    if (!isRemote && await FileManager.exists(localPagePath)) await FileManager.remove(localPagePath)
  }
}

function View() {
  const dismiss = Navigation.useDismiss()
  const activeTab = useObservable<YoinksTab>(DOWNLOAD_TAB)
  const [preferences, setPreferencesState] = useState<YoinksPreferences>(() => getPreferences())
  const [url, setURL] = useState(() => extractFirstURL(typeof Script.queryParameters.url === "string" ? Script.queryParameters.url : "") || "")
  const [urlInput, setURLInput] = useState(() => extractFirstURL(typeof Script.queryParameters.url === "string" ? Script.queryParameters.url : "") || "")
  const [probe, setProbe] = useState<MediaProbe | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<MediaChoice | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saveMode, setSaveMode] = useState<SaveMode>(() => getPreferences().defaultSaveMode)
  const [concurrentFragments, setConcurrentFragments] = useState<ConcurrentDownloads>(() => getPreferences().concurrentFragments)
  const [tools, setTools] = useState<ToolStatus | null>(null)
  const [loadingTools, setLoadingTools] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [cancelPath, setCancelPath] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ fraction: number; stage: string; downloadedBytes?: number; totalBytes?: number; speed?: number; eta?: number }>({ fraction: 0, stage: "准备就绪" })
  const [status, setStatus] = useState("粘贴一个公开媒体链接，然后选择输出格式。")
  const [result, setResult] = useState<DownloadResult | null>(null)
  const [completedSaveMode, setCompletedSaveMode] = useState<SaveMode | null>(null)
  const [latestLog, setLatestLog] = useState("")
  const [history, setHistory] = useState<DownloadHistoryRecord[]>([])
  const [historyAvailability, setHistoryAvailability] = useState<Record<string, boolean>>({})
  const [historySummary, setHistorySummary] = useState<HistoryStorageSummary>({ totalRecords: 0, availableCount: 0, managedBytes: 0 })
  const [debugMode, setDebugModeState] = useState(() => isDebugModeEnabled())
  const [platformSessions, setPlatformSessions] = useState<Partial<Record<AuthPlatform, PlatformAuthSession>>>({})
  const loggedInSessions = Object.values(platformSessions).filter((session): session is PlatformAuthSession => session != null)
  const platformSessionsRef = useRef<Partial<Record<AuthPlatform, PlatformAuthSession>>>({})

  const updateSaveMode = (next: SaveMode) => {
    const nextPreferences = setPreferences({ ...preferences, defaultSaveMode: next })
    setPreferencesState(nextPreferences)
    setSaveMode(nextPreferences.defaultSaveMode)
  }

  const selectMediaChoice = (nextChoice: MediaChoice | null) => {
    setSelectedChoice(nextChoice)
    if (nextChoice?.kind === "audio" && saveMode === "photos") updateSaveMode("files")
  }

  const refreshHistory = async () => {
    const [records, summary] = await Promise.all([listHistoryRecords(), getHistoryStorageSummary()])
    const availability = await Promise.all(records.map(async (record) => [record.id, await isHistoryFileAvailable(record)] as const))
    setHistory(records)
    setHistoryAvailability(Object.fromEntries(availability))
    setHistorySummary(summary)
  }

  const updatePreferences = (next: YoinksPreferences) => {
    const saved = setPreferences(next)
    setPreferencesState(saved)
    setSaveMode(saved.defaultSaveMode)
    setConcurrentFragments(saved.concurrentFragments)
    return saved
  }

  const recordCompletedDownload = async (downloaded: DownloadResult, mode: SaveMode, title: string): Promise<boolean> => {
    const record: DownloadHistoryRecord = {
      id: downloaded.taskId,
      createdAt: new Date().toISOString(),
      taskId: downloaded.taskId,
      title,
      sourceURL: downloaded.sourceURL,
      filePath: downloaded.filePath,
      fileName: downloaded.fileName,
      fileSizeBytes: downloaded.fileSizeBytes,
      mediaKind: downloaded.choice.kind,
      formatLabel: downloaded.choice.label,
      saveMode: mode,
    }
    try {
      await addHistoryRecord(record)
      if (preferences.retainOriginalFiles) {
        const pruned = await pruneHistoryStorage(preferences)
        if (pruned.failedPaths.length) {
          await logEvent({ level: "warn", event: "history.prune.partial", taskId: downloaded.taskId, details: { failedPaths: pruned.failedPaths, managedBytes: pruned.managedBytes, totalRecords: pruned.totalRecords } })
        }
      } else {
        await removeHistoryManagedFile(record)
      }
      await refreshHistory()
      return await isHistoryFileAvailable(record)
    } catch (error) {
      await logEvent({ level: "warn", event: "history.write.failed", taskId: downloaded.taskId, details: { message: error instanceof Error ? error.message : String(error), filePath: downloaded.filePath } })
      setStatus("下载已完成，但未能写入下载记录。")
      return await FileManager.exists(downloaded.filePath)
    }
  }

  const changeDebugMode = (enabled: boolean) => {
    void (async () => {
      await setDebugModeEnabled(enabled)
      setDebugModeState(enabled)
      if (enabled) await logEvent({ level: "info", event: "debug-mode.enabled" })
    })()
  }

  const updatePlatformSessions = (updater: (current: Partial<Record<AuthPlatform, PlatformAuthSession>>) => Partial<Record<AuthPlatform, PlatformAuthSession>>) => {
    setPlatformSessions((current) => {
      const next = updater(current)
      platformSessionsRef.current = next
      return next
    })
  }

  const refreshTools = async () => {
    setLoadingTools(true)
    try {
      const current = await getToolStatus()
      setTools(current)
      setStatus(current.ytDlpVersion ? "下载引擎已就绪。" : "需要安装 yt-dlp 才能下载。")
    } catch (error) {
      setStatus(`工具检测失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoadingTools(false)
    }
  }

  const refreshLoggedInSessions = async () => {
    await Promise.all(supportedAuthPlatforms().map((platform) => sessionForPlatform(platform)))
  }

  useEffect(() => {
    void cleanupTempOrphans()
    void refreshTools()
    void refreshHistory()
    void refreshLoggedInSessions()
    return () => {
      for (const session of Object.values(platformSessionsRef.current)) {
        if (session?.retention === "temporary") disposePlatformSession(session)
      }
    }
  }, [])

  // 输入链接后短防抖自动分析（与手动「分析链接」共用逻辑）
  useEffect(() => {
    const candidate = extractFirstURL(urlInput)
    if (!candidate || candidate === url || analyzing || downloading || !tools?.ytDlpVersion) return
    const timer = setTimeout(() => {
      void applySourceURL(candidate, "input")
    }, 900)
    return () => clearTimeout(timer)
  }, [urlInput, tools?.ytDlpVersion])

  const disposeTemporarySession = (platform?: AuthPlatform) => {
    updatePlatformSessions((current) => {
      const next = { ...current }
      for (const candidate of Object.keys(next) as AuthPlatform[]) {
        if (platform && candidate !== platform) continue
        const session = next[candidate]
        if (session?.retention === "temporary") {
          disposePlatformSession(session)
          delete next[candidate]
        }
      }
      return next
    })
  }

  const sessionForPlatform = async (platform: AuthPlatform): Promise<PlatformAuthSession | null> => {
    const current = platformSessionsRef.current[platform]
    if (current) return current
    const restored = await restorePersistentPlatformSession(platform)
    if (restored) updatePlatformSessions((sessions) => ({ ...sessions, [platform]: restored }))
    return restored
  }

  const loginForPlatform = async (platform: AuthPlatform): Promise<PlatformAuthSession | null> => {
    const choice = await Dialog.actionSheet({
      title: `${authPlatformLabel(platform)}需要登录状态`,
      message: "平台要求近期 Cookie 才能继续。仅本次使用会在关闭 Yoinks、替换链接或下载结束后清除；保留登录状态可用于该平台之后的下载。",
      actions: [{ label: "仅本次使用" }, { label: "保留登录状态" }],
      cancelButton: true,
    })
    if (choice == null) return null
    const retention = choice === 0 ? "temporary" : "persistent"
    setStatus(`请在${authPlatformLabel(platform)}页面完成登录，完成后关闭页面。`)
    const session = await beginPlatformLogin(platform, retention)
    updatePlatformSessions((current) => ({ ...current, [platform]: session }))
    await logEvent({ level: "info", event: "platform-auth.login.completed", details: { platform, retention } })
    return session
  }

  const probeWithPlatformSession = async (sourceURL: string, session: PlatformAuthSession | null, insecureTLS = false): Promise<MediaProbe> => {
    let cookieFile: string | null = null
    try {
      if (session) cookieFile = await createTaskCookieFile(session)
      return await probeMedia(sourceURL, { cookieFile: cookieFile || undefined, authorizedPlatform: session?.platform, insecureTLS })
    } finally {
      await removeTaskCookieFile(cookieFile)
    }
  }

  const downloadWithPlatformSession = async (sourceURL: string, platform: AuthPlatform | null, insecureTLS: boolean, session: PlatformAuthSession | null): Promise<DownloadResult> => {
    let cookieFile: string | null = null
    try {
      if (session) cookieFile = await createTaskCookieFile(session)
      return await downloadMedia({
        url: sourceURL,
        choice: selectedChoice!,
        concurrentFragments,
        insecureTLS,
        cookieFile: cookieFile || undefined,
        authorizedPlatform: platform || undefined,
        onProgress: (value) => {
          setProgress(value)
          setStatus(value.stage)
        },
        onCancelPath: setCancelPath,
      })
    } finally {
      await removeTaskCookieFile(cookieFile)
    }
  }

  const clearPlatformAuth = async () => {
    const sessions = loggedInSessions
    if (!sessions.length) return
    let session = sessions[0]
    if (sessions.length > 1) {
      const choice = await Dialog.actionSheet({
        title: "选择要清除的登录状态",
        actions: sessions.map((item) => ({ label: item.accountLabel, role: "destructive" as const })),
        cancelButton: true,
      })
      if (choice == null) return
      session = sessions[choice]
    }
    const confirmed = await Dialog.confirm({
      title: "清除登录状态",
      message: `将清除 ${session.accountLabel} 的 Yoinks 登录状态。`,
      confirmLabel: "清除",
      cancelLabel: "取消",
    })
    if (!confirmed) return
    const removed = await clearPlatformLogin(session.platform)
    disposePlatformSession(platformSessionsRef.current[session.platform])
    updatePlatformSessions((current) => {
      const next = { ...current }
      delete next[session.platform]
      return next
    })
    await logEvent({ level: "info", event: "platform-auth.cleared", details: { platform: session.platform, cookieCount: removed } })
    setStatus("登录状态已清除。")
  }


  const showLogs = async () => {
    await Navigation.present({ element: <LogPage /> })
  }

  const copyLogs = async () => {
    const text = latestLog || await readLatestLog()
    await Pasteboard.setString(text)
    setStatus("最近日志已复制到剪贴板。")
  }

  const openLogFolder = async () => {
    await QuickLook.previewURLs([getLogDirectory()], true)
  }

  const applySourceURL = async (raw: string, source: "paste" | "input" | "history") => {
    const next = extractFirstURL(raw)
    if (!next) {
      setStatus("请输入有效的公开 http 或 https 链接。")
      return
    }
    await logEvent({ level: "info", event: source === "paste" ? "paste.accepted" : source === "history" ? "history.redownload" : "manual-url.accepted", details: { sourceURL: next, platform: detectMediaPlatform(next) } })
    disposeTemporarySession()
    setURL(next)
    setURLInput(next)
    setProbe(null)
    setSelectedChoice(null)
    setResult(null)
    setStatus(source === "paste" ? "链接已粘贴，正在自动分析。" : "媒体链接已设置，正在自动分析。")
    await analyzeMedia(next)
  }

  const pasteURL = async () => {
    await logEvent({ level: "info", event: "paste.requested" })
    try {
      if (!(await Pasteboard.hasStrings)) {
        await logEvent({ level: "warn", event: "paste.empty" })
        setStatus("剪贴板中没有文本链接。")
        return
      }
      const raw = await Pasteboard.getString()
      const next = extractFirstURL(raw)
      if (!next) {
        await logEvent({ level: "warn", event: "paste.invalid" })
        setStatus("剪贴板中没有有效的公开 http 或 https 链接。")
        return
      }
      setURLInput(next)
      await applySourceURL(next, "paste")
    } catch (error) {
      await logEvent({ level: "error", event: "paste.failed", details: { message: error instanceof Error ? error.message : String(error) } })
      setStatus("无法读取剪贴板。请在 设置 > Scripting > Paste from Other Apps 中允许访问。")
    }
  }

  const submitURLInput = async () => {
    if (analyzing || downloading) return
    await applySourceURL(urlInput, "input")
  }

  const analyzeMedia = async (source?: string) => {
    if (analyzing || downloading) return
    const validURL = extractFirstURL(source || url)
    if (!validURL) {
      setStatus("请先粘贴或输入有效的公开链接。")
      return
    }
    let availableTools = tools
    if (!availableTools?.ytDlpVersion) {
      setStatus("正在检查下载引擎。")
      try {
        availableTools = await getToolStatus()
        setTools(availableTools)
      } catch (error) {
        setStatus(`工具检测失败：${error instanceof Error ? error.message : String(error)}`)
        return
      }
    }
    if (!availableTools.ytDlpVersion) {
      setStatus("请先安装 yt-dlp。")
      return
    }
    setAnalyzing(true)
    setProbe(null)
    setSelectedChoice(null)
    setStatus("正在分析媒体和可用格式。")
    try {
      const platform = detectMediaPlatform(validURL)
      const session = isAuthPlatform(platform) ? await sessionForPlatform(platform) : null
      const nextProbe = await probeWithPlatformSession(validURL, session, true)
      setProbe(nextProbe)
      selectMediaChoice(nextProbe.choices[0] || null)
      setStatus(`已找到 ${nextProbe.choices.length} 个可下载格式。`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const platform = detectMediaPlatform(validURL)
      if (isAuthPlatform(platform) && isFreshCookieError(message)) {
        try {
          const session = await loginForPlatform(platform)
          if (session) {
            setStatus(`正在使用${authPlatformLabel(platform)}登录状态重新分析。`)
            const nextProbe = await probeWithPlatformSession(validURL, session, true)
            setProbe(nextProbe)
            selectMediaChoice(nextProbe.choices[0] || null)
            setStatus(`已找到 ${nextProbe.choices.length} 个可下载格式。`)
            return
          }
        } catch (loginError) {
          const loginMessage = loginError instanceof Error ? loginError.message : String(loginError)
          await logEvent({ level: "error", event: "platform-auth.login.failed", details: { platform, message: loginMessage } })
          setStatus(loginMessage)
          await Dialog.alert({ title: `${authPlatformLabel(platform)}登录未完成`, message: loginMessage })
          return
        }
      }
      await logEvent({ level: "error", event: "probe.failed", details: { sourceURL: validURL, message, tlsInsecure: true } })
      setStatus(message)
      setLatestLog(await readLatestLog())
      await Dialog.alert({ title: "媒体分析失败", message: `${message}\n\n诊断日志已写入：${getLogDirectory()}` })
    } finally {
      setAnalyzing(false)
    }
  }

  const chooseFormat = async () => {
    if (!probe?.choices.length) {
      setStatus("请先分析链接。")
      return
    }
    const choice = await Dialog.actionSheet({
      title: "可直接下载格式",
      message: probe.title,
      actions: probe.choices.map((item) => ({ label: item.label })),
      cancelButton: true,
    })
    if (choice != null) {
      const nextChoice = probe.choices[choice]
      selectMediaChoice(nextChoice)
    }
  }

  const chooseSaveMode = async () => {
    const values: SaveMode[] = selectedChoice?.kind === "audio" ? ["ask", "files"] : ["ask", "photos", "files"]
    const choice = await Dialog.actionSheet({
      title: "下载完成后",
      actions: values.map((value) => ({ label: SAVE_LABELS[value] })),
      cancelButton: true,
    })
    if (choice != null) updateSaveMode(values[choice])
  }

  const chooseConcurrency = async () => {
    const values: ConcurrentDownloads[] = [1, 2, 4, 8]
    const choice = await Dialog.actionSheet({
      title: "下载并发",
      message: "仅对支持分片的来源生效；单文件格式会保持单连接。",
      actions: values.map((value) => ({ label: CONCURRENCY_LABELS[value] })),
      cancelButton: true,
    })
    if (choice != null) {
      const next = values[choice]
      updatePreferences({ ...preferences, concurrentFragments: next })
    }
  }

  const install = async () => {
    const name = "yt-dlp"
    const upgrading = Boolean(tools?.ytDlpVersion)
    const detail = upgrading
      ? "将执行 python3 -m pip install --upgrade yt-dlp，以获取最新网站支持。"
      : "将执行 python3 -m pip install --upgrade yt-dlp。"
    const confirmed = await Dialog.confirm({ title: upgrading ? `升级 ${name}` : `安装 ${name}`, message: detail, confirmLabel: upgrading ? "升级" : "安装", cancelLabel: "取消" })
    if (!confirmed) return
    setInstalling(true)
    setStatus(upgrading ? `正在升级 ${name}...` : `正在安装 ${name}...`)
    try {
      const version = await installYtDlp()
      setStatus(`${name} ${version} 已就绪。`)
      await refreshTools()
    } catch (error) {
      setStatus((upgrading ? "升级失败：" : "安装失败：") + (error instanceof Error ? error.message : String(error)))
    } finally {
      setInstalling(false)
    }
  }

  const previewSelectedChoice = async () => {
    if (!selectedChoice?.previewURL || !probe) {
      setStatus("当前格式没有可用的预览链接。请重新分析后再试。")
      return
    }
    await presentHTML5Player(selectedChoice.previewURL, probe.title)
  }

  const completeDownload = async (downloaded: DownloadResult, title: string) => {
    const effectiveSaveMode: SaveMode = downloaded.choice.kind === "audio" && saveMode === "photos" ? "files" : saveMode
    if (effectiveSaveMode !== saveMode) updateSaveMode(effectiveSaveMode)
    const saveStatus = await saveResult(downloaded.filePath, downloaded.fileName, effectiveSaveMode, downloaded.taskId)
    setResult(downloaded)
    setStatus(saveStatus)
    if (effectiveSaveMode !== "ask") setCompletedSaveMode(effectiveSaveMode)
    const sourceFileAvailable = await recordCompletedDownload(downloaded, effectiveSaveMode, title)
    if (!sourceFileAvailable) {
      setResult(null)
      setCompletedSaveMode(null)
    }
  }

  const startDownload = async () => {
    if (!tools?.ytDlpVersion) {
      setStatus("请先安装 yt-dlp。")
      return
    }
    const validURL = extractFirstURL(url)
    if (!validURL) {
      setStatus("请先粘贴或输入有效的公开链接。")
      return
    }
    if (!selectedChoice) {
      setStatus("请先分析链接并选择实际可用格式。")
      return
    }
    setDownloading(true)
    setCancelPath(null)
    setResult(null)
    setCompletedSaveMode(null)
    setProgress({ fraction: 0.02, stage: "正在解析媒体" })
    setStatus("yt-dlp 正在准备下载。")
    try {
      const platform = detectMediaPlatform(validURL)
      const session = isAuthPlatform(platform) ? await sessionForPlatform(platform) : null
      const downloaded = await downloadWithPlatformSession(validURL, isAuthPlatform(platform) ? platform : null, true, session)
      await completeDownload(downloaded, probe?.title || downloaded.fileName)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const logs = await readLatestLog()
      setLatestLog(logs)
      setStatus(message)
      const platform = detectMediaPlatform(validURL)
      if (isAuthPlatform(platform) && isFreshCookieError(message)) {
        try {
          const session = await loginForPlatform(platform)
          if (session) {
            setStatus(`正在使用${authPlatformLabel(platform)}登录状态重新下载。`)
            const downloaded = await downloadWithPlatformSession(validURL, platform, true, session)
            await completeDownload(downloaded, probe?.title || downloaded.fileName)
            return
          }
        } catch (loginError) {
          const loginMessage = loginError instanceof Error ? loginError.message : String(loginError)
          await logEvent({ level: "error", event: "platform-auth.download-login.failed", details: { platform, message: loginMessage } })
          setStatus(loginMessage)
          await Dialog.alert({ title: `${authPlatformLabel(platform)}登录未完成`, message: loginMessage })
          return
        }
      }
      if (message !== "下载已取消") await Dialog.alert({ title: "下载失败", message: `${message}

任务日志已写入：${getLogDirectory()}` })
    } finally {
      const platform = detectMediaPlatform(validURL)
      if (isAuthPlatform(platform)) disposeTemporarySession(platform)
      setDownloading(false)
      setCancelPath(null)
    }
  }

  const stopDownload = async () => {
    if (!cancelPath) return
    const confirmed = await Dialog.confirm({
      title: "取消下载",
      message: "当前下载将停止，未完成的临时文件会被清理。",
      confirmLabel: "取消下载",
      cancelLabel: "继续下载",
    })
    if (!confirmed) return
    await cancelDownload(cancelPath)
    setStatus("正在取消下载。")
  }

  const openHistoryActions = async (record: DownloadHistoryRecord) => {
    const available = await isHistoryFileAvailable(record)
    const canSaveToPhotos = record.mediaKind === "video"
    const actions = [
      ...(available ? [{ label: "播放" }, { label: "用其他 App 打开" }, { label: "分享" }] : []),
      ...(available && canSaveToPhotos ? [{ label: "保存到相册" }] : []),
      ...(available ? [{ label: "导出到文件" }] : []),
      { label: "重新下载" },
      { label: "打开来源链接" },
      { label: "复制来源链接" },
      { label: available ? "删除记录和本地文件" : "删除记录", role: "destructive" as const },
    ]
    const choice = await Dialog.actionSheet({ title: record.title, message: `${record.formatLabel} · ${formatHistoryDate(record.createdAt)}`, actions, cancelButton: true })
    if (choice == null) return
    const action = actions[choice].label
    try {
      if (action === "播放") await presentNativePlayer(record.filePath, record.title)
      if (action === "用其他 App 打开") await openWithOtherApps(record.filePath)
      if (action === "分享") await ShareSheet.present([record.filePath])
      if (action === "保存到相册") await saveResult(record.filePath, record.fileName, "photos", record.taskId)
      if (action === "导出到文件") await saveResult(record.filePath, record.fileName, "files", record.taskId)
      if (action === "重新下载") {
        setURL(record.sourceURL)
        setURLInput(record.sourceURL)
        setProbe(null)
        setSelectedChoice(null)
        setResult(null)
        activeTab.setValue(DOWNLOAD_TAB)
        await analyzeMedia(record.sourceURL)
      }
      if (action === "打开来源链接") await Safari.present(record.sourceURL, true)
      if (action === "复制来源链接") {
        await Pasteboard.setString(record.sourceURL)
        setStatus("来源链接已复制。")
      }
      if (action === "删除记录和本地文件" || action === "删除记录") {
        const confirmed = await Dialog.confirm({ title: "删除下载记录", message: action === "删除记录和本地文件" ? "将删除此记录及 Yoinks 保存的原文件。" : "将删除此记录。", confirmLabel: "删除", cancelLabel: "取消" })
        if (!confirmed) return
        await deleteHistoryRecord(record, action === "删除记录和本地文件")
        await refreshHistory()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await logEvent({ level: "warn", event: "history.action.failed", taskId: record.taskId, details: { action, message, filePath: record.filePath } })
      await Dialog.alert({ title: "操作失败", message })
    }
  }

  const clearHistory = async () => {
    const confirmed = await Dialog.confirm({ title: "清空下载记录", message: "将删除所有下载记录和 Yoinks 保存的原文件，不会删除相册或文件 App 中的副本。", confirmLabel: "清空", cancelLabel: "取消" })
    if (!confirmed) return
    const result = await clearHistoryRecordsAndFiles()
    await refreshHistory()
    setStatus(`已清理 ${result.deletedRecords} 条记录和 ${result.deletedFiles} 个原文件。`)
    if (result.failedPaths.length) await logEvent({ level: "warn", event: "history.clear.partial", details: { failedPaths: result.failedPaths } })
  }

  const chooseManagedBytes = async () => {
    const values: Array<number | null> = [512 * 1024 * 1024, 1024 * 1024 * 1024, 2 * 1024 * 1024 * 1024, 5 * 1024 * 1024 * 1024, null]
    const choice = await Dialog.actionSheet({ title: "本地文件上限", actions: values.map((value) => ({ label: value == null ? "不限" : formatBytes(value) })), cancelButton: true })
    if (choice == null) return
    const next = updatePreferences({ ...preferences, maxManagedBytes: values[choice] })
    const result = await pruneHistoryStorage(next)
    await refreshHistory()
    if (result.failedPaths.length) setStatus("部分旧文件无法清理，请在记录页处理。")
  }

  const chooseHistoryLimit = async () => {
    const values: Array<number | null> = [25, 50, 100, 200, null]
    const choice = await Dialog.actionSheet({ title: "下载记录上限", actions: values.map((value) => ({ label: value == null ? "不限" : `${value} 条` })), cancelButton: true })
    if (choice == null) return
    const next = updatePreferences({ ...preferences, maxHistoryRecords: values[choice] })
    const result = await pruneHistoryStorage(next)
    await refreshHistory()
    if (result.failedPaths.length) setStatus("部分旧文件无法清理，请在记录页处理。")
  }

  const changeRetention = async (enabled: boolean) => {
    const next = updatePreferences({ ...preferences, retainOriginalFiles: enabled })
    if (!enabled) return
    const result = await pruneHistoryStorage(next)
    await refreshHistory()
    if (result.failedPaths.length) setStatus("部分旧文件无法清理，请在记录页处理。")
  }

  return (
    <TabView selection={activeTab as any} tint="systemGreen" tabViewStyle="sidebarAdaptable">
      <Tab title="记录" systemImage="clock.arrow.circlepath" value={HISTORY_TAB}>
        <NavigationStack>
          <List
            navigationTitle="下载记录"
            navigationBarTitleDisplayMode="inline"
            toolbar={{
              cancellationAction: <Button title="关闭" action={dismiss} />,
              topBarTrailing: <Button title="" systemImage="arrow.clockwise" action={() => void refreshHistory()} />,
            }}
          >
            <Section header={<Text>{`记录 ${historySummary.totalRecords} 条 · 本地文件 ${historySummary.availableCount} 个`}</Text>} footer={<Text font="caption" foregroundStyle="secondaryLabel">仅管理 Yoinks 下载目录中的原文件，不会删除相册或文件 App 中的副本。</Text>}>
              {history.length ? history.map((record) => (
                <Button key={record.id} action={() => void openHistoryActions(record)}>{
                  <HStack spacing={12}>
                    <Image systemName={record.mediaKind === "audio" ? "music.note" : "play.rectangle"} foregroundStyle={record.mediaKind === "audio" ? "purple" : "blue"} frame={{ width: 24 }} />
                    <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" as any }}>
                      <Text font="headline" lineLimit={2}>{record.title || record.fileName}</Text>
                      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{record.formatLabel} · {historyAvailability[record.id] ? "本地文件可用" : "文件已清理"}</Text>
                      <HStack>
                        <Text font="caption2" foregroundStyle="secondaryLabel">{formatBytes(record.fileSizeBytes)}</Text>
                        <Spacer />
                        <Text font="caption2" foregroundStyle="secondaryLabel">{formatHistoryDate(record.createdAt)}</Text>
                      </HStack>
                    </VStack>
                  </HStack>
                }</Button>
              )) : <Text foregroundStyle="secondaryLabel">尚无下载记录。</Text>}
            </Section>
            <Section title="存储">
              <Text foregroundStyle="secondaryLabel">已管理 {formatBytes(historySummary.managedBytes)}</Text>
              <Button title="清空下载记录和原文件" systemImage="trash" role="destructive" action={() => void clearHistory()} disabled={!history.length} />
            </Section>
          </List>
        </NavigationStack>
      </Tab>

      <Tab title="下载" systemImage="arrow.down.circle.fill" value={DOWNLOAD_TAB}>
        <NavigationStack>
          <List
            navigationTitle="Yoinks"
            navigationBarTitleDisplayMode="inline"
            toolbar={{
              cancellationAction: <Button title="关闭" action={dismiss} />,
            }}
          >
            <Section title="当前链接" footer={<Text font="caption" foregroundStyle="secondaryLabel">粘贴或输入公开媒体链接后，点「分析链接」识别可下载格式。</Text>}>
              <TextField
                title="媒体链接"
                value={urlInput}
                onChanged={setURLInput}
                prompt="https://..."
              />
              <HStack spacing={10}>
                <Button title="粘贴" systemImage="doc.on.clipboard" action={() => void pasteURL()} disabled={downloading || analyzing} />
                <Spacer />
                <Button title={analyzing ? "分析中…" : "分析链接"} systemImage="waveform.path.ecg" action={() => void submitURLInput()} disabled={!tools?.ytDlpVersion || analyzing || downloading} />
              </HStack>
              {mediaPlatformLabel(urlInput || url) ? <Text font="caption" foregroundStyle="secondaryLabel">来源：{mediaPlatformLabel(urlInput || url)}</Text> : null}
              {url && url !== urlInput ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>已分析：{url}</Text> : null}
            </Section>

            <Section title="格式与保存">
              {!probe ? <Text foregroundStyle="secondaryLabel">添加链接后将自动识别可下载格式。</Text> : (
                <>
                  <HStack spacing={12} alignment="top">
                    <VStack
                      frame={{ width: 72, height: 96, alignment: "center" as any }}
                      clipShape={{ type: "rect", cornerRadius: 8 }}
                      background={{ style: "tertiarySystemFill", shape: { type: "rect", cornerRadius: 8 } }}
                    >
                      {probe.thumbnail ? (
                        <Image imageUrl={probe.thumbnail} resizable frame={{ width: 72, height: 96 }} clipShape={{ type: "rect", cornerRadius: 8 }} placeholder={<Image systemName="play.rectangle.fill" foregroundStyle="secondaryLabel" />} />
                      ) : (
                        <Image systemName="play.rectangle.fill" foregroundStyle="secondaryLabel" />
                      )}
                    </VStack>
                    <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" as any }}>
                      <Text font="headline" lineLimit={2}>{probe.title}</Text>
                      {probe.uploader ? <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{probe.uploader}</Text> : null}
                    </VStack>
                  </HStack>
                  <Button title={selectedChoice?.label || "选择格式"} systemImage={selectedChoice?.kind === "audio" ? "music.note" : "play.rectangle"} action={() => void chooseFormat()} disabled={downloading || analyzing} />
                  <Button title="在线预览" systemImage="play.circle" action={() => void previewSelectedChoice()} disabled={!selectedChoice?.previewURL || downloading || analyzing} />
                </>
              )}
              <Button title={`默认保存方式：${SAVE_LABELS[saveMode]}`} systemImage={saveMode === "photos" ? "photo.on.rectangle" : saveMode === "files" ? "folder" : "questionmark.circle"} action={() => void chooseSaveMode()} disabled={downloading || analyzing} />
            </Section>

            <Section header={<Text>{downloading ? "下载中" : "任务"}</Text>} footer={<Text font="caption" foregroundStyle="secondaryLabel">{status}</Text>}>
              {downloading ? (
                <VStack alignment="leading" spacing={10} padding={{ vertical: 6 }}>
                  <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" as any }}>
                    <HStack><Text font="subheadline">{progress.stage}</Text><Spacer /><Text font="caption" foregroundStyle="secondaryLabel">{Math.round(progress.fraction * 100)}%</Text></HStack>
                    {formatProgressDetail(progress) ? <Text font="caption" foregroundStyle="secondaryLabel">{formatProgressDetail(progress)}</Text> : null}
                  </VStack>
                  <ProgressView value={progress.fraction} />
                  <Button title="取消下载" systemImage="xmark" role="destructive" action={() => void stopDownload()} />
                </VStack>
              ) : <Button title="开始下载" systemImage="arrow.down.circle.fill" action={() => void startDownload()} disabled={!url || !tools?.ytDlpVersion || installing || !selectedChoice || analyzing} />}
              {result ? <Button title="播放" systemImage="play.circle" action={() => void presentNativePlayer(result.filePath, probe?.title || result.fileName)} /> : null}
              {result ? <Button title="用其他 App 打开" systemImage="arrow.up.forward.app" action={() => void openWithOtherApps(result.filePath)} /> : null}
              {result ? <Button title="分享" systemImage="square.and.arrow.up" action={() => void ShareSheet.present([result.filePath])} /> : null}
            </Section>
          </List>
        </NavigationStack>
      </Tab>

      <Tab title="设置" systemImage="gearshape.fill" value={SETTINGS_TAB}>
        <NavigationStack>
          <List navigationTitle="设置" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}>
            <Section title="下载偏好">
              <Button title={`默认保存方式：${SAVE_LABELS[saveMode]}`} systemImage="square.and.arrow.down" action={() => void chooseSaveMode()} disabled={downloading || analyzing} />
              <Button title={`下载并发：${CONCURRENCY_LABELS[concurrentFragments]}`} systemImage="arrow.triangle.2.circlepath" action={() => void chooseConcurrency()} disabled={downloading || analyzing} />
            </Section>
            <Section title="本地存储">
              <Text font="caption" foregroundStyle="secondaryLabel">自动清理优先删除最早的 Yoinks 原文件和对应记录。</Text>
              <Toggle title="保留原文件" systemImage="internaldrive" value={preferences.retainOriginalFiles} onChanged={(value) => void changeRetention(value)} />
              <Text foregroundStyle="secondaryLabel">当前：{historySummary.availableCount} 个文件 · {formatBytes(historySummary.managedBytes)}</Text>
              <Button title={`本地文件上限：${preferences.maxManagedBytes == null ? "不限" : formatBytes(preferences.maxManagedBytes)}`} systemImage="externaldrive" action={() => void chooseManagedBytes()} />
              <Button title={`下载记录上限：${preferences.maxHistoryRecords == null ? "不限" : `${preferences.maxHistoryRecords} 条`}`} systemImage="list.number" action={() => void chooseHistoryLimit()} />
            </Section>
            <Section title="工具与登录">
              <HStack spacing={10}>
                <Image systemName={statusIcon(Boolean(tools?.ytDlpVersion))} foregroundStyle={tools?.ytDlpVersion ? "green" : "orange"} />
                <Text frame={{ maxWidth: "infinity", alignment: "leading" as any }}>{toolLabel(tools)}</Text>
                <Button title={installing ? (tools?.ytDlpVersion ? "升级中" : "安装中") : (tools?.ytDlpVersion ? "升级" : "安装")} action={() => void install()} disabled={installing || loadingTools || downloading} />
              </HStack>
              <Button title="检查下载引擎" systemImage="arrow.clockwise" action={() => void refreshTools()} disabled={loadingTools || downloading} />
              {loggedInSessions.length ? <Button title="清除登录状态" systemImage="person.crop.circle.badge.xmark" role="destructive" action={() => void clearPlatformAuth()} disabled={downloading || analyzing} /> : <Text font="caption" foregroundStyle="secondaryLabel">需要登录的平台会在探测或下载时请求登录。</Text>}
            </Section>
            <Section title="诊断日志">
              <Toggle title="调试模式" systemImage="ladybug" value={debugMode} onChanged={changeDebugMode} />
              {debugMode ? <><Button title="查看运行日志" systemImage="list.bullet.rectangle" action={() => void showLogs()} /><Button title="复制最近日志" systemImage="doc.on.doc" action={() => void copyLogs()} /><Button title="打开日志目录" systemImage="folder" action={() => void openLogFolder()} /></> : <Text font="caption" foregroundStyle="secondaryLabel">开启调试模式后记录并查看运行日志。</Text>}
            </Section>
            <Section title="关于">
              <Button title="关于 Yoinks" systemImage="info.circle" action={() => void Navigation.present({ element: <AboutPage /> })} />
            </Section>
          </List>
        </NavigationStack>
      </Tab>
    </TabView>
  )
}

async function run() {
  try {
    await Navigation.present({ element: <View /> })
  } finally {
    Script.exit()
  }
}

run()
