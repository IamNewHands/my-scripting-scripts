import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  ProgressView,
  Section,
  Text,
  VStack,
  useEffect,
  useState,
} from "scripting"
import {
  clearLogs,
  readLogPage,
  type LogFilter,
  type LogLevel,
  type LogPage as LogPageData,
  type YoinksLogEvent,
} from "../services/logs"

const INITIAL_LOG_EVENT_LIMIT = 20
const LOG_FILTER_LABELS: Record<LogFilter, string> = {
  all: "全部",
  info: "信息",
  warn: "警告",
  error: "错误",
}
const LOG_LEVEL_STYLE: Record<LogLevel, { label: string; icon: string; color: string }> = {
  debug: { label: "调试", icon: "ladybug", color: "secondaryLabel" },
  info: { label: "信息", icon: "info.circle.fill", color: "blue" },
  warn: { label: "警告", icon: "exclamationmark.triangle.fill", color: "orange" },
  error: { label: "错误", icon: "xmark.octagon.fill", color: "red" },
}

function formatLogTimestamp(timestamp?: string): string {
  if (!timestamp) return "尚无记录"
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString("zh-CN", { hour12: false })
}

function formatLogSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function logSummary(event: YoinksLogEvent): string {
  const entries = Object.entries(event.details || {})
  if (!entries.length) return event.taskId ? `任务：${event.taskId}` : "无附加信息"
  return entries.slice(0, 2).map(([key, value]) => `${key}=${String(value)}`).join(" · ")
}

function LogDetailPage(props: { event: YoinksLogEvent }) {
  const dismiss = Navigation.useDismiss()
  const style = LOG_LEVEL_STYLE[props.event.level]
  return (
    <NavigationStack>
      <List navigationTitle="日志详情" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}>
        <Section title="事件">
          <HStack spacing={8}>
            <Image systemName={style.icon} foregroundStyle={style.color as any} />
            <Text font="headline">{style.label} · {props.event.event}</Text>
          </HStack>
          <Text font="caption" foregroundStyle="secondaryLabel">{formatLogTimestamp(props.event.timestamp)}</Text>
          {props.event.taskId ? <Text font="caption" foregroundStyle="secondaryLabel">任务：{props.event.taskId}</Text> : null}
        </Section>
        <Section title="已脱敏详情">
          {Object.entries(props.event.details || {}).length ? Object.entries(props.event.details || {}).map(([key, value]) => (
            <VStack alignment="leading" spacing={3} key={key}>
              <Text font="caption" foregroundStyle="secondaryLabel">{key}</Text>
              <Text>{String(value)}</Text>
            </VStack>
          )) : <Text foregroundStyle="secondaryLabel">此事件没有附加字段。</Text>}
        </Section>
      </List>
    </NavigationStack>
  )
}

function AboutPage() {
  const dismiss = Navigation.useDismiss()
  const openUpstreamProject = async () => {
    try {
      await Safari.present("https://github.com/pablostanley/yoinks/tree/main", true)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await Dialog.alert({ title: "无法打开项目页面", message })
    }
  }

  return (
    <NavigationStack>
      <List navigationTitle="关于 Yoinks" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}>
        <Section title="Yoinks">
          <Text>Yoinks 是基于 Scripting 的公开媒体链接下载工具：先探测可用格式，再按选择下载和保存。</Text>
        </Section>
        <Section title="功能与特点">
          <Text>支持格式优先选择、可用时的在线预览、音视频下载与 FFmpeg 合并，以及保存到相册或文件。</Text>
          <Text>下载记录和本地原文件可统一管理；需要登录的平台会在探测或下载时提供登录重试。调试模式开启后可查看结构化运行日志。</Text>
        </Section>
        <Section title="原版兼容性">
          <Text>Scripting 中的 Node.js 运行能力由 Swift 与 JavaScript 层模拟，并非完整的原生 Node.js 运行时。即使依赖包齐全，执行 Node 或 npm run 仍可能因 waitUntilExit 等兼容性问题无法正常运行。</Text>
          <Text>因此当前版本保留 Yoinks 的名称与核心下载体验，未能完整复现原项目的全部能力。待 Scripting 作者进一步完善 npm 与 Node 运行支持后，脚本将继续跟进更新。</Text>
        </Section>
        <Section title="致谢">
          <Button title="打开 Yoinks 开源项目" systemImage="arrow.up.right.square" action={() => void openUpstreamProject()} />
          <Text font="caption" foregroundStyle="secondaryLabel">感谢 Pablo Stanley 与 Yoinks 开源项目提供的灵感。</Text>
        </Section>
      </List>
    </NavigationStack>
  )
}

export function LogPage() {
  const dismiss = Navigation.useDismiss()
  const [filter, setFilter] = useState<LogFilter>("all")
  const [limit, setLimit] = useState(INITIAL_LOG_EVENT_LIMIT)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState<LogPageData>({ events: [], totalMatching: 0, totalAvailable: 0, hasMore: false, sizeBytes: 0 })

  const refresh = async (nextFilter = filter, nextLimit = limit) => {
    setPage(await readLogPage(nextFilter, 0, nextLimit))
  }

  useEffect(() => { void refresh("all", INITIAL_LOG_EVENT_LIMIT) }, [])

  const loadNextEvent = async () => {
    if (loadingMore || !page.hasMore) return
    const nextLimit = limit + 20
    setLoadingMore(true)
    try {
      setPage(await readLogPage(filter, 0, nextLimit))
      setLimit(nextLimit)
    } finally {
      setLoadingMore(false)
    }
  }

  const chooseFilter = async () => {
    const filters: LogFilter[] = ["all", "info", "warn", "error"]
    const selection = await Dialog.actionSheet({ title: "日志级别", actions: filters.map((value) => ({ label: LOG_FILTER_LABELS[value] })), cancelButton: true })
    if (selection == null) return
    const nextFilter = filters[selection]
    setFilter(nextFilter)
    setLimit(INITIAL_LOG_EVENT_LIMIT)
    await refresh(nextFilter, INITIAL_LOG_EVENT_LIMIT)
  }

  const clear = async () => {
    const confirmed = await Dialog.confirm({ title: "清空运行日志", message: "只会清空当前日志；按任务归档的历史日志将保留。", confirmLabel: "清空", cancelLabel: "取消" })
    if (!confirmed) return
    await clearLogs()
    setLimit(INITIAL_LOG_EVENT_LIMIT)
    await refresh(filter, INITIAL_LOG_EVENT_LIMIT)
  }

  const showDetail = async (event: YoinksLogEvent) => {
    await Navigation.present({ element: <LogDetailPage event={event} /> })
  }

  return (
    <NavigationStack>
      <List navigationTitle="运行日志" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}>
        <Section title="筛选与维护">
          <Button title={`级别：${LOG_FILTER_LABELS[filter]}`} systemImage="line.3.horizontal.decrease.circle" action={() => void chooseFilter()} />
          <Button title="刷新日志" systemImage="arrow.clockwise" action={() => { setLimit(INITIAL_LOG_EVENT_LIMIT); void refresh(filter, INITIAL_LOG_EVENT_LIMIT) }} />
          <Button title="清空运行日志" systemImage="trash" role="destructive" action={() => void clear()} />
        </Section>
        <Section title="状态">
          <Text>当前记录：{page.totalAvailable} 条</Text>
          <Text>筛选结果：{page.totalMatching} 条</Text>
          <Text>文件大小：{formatLogSize(page.sizeBytes)}</Text>
          <Text>最后写入：{formatLogTimestamp(page.lastWrittenAt)}</Text>
        </Section>
        <Section title="最近事件（新到旧）">
          {page.events.map((event, index) => {
            const style = LOG_LEVEL_STYLE[event.level]
            return <Button key={`${event.timestamp}-${event.event}-${index}`} onAppear={index === page.events.length - 1 ? () => void loadNextEvent() : undefined} action={() => void showDetail(event)}>{
              <HStack spacing={10}>
                <Image systemName={style.icon} foregroundStyle={style.color as any} frame={{ width: 20 }} />
                <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity", alignment: "leading" as any }}>
                  <Text font="subheadline" lineLimit={1}>{style.label.toUpperCase()} · {event.event}</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">{formatLogTimestamp(event.timestamp)}</Text>
                  <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{logSummary(event)}</Text>
                </VStack>
              </HStack>
            }</Button>
          })}
          {!page.events.length ? <Text foregroundStyle="secondaryLabel">尚无符合条件的日志。</Text> : null}
          {loadingMore ? <HStack><ProgressView /><Text font="caption" foregroundStyle="secondaryLabel">正在加载更早的日志</Text></HStack> : null}
        </Section>
      </List>
    </NavigationStack>
  )
}

