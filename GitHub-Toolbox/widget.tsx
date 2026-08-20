import { VStack, HStack, Text, Image, Button, Spacer, Widget } from "scripting"
import { RunWorkflowIntent } from "./app_intents"
import {
  WidgetTarget, RunLite,
  getStoredAuth, getWidgetTargets, parseTarget, fetchWorkflowInfo, fetchCron, fetchLatestRuns,
  nextCronRun, timeAgo, runStatusText,
} from "./src/actions/github"

interface TargetData {
  target: WidgetTarget
  workflowName?: string
  runs?: RunLite[]
  nextRun?: Date | null
  error?: string
}

interface WidgetData {
  ok: boolean
  error?: string
  items?: TargetData[]
  lastTriggered?: number
}

async function loadTarget(param: string, token: string): Promise<TargetData> {
  const { owner, repo, workflowRef } = parseTarget(param)
  const base = { target: { owner, repo, branch: '' } as WidgetTarget }
  if (!owner || !repo) return { ...base, error: '格式应为 owner/repo/工作流ID' }
  try {
    const { branch, workflow } = await fetchWorkflowInfo(owner, repo, token, workflowRef)
    if (!workflow) return { ...base, error: '未找到工作流' }
    const [runs, cronExpr] = await Promise.all([
      fetchLatestRuns(owner, repo, workflow.id, token),
      fetchCron(owner, repo, branch, workflow.path, token),
    ])
    const nextRun = cronExpr ? nextCronRun(cronExpr) : null
    return {
      target: { owner, repo, workflowId: workflow.id, branch },
      workflowName: workflow.name,
      runs,
      nextRun,
    }
  } catch (_) {
    return { ...base, error: '请求失败' }
  }
}

async function loadData(): Promise<WidgetData> {
  const auth = getStoredAuth()
  if (!auth) return { ok: false, error: '未登录' }

  const param = Widget.parameter || ''
  let targets: string[]
  if (param) {
    targets = [param]
  } else {
    targets = getWidgetTargets()
  }
  if (targets.length === 0) return { ok: false, error: '未指定仓库' }

  const last = Storage.get<string>('widget_last_target')
  if (last) {
    const idx = targets.indexOf(last)
    if (idx > 0) {
      targets = targets.slice()
      targets.splice(idx, 1)
      targets.unshift(last)
    }
  }

  const items = await Promise.all(targets.slice(0, 8).map(t => loadTarget(t, auth.token)))
  return { ok: true, items, lastTriggered: Storage.get<number>('widget_last_triggered_at') || undefined }
}

function statusMeta(run: RunLite): { icon: string; color: '#34C759' | '#FF3B30' | '#0A84FF' | '#FF9F0A' } {
  if (run.status === 'completed') {
    if (run.conclusion === 'success') return { icon: 'checkmark.circle.fill', color: '#34C759' }
    return { icon: 'xmark.circle.fill', color: '#FF3B30' }
  }
  if (run.status === 'in_progress') return { icon: 'arrow.triangle.2.circlepath', color: '#0A84FF' }
  return { icon: 'clock.fill', color: '#FF9F0A' }
}

function formatNext(d: Date): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) return `今天 ${hm}`
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const isTomorrow = d.getFullYear() === tomorrow.getFullYear() && d.getMonth() === tomorrow.getMonth() && d.getDate() === tomorrow.getDate()
  if (isTomorrow) return `明天 ${hm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

function formatLastTriggered(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameDay) return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function WidgetView({ data }: { data: WidgetData }) {
  const isSmall = Widget.family === 'systemSmall'
  const isLarge = Widget.family === 'systemLarge'
  const outerPad = isSmall ? 10 : isLarge ? 14 : 12
  const outerSpacing = isSmall ? 8 : isLarge ? 12 : 8
  const itemSpacing = isSmall ? 6 : isLarge ? 8 : 5
  const rowSpacing = isSmall ? 6 : isLarge ? 8 : 6
  const headerIcon = isSmall ? 12 : isLarge ? 14 : 13
  const titleFont = isLarge ? 'headline' : 'subheadline'
  const bodyFont = isLarge ? 'subheadline' : 'footnote'
  const historyFont = isLarge ? 'footnote' : 'caption'
  const runIcon = isSmall ? 11 : isLarge ? 12 : 11
  const runPad = isLarge ? { horizontal: 7, vertical: 4 } : { horizontal: 6, vertical: 3 }
  const runColor = '#34C759'
  const totalCount = (data.items || []).length
  const maxItems = isLarge ? totalCount : 1
  const historyCount = isLarge ? (totalCount <= 2 ? 3 : totalCount === 3 ? 1 : 0) : 2

  if (!data.ok) {
    return (
      <VStack alignment="leading" spacing={6} padding={12}>
        <HStack spacing={6}>
          <Image systemName="exclamationmark.triangle.fill" font={13} tint="#FF9F0A" />
          <Text font="caption" fontWeight="bold">GitHub 自动化</Text>
        </HStack>
        <Text font="footnote">{data.error || ''}</Text>
        <Text font="caption2" foregroundStyle="secondaryLabel">长按小组件 → 编辑 → Parameter 填 owner/repo</Text>
      </VStack>
    )
  }

  const items = (data.items || []).slice(0, maxItems)
  const moreCount = (data.items || []).length - items.length
  const showHistory = true
  const showNext = !isLarge || totalCount <= 3

  return (
    <VStack alignment="leading" spacing={outerSpacing} padding={outerPad}>
      <HStack spacing={rowSpacing}>
        <Image systemName="bolt.heart.fill" font={headerIcon} tint="#FF9F0A" />
        <Text font={titleFont} fontWeight="bold" lineLimit={1}>GitHub 自动化</Text>
        <Spacer />
        {!isSmall && moreCount > 0 ? (
          <Text font="caption2" foregroundStyle="secondaryLabel">+{moreCount} 更多</Text>
        ) : null}
      </HStack>

      {data.lastTriggered ? (
        <HStack spacing={rowSpacing}>
          <Image systemName="checkmark.circle.fill" font={12} tint="#34C759" />
          <Text font="caption2" foregroundStyle="secondaryLabel">上次触发 {formatLastTriggered(data.lastTriggered)}</Text>
        </HStack>
      ) : null}

      {items.map((item, idx) => {
        const target = item.target
        const workflowName = item.workflowName || `${target.owner}/${target.repo}`
        const runs = item.runs || []
        const latest = runs[0]
        const latestMeta = latest ? statusMeta(latest) : null
        return (
          <VStack key={idx} alignment="leading" spacing={itemSpacing}>
            <HStack spacing={rowSpacing}>
              <Text font={titleFont} fontWeight="bold" lineLimit={isLarge ? 1 : 2} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>{workflowName}</Text>
              {!item.error ? (
                <Button intent={RunWorkflowIntent(JSON.stringify(target))} buttonStyle="plain">
                  <HStack background={{ style: runColor, shape: 'capsule' }}>
                    <Image systemName="play.fill" font={runIcon} tint="#FFFFFF" padding={runPad} />
                  </HStack>
                </Button>
              ) : null}
            </HStack>

            {item.error ? (
              <Text font="caption2" foregroundStyle="secondaryLabel">{item.error}</Text>
            ) : (
              <>
                {latest && latestMeta ? (
                  <HStack spacing={rowSpacing}>
                    <Image systemName={latestMeta.icon} font={runIcon} tint={latestMeta.color} />
                    <Text font={bodyFont} lineLimit={1}>{runStatusText(latest)}</Text>
                    <Spacer />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{timeAgo(latest.created_at)}</Text>
                  </HStack>
                ) : (
                  <Text font="caption2" foregroundStyle="secondaryLabel">暂无运行记录</Text>
                )}
                {item.nextRun && showNext ? (
                  <HStack spacing={rowSpacing}>
                    <Image systemName="calendar" font={runIcon} tint="#0A84FF" />
                    <Text font={bodyFont} lineLimit={1}>下次 {formatNext(item.nextRun)}</Text>
                  </HStack>
                ) : null}
                {showHistory && runs.slice(0, historyCount).map((r) => {
                  const meta = statusMeta(r)
                  return (
                    <HStack key={r.id} spacing={rowSpacing}>
                      <Image systemName={meta.icon} font={runIcon} tint={meta.color} />
                      <Text font={historyFont} lineLimit={1}>#{r.run_number} {runStatusText(r)}</Text>
                      <Spacer />
                      <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>{timeAgo(r.created_at)}</Text>
                    </HStack>
                  )
                })}
              </>
            )}
            {idx < items.length - 1 ? (
              <HStack frame={{ maxWidth: 'infinity', minHeight: 1, maxHeight: 1 }} background="rgba(120,120,128,0.24)" />
            ) : null}
          </VStack>
        )
      })}
    </VStack>
  )
}

loadData().then((data) => {
  Widget.present(<WidgetView data={data} />, {
    reloadPolicy: {
      policy: "after",
      date: new Date(Date.now() + 1000 * 60 * 10)
    }
  })
})
