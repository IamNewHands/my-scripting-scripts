import {
  NavigationStack,
  List,
  Section,
  TextField,
  SecureField,
  Button,
  Text,
  HStack,
  VStack,
  Image,
  NavigationLink,
  Navigation,
  Link,
  Script,
  ScrollView,
  Widget,
  ProgressView,
  Spacer,
  useState,
  useEffect,
  useCallback,
} from "scripting"
import {
  getStoredAuth,
  listProfiles,
  addProfile,
  setActiveProfile,
  removeProfile,
  cacheGet,
  cacheSet,
  cacheClearPrefix,
} from "./github"

const CACHE_PREFIX = 'gh_cache_v1_'

function storageRemove(key: string): void {
  Storage.remove(key)
}

function getWidgetTargets(): string[] {
  const list = Storage.get<string>('widget_repos')
  if (list) {
    try {
      const arr = JSON.parse(list)
      if (Array.isArray(arr)) {
        return arr.filter((x): x is string => typeof x === 'string' && x.split('/').filter(Boolean).length >= 2)
      }
    } catch (_) { }
  }
  const legacy = Storage.get<string>('widget_repo')
  if (legacy) return [legacy]
  return []
}

function setWidgetTargets(targets: string[]) {
  const clean = targets.filter((t) => t.split('/').filter(Boolean).length >= 2)
  if (clean.length === 0) {
    Storage.remove('widget_repos')
    Storage.remove('widget_repo')
    return
  }
  Storage.set('widget_repos', JSON.stringify(clean))
  Storage.remove('widget_repo')
}

function recordWidgetTrigger(owner: string, repo: string, workflowId: number) {
  Storage.set('widget_last_target', `${owner}/${repo}/${workflowId}`)
}

function errorMessage(e: any, fallback: string): string {
  return e?.message || fallback
}

function runStatusColor(conclusion: Run['conclusion']): string {
  switch (conclusion) {
    case 'success': return '#34c759'
    case 'failure': return '#ff3b30'
    case 'cancelled': return '#ff9500'
    default: return '#8e8e93'
  }
}

function runStatusInfo(run: Run): { text: string; color: string; backgroundColor: string } {
  if (run.status === 'completed') {
    switch (run.conclusion) {
      case 'success': return { text: '成功', color: '#1a7f37', backgroundColor: '#d9f2e0' }
      case 'failure': return { text: '失败', color: '#b42318', backgroundColor: '#fde3e1' }
      case 'cancelled': return { text: '已取消', color: '#b54708', backgroundColor: '#fde9d2' }
      case 'timed_out': return { text: '超时', color: '#b54708', backgroundColor: '#fde9d2' }
      default: return { text: run.conclusion || '完成', color: '#6b7280', backgroundColor: '#eef0f3' }
    }
  }
  if (run.status === 'in_progress') return { text: '进行中', color: '#175cd3', backgroundColor: '#d7e8fd' }
  if (run.status === 'queued') return { text: '排队中', color: '#6b7280', backgroundColor: '#eef0f3' }
  return { text: run.status, color: '#6b7280', backgroundColor: '#eef0f3' }
}

function runStatusIcon(run: Run): { systemName: string; color: string } {
  if (run.status === 'completed') {
    switch (run.conclusion) {
      case 'success': return { systemName: 'checkmark.circle.fill', color: '#34c759' }
      case 'failure': return { systemName: 'xmark.circle.fill', color: '#ff3b30' }
      case 'cancelled': return { systemName: 'xmark.circle.fill', color: '#ff9500' }
      case 'timed_out': return { systemName: 'clock.fill', color: '#ff9500' }
      default: return { systemName: 'questionmark.circle', color: '#8e8e93' }
    }
  }
  if (run.status === 'in_progress') return { systemName: 'arrow.triangle.2.circlepath', color: '#0a84ff' }
  if (run.status === 'queued') return { systemName: 'clock.fill', color: '#8e8e93' }
  return { systemName: 'questionmark.circle', color: '#8e8e93' }
}

function StatusBadge({ text, color, backgroundColor }: { text: string; color: string; backgroundColor: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '600',
        color,
        backgroundColor,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
      }}
    >
      {text}
    </Text>
  )
}

function jobStatusInfo(job: { status: string; conclusion: string | null }): { text: string; color: string; backgroundColor: string } {
  if (job.status === 'completed') {
    switch (job.conclusion) {
      case 'success': return { text: '成功', color: '#1a7f37', backgroundColor: '#d9f2e0' }
      case 'failure': return { text: '失败', color: '#b42318', backgroundColor: '#fde3e1' }
      case 'cancelled': return { text: '已取消', color: '#b54708', backgroundColor: '#fde9d2' }
      case 'timed_out': return { text: '超时', color: '#b54708', backgroundColor: '#fde9d2' }
      case 'skipped': return { text: '跳过', color: '#6b7280', backgroundColor: '#eef0f3' }
      default: return { text: job.conclusion || '完成', color: '#6b7280', backgroundColor: '#eef0f3' }
    }
  }
  if (job.status === 'in_progress') return { text: '进行中', color: '#175cd3', backgroundColor: '#d7e8fd' }
  if (job.status === 'queued' || job.status === 'waiting') return { text: '排队中', color: '#6b7280', backgroundColor: '#eef0f3' }
  return { text: job.status, color: '#6b7280', backgroundColor: '#eef0f3' }
}

function jobStatusIcon(job: { status: string; conclusion: string | null }): { systemName: string; color: string } {
  if (job.status === 'completed') {
    switch (job.conclusion) {
      case 'success': return { systemName: 'checkmark.circle.fill', color: '#34c759' }
      case 'failure': return { systemName: 'xmark.circle.fill', color: '#ff3b30' }
      case 'cancelled': return { systemName: 'xmark.circle.fill', color: '#ff9500' }
      case 'timed_out': return { systemName: 'clock.fill', color: '#ff9500' }
      case 'skipped': return { systemName: 'circle.dashed', color: '#8e8e93' }
      default: return { systemName: 'questionmark.circle', color: '#8e8e93' }
    }
  }
  if (job.status === 'in_progress') return { systemName: 'arrow.triangle.2.circlepath', color: '#0a84ff' }
  if (job.status === 'queued' || job.status === 'waiting') return { systemName: 'clock.fill', color: '#8e8e93' }
  return { systemName: 'questionmark.circle', color: '#8e8e93' }
}

function formatTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatShortTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (day === startOfDay) return `今天 ${hhmm}`
  if (day === startOfDay - 86400000) return `昨天 ${hhmm}`
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${hhmm}`
}

function timeAgoText(iso?: string): string | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  const diff = Date.now() - t
  if (diff < 0) return null
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return formatShortTime(iso)
}

function durationText(start?: string, end?: string): string | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms) || ms < 0) return null
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec} 秒`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 60) return `${m} 分 ${s} 秒`
  const h = Math.floor(m / 60)
  return `${h} 小时 ${m % 60} 分`
}

function InfoRow({ label, value, subtitle }: { label: string; value: string; subtitle?: string | null }) {
  return (
    <HStack spacing={6} alignment="top">
      <Text style={{ color: '#8e8e93', fontSize: 13 }}>{label}</Text>
      <VStack alignment="leading" spacing={2} style={{ flex: 1 }}>
        <Text style={{ color: '#1c1c1e', fontSize: 13 }}>{value}</Text>
        {subtitle ? <Text style={{ color: '#8e8e93', fontSize: 11 }}>{subtitle}</Text> : null}
      </VStack>
    </HStack>
  )
}

function Card({
  children,
  style,
}: {
  children: any
  style?: any
}) {
  return (
    <VStack
      alignment="leading"
      spacing={8}
      padding={12}
      clipShape={{ type: 'rect', cornerRadius: 16, style: 'continuous' }}
      style={{ backgroundColor: '#f6f8fa', ...style }}
    >
      {children}
    </VStack>
  )
}

const API_BASE = 'https://api.github.com'
const REQUEST_TIMEOUT_MS = 15000
const RERUN_REFRESH_DELAY_MS = 1000

interface Repo {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  default_branch: string
}

interface Workflow {
  id: number
  name: string
  path: string
  state: 'active' | 'disabled' | 'deleted'
  created_at: string
  updated_at: string
}

interface Run {
  id: number
  name: string
  display_title?: string
  path?: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null
  created_at: string
  updated_at: string
  run_started_at?: string
  completed_at?: string
  run_attempt: number
  head_branch: string
  head_sha: string
  head_commit?: {
    message?: string
    author?: { name?: string }
    committer?: { name?: string }
    timestamp?: string
  }
  actor: { login: string }
  triggering_actor?: { login: string }
  check_suite_id?: number
  pull_requests?: Array<{ number: number; title?: string }>
  repository?: { full_name?: string; default_branch?: string; private?: boolean }
  event: string
  workflow_id: number
  run_number: number
  url: string
  html_url: string
}

interface JobStep {
  name: string
  status: string
  conclusion: string | null
  number: number
  started_at: string
  completed_at: string | null
}

interface Job {
  id: number
  name: string
  status: string
  conclusion: string | null
  started_at: string
  completed_at: string | null
  steps?: JobStep[]
  runner_name?: string | null
  labels?: string[]
  workflow_name?: string
  head_branch?: string
}

class GitHubAPI {
  private token: string
  private username: string

  constructor(auth: { token: string; username: string }) {
    this.token = auth.token
    this.username = auth.username
  }

  private async request<T>(path: string, options?: RequestInit & { cacheTtlSec?: number; force?: boolean }): Promise<T> {
    const method = options?.method ?? 'GET'
    const cacheKey = options?.cacheTtlSec != null ? `${CACHE_PREFIX}${this.username}${path}` : null
    if (method === 'GET' && options?.cacheTtlSec != null && !options?.force) {
      const hit = cacheGet<T>(cacheKey!, options.cacheTtlSec)
      if (hit !== null) return hit
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const url = `${API_BASE}${path}`
      const headers = {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options?.headers,
      }
      const resp = await fetch(url, { ...options, headers, signal: controller.signal })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`GitHub API error (${resp.status}): ${text}`)
      }
      const body = await resp.text()
      if (!body) return undefined as T
      const data = JSON.parse(body) as T
      if (method === 'GET' && options?.cacheTtlSec != null) cacheSet(cacheKey!, data)
      return data
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        throw new Error('请求超时，请检查网络或 Token 权限')
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async getRepos(force = false): Promise<Repo[]> {
    return this.request<Repo[]>('/user/repos?per_page=100&sort=updated', { cacheTtlSec: 0, force })
  }

  async getWorkflows(owner: string, repo: string, force = false): Promise<Workflow[]> {
    const data = await this.request<{ workflows: Workflow[] }>(
      `/repos/${owner}/${repo}/actions/workflows`,
      { cacheTtlSec: 0, force }
    )
    return data.workflows
  }

  async getWorkflowRuns(owner: string, repo: string, workflowId: number, force = false): Promise<Run[]> {
    const data = await this.request<{ workflow_runs: Run[] }>(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=50`,
      { cacheTtlSec: 0, force }
    )
    return data.workflow_runs
  }

  async rerunRun(owner: string, repo: string, runId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`, {
      method: 'POST',
    })
    cacheClearPrefix(`${CACHE_PREFIX}${this.username}/repos/${owner}/${repo}/actions`)
  }

  async cancelRun(owner: string, repo: string, runId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, {
      method: 'POST',
    })
    cacheClearPrefix(`${CACHE_PREFIX}${this.username}/repos/${owner}/${repo}/actions`)
  }

  async dispatchWorkflow(
    owner: string,
    repo: string,
    workflowId: number,
    ref: string,
    inputs?: Record<string, any>
  ): Promise<void> {
    await this.request(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        body: JSON.stringify({ ref, inputs: inputs || {} }),
      }
    )
    cacheClearPrefix(`${CACHE_PREFIX}${this.username}/repos/${owner}/${repo}/actions`)
  }

  // 启用/禁用工作流（GitHub REST：PUT enable / disable，需 workflow 权限）
  async enableWorkflow(owner: string, repo: string, workflowId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable`, {
      method: 'PUT',
    })
    cacheClearPrefix(`${CACHE_PREFIX}${this.username}/repos/${owner}/${repo}/actions`)
  }

  async disableWorkflow(owner: string, repo: string, workflowId: number): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable`, {
      method: 'PUT',
    })
    cacheClearPrefix(`${CACHE_PREFIX}${this.username}/repos/${owner}/${repo}/actions`)
  }

  async getRunJobs(owner: string, repo: string, runId: number, force = false): Promise<Job[]> {
    const data = await this.request<{ total_count: number; jobs: Job[] }>(
      `/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100`,
      { cacheTtlSec: 0, force }
    )
    return data.jobs
  }
}

function LoginPage({ onLogin }: { onLogin: (auth: { token: string; username: string }) => void }) {
  const dismiss = Navigation.useDismiss()
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const profiles = listProfiles()

  const finish = useCallback((auth: { token: string; username: string }) => {
    onLogin(auth)
    try {
      dismiss()
    } catch (_) { }
  }, [onLogin, dismiss])

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !token.trim()) {
      setError('请填写用户名和 Token')
      return
    }
    setLoading(true)
    setError('')
    try {
      const api = new GitHubAPI({ token: token.trim(), username: username.trim() })
      await api.getRepos()
      addProfile(username.trim(), token.trim())
      finish({ token: token.trim(), username: username.trim() })
    } catch (err: any) {
      setError(errorMessage(err, '登录失败，请检查 Token 权限'))
    } finally {
      setLoading(false)
    }
  }, [username, token, finish])

  const handleSwitch = useCallback(async (id: string) => {
    if (!setActiveProfile(id)) return
    const auth = getStoredAuth()
    if (auth) finish(auth)
  }, [finish])

  return (
    <ScrollView preferredColorScheme="light">
      <VStack padding={20} spacing={20} alignment="center" style={{ backgroundColor: '#e9f0fb' }}>
        <VStack spacing={20} alignment="center" style={{ width: '100%' }}>
          <VStack alignment="center" spacing={14} style={{ paddingTop: 40, paddingBottom: 4 }}>
            <VStack
              alignment="center"
              spacing={0}
              style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: '#0a84ff' }}
            >
              <Image systemName="hammer.fill" width={40} height={40} foregroundStyle="#ffffff" />
            </VStack>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1c1c1e' }}>GitHub Actions</Text>
            <Text style={{ fontSize: 15, color: '#8e8e93' }}>随时随地管理您的工作流</Text>
          </VStack>

          {profiles.length > 0 ? (
            <VStack spacing={10} style={{ width: '100%' }}>
              <Text style={{ fontSize: 15, color: '#8e8e93' }}>已保存账户（点击切换）</Text>
              {profiles.map((p) => (
                <Button key={p.id} action={() => void handleSwitch(p.id)}>
                  <HStack
                    padding={{ horizontal: 16, vertical: 12 }}
                    frame={{ maxWidth: 'infinity', minHeight: 52, alignment: 'leading' }}
                    clipShape={{ type: 'rect', cornerRadius: 18, style: 'continuous' }}
                    glassEffect={{
                      glass: UIGlass.clear().interactive(true),
                      shape: { type: 'rect', cornerRadius: 18, style: 'continuous' },
                    }}
                    shadow={{ color: 'rgba(72,88,120,0.22)', radius: 18, y: 7 }}
                  >
                    <Image systemName="person.crop.circle.fill" width={22} height={22} foregroundStyle="#0a84ff" />
                    <VStack alignment="leading" spacing={2} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>{p.name}</Text>
                      <Text style={{ fontSize: 12, color: '#8e8e93' }}>@{p.username}</Text>
                    </VStack>
                    <Image systemName="chevron.right" width={14} height={14} foregroundStyle="#c7c7cc" />
                  </HStack>
                </Button>
              ))}
            </VStack>
          ) : null}

          <VStack spacing={16} style={{ width: '100%' }}>
            <VStack alignment="leading" spacing={7} style={{ width: '100%' }}>
              <Text style={{ fontSize: 15, color: '#8e8e93' }}>用户名</Text>
              <HStack
                padding={{ horizontal: 16, vertical: 10 }}
                frame={{ maxWidth: 'infinity', minHeight: 52, alignment: 'leading' }}
                clipShape={{ type: 'rect', cornerRadius: 18, style: 'continuous' }}
                glassEffect={{
                  glass: UIGlass.clear().interactive(true),
                  shape: { type: 'rect', cornerRadius: 18, style: 'continuous' },
                }}
                shadow={{ color: 'rgba(72,88,120,0.22)', radius: 18, y: 7 }}
              >
                <TextField
                  title=""
                  value={username}
                  onChanged={setUsername}
                  prompt="your-username"
                  textFieldStyle="plain"
                  textInputAutocapitalization="never"
                />
              </HStack>
            </VStack>

            <VStack alignment="leading" spacing={7} style={{ width: '100%' }}>
              <Text style={{ fontSize: 15, color: '#8e8e93' }}>Token</Text>
              <HStack
                padding={{ horizontal: 16, vertical: 10 }}
                frame={{ maxWidth: 'infinity', minHeight: 52, alignment: 'leading' }}
                clipShape={{ type: 'rect', cornerRadius: 18, style: 'continuous' }}
                glassEffect={{
                  glass: UIGlass.clear().interactive(true),
                  shape: { type: 'rect', cornerRadius: 18, style: 'continuous' },
                }}
                shadow={{ color: 'rgba(72,88,120,0.22)', radius: 18, y: 7 }}
              >
                <SecureField
                  title=""
                  value={token}
                  onChanged={setToken}
                  prompt="ghp_xxxxxxxx"
                />
              </HStack>
            </VStack>

            {error ? <Text style={{ color: '#ff3b30', textAlign: 'center', fontSize: 13 }}>{error}</Text> : null}
            <Button
              title={loading ? '验证中...' : '绑定账号'}
              action={handleLogin}
              disabled={loading}
              buttonStyle="glassProminent"
              tint="#0a84ff"
              style={{ width: '100%', paddingVertical: 12, borderRadius: 14, fontWeight: 'bold', fontSize: 16 }}
            />
          </VStack>

          <VStack alignment="center" spacing={10} style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#8e8e93', textAlign: 'center' }}>
              Token 需要 repo 和 workflow 权限
            </Text>
            <Link url="https://github.com/settings/tokens">
              <HStack spacing={4} alignment="center">
                <Text style={{ fontSize: 12, color: '#0a84ff', textAlign: 'center', fontWeight: '500' }}>
                  如何获取 Token？
                </Text>
                <Image systemName="arrow.up.right" width={11} height={11} foregroundStyle="#0a84ff" />
              </HStack>
            </Link>
          </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  )
}

function useLoadList<T>(fetcher: (force?: boolean) => Promise<T[]>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setErrorMsg('')
    try {
      setData(await fetcher(force))
    } catch (e: any) {
      setErrorMsg(errorMessage(e, '加载失败'))
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => { load() }, [load])

  return { data, loading, errorMsg, setErrorMsg, load }
}

function RepoListPage({
  api,
  username,
  onLogout,
  onSwitchAccount,
  onAddAccount,
}: {
  api: GitHubAPI
  username: string
  onLogout: () => void
  onSwitchAccount: (id: string) => void
  onAddAccount: () => void
}) {
  const { data: repos, loading, errorMsg, load } = useLoadList(
    useCallback((force?: boolean) => api.getRepos(force), [api])
  )
  const [widgetTargets, setWidgetTargets] = useState<string[]>(() => getWidgetTargets())

  const openWidgetSetup = useCallback(async () => {
    await Navigation.present({
      element: <WidgetSetupPage api={api} />,
      modalPresentationStyle: 'pageSheet',
    })
    setWidgetTargets(getWidgetTargets())
  }, [api])

  const openAccountSheet = useCallback(async () => {
    const profiles = listProfiles()
    const others = profiles.filter((p) => p.username !== username)
    const actions = [
      ...others.map((p) => ({ label: `切换到 ${p.name}` })),
      { label: '添加账号' },
      { label: '退出当前账号', destructive: true },
    ]
    const index = await Dialog.actionSheet({
      title: '账户',
      message: `当前：${username}`,
      actions,
    })
    if (index == null) return
    if (index < others.length) {
      onSwitchAccount(others[index].id)
    } else if (index === others.length) {
      onAddAccount()
    } else {
      const ok = await Dialog.confirm({
        title: '退出账号',
        message: `确定退出 ${username}？将删除本机保存的 Token。`,
        confirmLabel: '退出',
        cancelLabel: '取消',
      })
      if (ok) onLogout()
    }
  }, [username, onSwitchAccount, onAddAccount, onLogout])

  const widgetSummary = widgetTargets.length > 0 ? `已选 ${widgetTargets.length} 个工作流` : ''

  return (
    <List
      navigationTitle="仓库"
      toolbar={{
        topBarTrailing: [
          <Button key="account" title={username} systemImage="person.crop.circle" action={() => void openAccountSheet()} />,
          <Button key="refresh" title="刷新" systemImage="arrow.clockwise" action={() => load(true)} disabled={loading} />,
        ],
      }}
    >
      {loading && repos.length === 0 ? <Text>加载中...</Text> : null}
      {errorMsg ? <Text style={{ color: 'red' }}>{errorMsg}</Text> : null}
      <Section header={<Text style={{ fontWeight: '600', color: '#3c3c43' }}>小组件</Text>}>
        <Button action={openWidgetSetup}>
          <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
            <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff3e0' }}>
              <Image systemName="widget.small" width={18} height={18} foregroundStyle="#f59f00" />
            </VStack>
            <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>桌面小组件</Text>
              <Text style={{ fontSize: 12, color: '#8e8e93' }}>
                {widgetSummary ? widgetSummary : '未指定，点击设置'}
              </Text>
            </VStack>
          </HStack>
        </Button>
      </Section>
      <Section header={<Text style={{ fontWeight: '600', color: '#3c3c43' }}>所有仓库 ({repos.length})</Text>}>
        {repos.map(repo => (
          <NavigationLink
            key={repo.id}
            destination={
              <WorkflowListPage
                api={api}
                owner={repo.owner.login}
                repo={repo.name}
                defaultBranch={repo.default_branch}
              />
            }
          >
            <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
              <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: repo.private ? '#fdf0dc' : '#e8f2fe' }}>
                <Image systemName={repo.private ? 'lock.fill' : 'globe.americas.fill'} width={18} height={18} foregroundStyle={repo.private ? '#b54708' : '#175cd3'} />
              </VStack>
              <VStack alignment="leading" spacing={3} style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>{repo.full_name}</Text>
                <Text style={{ fontSize: 12, color: '#8e8e93' }}>默认分支: {repo.default_branch}</Text>
              </VStack>
            </HStack>
          </NavigationLink>
        ))}
      </Section>
    </List>
  )
}

function WidgetSetupPage({ api }: { api: GitHubAPI }) {
  const [repo, setRepo] = useState<{ owner: string; repo: string } | null>(null)
  if (!repo) {
    return <WidgetRepoList api={api} onPick={(owner, name) => setRepo({ owner, repo: name })} />
  }
  return <WidgetWorkflowList api={api} owner={repo.owner} repo={repo.repo} onBack={() => setRepo(null)} />
}

function WidgetRepoList({ api, onPick }: { api: GitHubAPI; onPick: (owner: string, repo: string) => void }) {
  const dismiss = Navigation.useDismiss()
  const { data: repos, loading, errorMsg, load } = useLoadList(
    useCallback((force?: boolean) => api.getRepos(force), [api])
  )
  const [targets, setTargets] = useState<string[]>(() => getWidgetTargets())
  const [cleared, setCleared] = useState(false)

  const clear = () => {
    setWidgetTargets([])
    setTargets([])
    setCleared(true)
    Widget.reloadAll()
  }

  const countFor = (owner: string, repo: string) =>
    targets.filter(t => t.split('/').filter(Boolean)[0] === owner && t.split('/').filter(Boolean)[1] === repo).length

  return (
    <List
      navigationTitle="小组件设置"
      toolbar={{
        topBarLeading: <Button key="cancel" title="取消" action={dismiss} />,
        topBarTrailing: <Button key="refresh" title="刷新" systemImage="arrow.clockwise" action={() => load(true)} disabled={loading} />,
      }}
    >
      {loading && repos.length === 0 ? <Text>加载中...</Text> : null}
      {errorMsg ? <Text style={{ color: 'red' }}>{errorMsg}</Text> : null}
      {cleared ? <Text style={{ color: '#8e8e93' }}>已清除，桌面小组件显示未指定状态</Text> : null}
      <Section header={<Text style={{ fontWeight: '600', color: '#3c3c43' }}>选择仓库</Text>}>
        {repos.map(r => {
          const count = countFor(r.owner.login, r.name)
          return (
            <Button key={r.id} action={() => onPick(r.owner.login, r.name)}>
              <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
                <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: r.private ? '#fdf0dc' : '#e8f2fe' }}>
                  <Image systemName={r.private ? 'lock.fill' : 'globe.americas.fill'} width={18} height={18} foregroundStyle={r.private ? '#b54708' : '#175cd3'} />
                </VStack>
                <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>{r.full_name}</Text>
                  <Text style={{ fontSize: 12, color: count > 0 ? '#0a84ff' : '#8e8e93' }}>
                    {count > 0 ? `已选 ${count} 个工作流` : '默认分支: ' + r.default_branch}
                  </Text>
                </VStack>
                {count > 0 ? (
                  <Image systemName="checkmark.circle.fill" width={20} height={20} foregroundStyle="#0a84ff" />
                ) : null}
              </HStack>
            </Button>
          )
        })}
        <Button action={clear}>
          <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
            <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fdecec' }}>
              <Image systemName="trash" width={18} height={18} foregroundStyle="#ff3b30" />
            </VStack>
            <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>清除设置</Text>
              <Text style={{ fontSize: 12, color: '#8e8e93' }}>不指定工作流，小组件显示默认状态</Text>
            </VStack>
          </HStack>
        </Button>
      </Section>
    </List>
  )
}

function WidgetWorkflowList({ api, owner, repo, onBack }: { api: GitHubAPI; owner: string; repo: string; onBack: () => void }) {
  const dismiss = Navigation.useDismiss()
  const { data: workflows, loading, errorMsg, load } = useLoadList(
    useCallback((force?: boolean) => api.getWorkflows(owner, repo, force), [api, owner, repo])
  )
  const [targets, setTargets] = useState<string[]>(() => getWidgetTargets())
  const [saved, setSaved] = useState(false)
  const [cleared, setCleared] = useState(false)

  const toggle = (wf: Workflow) => {
    const target = `${owner}/${repo}/${wf.id}`
    const next = targets.includes(target)
      ? targets.filter(t => t !== target)
      : [...targets, target]
    setWidgetTargets(next)
    setTargets(next)
    setSaved(true)
    setCleared(false)
    Widget.reloadAll()
  }

  const clear = () => {
    setWidgetTargets([])
    setTargets([])
    setSaved(false)
    setCleared(true)
    Widget.reloadAll()
  }

  return (
    <List
      navigationTitle={repo}
      toolbar={{
        topBarTrailing: <Button key="refresh" title="刷新" systemImage="arrow.clockwise" action={() => load(true)} disabled={loading} />,
      }}
    >
      <Button action={onBack}>
        <HStack spacing={8} style={{ paddingVertical: 6 }}>
          <Image systemName="chevron.left" width={16} height={16} foregroundStyle="#0a84ff" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#0a84ff' }}>返回仓库列表</Text>
        </HStack>
      </Button>
      {loading && workflows.length === 0 ? <Text>加载中...</Text> : null}
      {errorMsg ? <Text style={{ color: 'red' }}>{errorMsg}</Text> : null}
      {saved ? <Text style={{ color: '#34c759' }}>已更新：小组件将显示 {targets.length} 个工作流</Text> : null}
      {cleared ? <Text style={{ color: '#8e8e93' }}>已清除，桌面小组件显示未指定状态</Text> : null}
      <Section header={<Text style={{ fontWeight: '600', color: '#3c3c43' }}>选择显示在小组件的工作流（可多选）</Text>}>
        {workflows.map(wf => {
          const target = `${owner}/${repo}/${wf.id}`
          const isSelected = targets.includes(target)
          return (
            <Button key={wf.id} action={() => toggle(wf)}>
              <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
                <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isSelected ? '#dbeafe' : '#e8f2fe' }}>
                  <Image systemName="bolt.fill" width={18} height={18} foregroundStyle={isSelected ? '#175cd3' : '#175cd3'} />
                </VStack>
                <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: isSelected ? '#0a84ff' : '#1c1c1e' }}>{wf.name}</Text>
                  <Text style={{ fontSize: 12, color: '#8e8e93' }}>{wf.path}</Text>
                </VStack>
                {isSelected ? (
                  <Image systemName="checkmark.circle.fill" width={22} height={22} foregroundStyle="#0a84ff" />
                ) : null}
              </HStack>
            </Button>
          )
        })}
        <Button action={clear}>
          <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
            <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fdecec' }}>
              <Image systemName="trash" width={18} height={18} foregroundStyle="#ff3b30" />
            </VStack>
            <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ff3b30' }}>清除设置</Text>
              <Text style={{ fontSize: 12, color: '#8e8e93' }}>不指定工作流，小组件显示默认状态</Text>
            </VStack>
          </HStack>
        </Button>
      </Section>
    </List>
  )
}

function WorkflowListPage({
  api,
  owner,
  repo,
  defaultBranch,
}: {
  api: GitHubAPI
  owner: string
  repo: string
  defaultBranch: string
}) {
  const { data: workflows, loading, errorMsg, load } = useLoadList(
    useCallback((force?: boolean) => api.getWorkflows(owner, repo, force), [api, owner, repo])
  )
  // 勾选的工作流 id
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  // 批量操作后本地立即修正的状态（GitHub 状态更新有短暂延迟，先用本地值显示，强刷后以服务端为准）
  const [stateOverrides, setStateOverrides] = useState<Record<number, Workflow['state']>>({})
  const [applying, setApplying] = useState(false)

  const visibleState = (wf: Workflow): Workflow['state'] => stateOverrides[wf.id] ?? wf.state

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }, [])

  // 可勾选 = 未删除的工作流
  const allSelectable = workflows.filter(w => visibleState(w) !== 'deleted')
  const allSelected = allSelectable.length > 0 && allSelectable.every(w => selectedIds.includes(w.id))

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (allSelectable.length > 0 && allSelectable.every(w => prev.includes(w.id))) return []
      return allSelectable.map(w => w.id)
    })
  }, [allSelectable])

  // 批量启用/禁用：逐个调用，幂等处理「目标状态已满足」的 403；成功后本地修正状态并强刷列表。
  const runBatch = useCallback(async (enable: boolean) => {
    const ids = selectedIds
    if (ids.length === 0) return
    setApplying(true)
    let okCount = 0
    let failMsg = ''
    try {
      for (const id of ids) {
        try {
          if (enable) {
            await api.enableWorkflow(owner, repo, id)
          } else {
            await api.disableWorkflow(owner, repo, id)
          }
          okCount++
        } catch (err: any) {
          const msg = errorMessage(err, '')
          const stateAlreadyMet =
            msg.includes('Unable to enable a workflow that is not disabled') ||
            msg.includes('Unable to disable a workflow that is not active')
          if (stateAlreadyMet) {
            okCount++
          } else {
            failMsg = failMsg || errorMessage(err, '未知错误')
          }
        }
      }
      // 本地立即修正状态，避免服务端延迟导致显示旧状态
      const nextOverrides: Record<number, Workflow['state']> = { ...stateOverrides }
      for (const id of ids) nextOverrides[id] = enable ? 'active' : 'disabled'
      setStateOverrides(nextOverrides)
      setSelectedIds([])
      // 强刷：立即 + 延迟各一次，确保与服务端最终一致
      await load(true)
      setTimeout(() => void load(true), 1200)
      if (failMsg) {
        await Dialog.alert({ title: '部分失败', message: `成功 ${okCount} 个，失败：${failMsg}` })
      }
    } catch (err: any) {
      await Dialog.alert({ title: '操作失败', message: errorMessage(err, '未知错误') })
    } finally {
      setApplying(false)
    }
  }, [api, selectedIds, stateOverrides, load])

  return (
    <List
      navigationTitle="工作流"
      toolbar={{
        topBarLeading: [
          <Button key="select-all" title={allSelected ? '取消全选' : '全选'} action={toggleAll} disabled={allSelectable.length === 0 || applying} />,
        ],
        topBarTrailing: [
          <Button key="enable" title="启用" systemImage="play.fill" action={() => void runBatch(true)} disabled={selectedIds.length === 0 || applying} />,
          <Button key="disable" title="禁用" systemImage="pause.fill" action={() => void runBatch(false)} disabled={selectedIds.length === 0 || applying} />,
          <Button key="refresh" title="刷新" systemImage="arrow.clockwise" action={() => load(true)} disabled={loading} />,
        ],
      }}
    >
      {loading && workflows.length === 0 ? <Text>加载中...</Text> : null}
      {errorMsg ? <Text style={{ color: 'red' }}>{errorMsg}</Text> : null}
      {applying ? (
        <HStack spacing={8} padding={{ horizontal: 14, vertical: 10 }}>
          <ProgressView />
          <Text style={{ color: '#0a84ff', fontSize: 13 }}>正在处理 {selectedIds.length} 个工作流...</Text>
        </HStack>
      ) : null}
      <Section header={<Text style={{ fontWeight: '600', color: '#3c3c43' }}>工作流 ({workflows.length}){selectedIds.length ? ` · 已选 ${selectedIds.length}` : ''}</Text>}>
        {workflows.map(wf => {
          const state = visibleState(wf)
          const isSelected = selectedIds.includes(wf.id)
          const stateMeta =
            state === 'deleted'
              ? { text: '已删除', color: '#b42318', backgroundColor: '#fde3e1' }
              : state !== 'active'
                ? { text: '已禁用', color: '#6b7280', backgroundColor: '#eef0f3' }
                : null
          return (
            <HStack key={wf.id} spacing={8} padding={{ horizontal: 14, vertical: 8 }}>
              <Button
                action={() => toggleSelect(wf.id)}
                disabled={state === 'deleted' || applying}
                accessibilityLabel={isSelected ? '取消选择' : '选择'}
              >
                <Image
                  systemName={isSelected ? 'checkmark.circle.fill' : 'circle'}
                  width={22}
                  height={22}
                  foregroundStyle={isSelected ? '#0a84ff' : '#c7c7cc'}
                />
              </Button>
              <NavigationLink
                destination={
                  <RunListPage
                    api={api}
                    owner={owner}
                    repo={repo}
                    workflowId={wf.id}
                    defaultBranch={defaultBranch}
                    workflowState={state}
                  />
                }
                style={{ flex: 1 }}
              >
                <HStack spacing={12}>
                  <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#e8f2fe' }}>
                    <Image systemName="bolt.fill" width={18} height={18} foregroundStyle="#175cd3" />
                  </VStack>
                  <VStack alignment="leading" spacing={4} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>{wf.name}</Text>
                    <Text style={{ fontSize: 12, color: '#8e8e93' }}>{wf.path}</Text>
                  </VStack>
                  {stateMeta ? <StatusBadge text={stateMeta.text} color={stateMeta.color} backgroundColor={stateMeta.backgroundColor} /> : null}
                </HStack>
              </NavigationLink>
            </HStack>
          )
        })}
      </Section>
    </List>
  )
}

function RunListPage({
  api,
  owner,
  repo,
  workflowId,
  defaultBranch,
  workflowState,
}: {
  api: GitHubAPI
  owner: string
  repo: string
  workflowId: number
  defaultBranch: string
  workflowState: string
}) {
  const { data: runs, loading, errorMsg, setErrorMsg, load } = useLoadList(
    useCallback((force?: boolean) => api.getWorkflowRuns(owner, repo, workflowId, force), [api, owner, repo, workflowId])
  )
  const [state, setState] = useState(workflowState)
  const [enabling, setEnabling] = useState(false)
  const [running, setRunning] = useState(false)
  const disabled = state !== 'active'

  const handleRun = useCallback(async () => {
    setRunning(true)
    setErrorMsg('⏳ 正在触发工作流...')
    try {
      await api.dispatchWorkflow(owner, repo, workflowId, defaultBranch, {})
      recordWidgetTrigger(owner, repo, workflowId)
      setErrorMsg('✅ 已触发运行')
      setTimeout(load, RERUN_REFRESH_DELAY_MS)
      Widget.reloadAll()
    } catch (err: any) {
      setErrorMsg(`❌ 触发失败: ${errorMessage(err, '未知错误')}`)
    } finally {
      setRunning(false)
    }
  }, [api, owner, repo, workflowId, defaultBranch, load, setErrorMsg])

  // 在脚本内一键启用被禁用的工作流
  const handleEnable = useCallback(async () => {
    setEnabling(true)
    try {
      await api.enableWorkflow(owner, repo, workflowId)
      setState('active')
      setErrorMsg('✅ 工作流已启用')
      setTimeout(load, RERUN_REFRESH_DELAY_MS)
      Widget.reloadAll()
    } catch (err: any) {
      setErrorMsg(`❌ 启用失败: ${errorMessage(err, '未知错误')}`)
    } finally {
      setEnabling(false)
    }
  }, [api, owner, repo, workflowId, load, setErrorMsg])

  return (
    <List
      navigationTitle="运行记录"
      toolbar={{
        topBarTrailing: [
          <Button key="run" title={running ? '触发中' : '运行'} systemImage="play.fill" action={handleRun} disabled={disabled || loading || running} />,
          <Button key="refresh" title="刷新" systemImage="arrow.clockwise" action={() => load(true)} disabled={loading} />,
        ],
      }}
    >
      {running ? (
        <HStack spacing={8} padding={{ horizontal: 14, vertical: 10 }}>
          <ProgressView />
          <Text style={{ color: '#0a84ff', fontSize: 13 }}>正在触发工作流...</Text>
        </HStack>
      ) : null}
      {loading && runs.length === 0 ? <Text>加载中...</Text> : null}
      {errorMsg ? <Text style={{ color: 'red' }}>{errorMsg}</Text> : null}
      {disabled ? (
        <HStack spacing={8} padding={{ horizontal: 14, vertical: 10 }}>
          <Text style={{ color: '#b54708', fontSize: 13, flex: 1 }}>
            {state === 'deleted' ? '该工作流已删除，无法触发' : '该工作流已禁用，触发前需先启用'}
          </Text>
          {state !== 'deleted' ? (
            <Button title={enabling ? '启用中...' : '启用工作流'} action={handleEnable} disabled={enabling} />
          ) : null}
        </HStack>
      ) : null}
      <Section header={<Text>运行记录 ({runs.length})</Text>}>
        {runs.map(run => {
          const icon = runStatusIcon(run)
          return (
            <NavigationLink
              key={run.id}
              destination={<RunDetailPage api={api} owner={owner} repo={repo} run={run} />}
            >
              <VStack spacing={4} padding={{ horizontal: 14, vertical: 8 }} alignment="leading">
                <HStack spacing={8} alignment="center">
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1c1c1e' }}>#{run.run_number}</Text>
                  <Text style={{ fontSize: 13, color: '#3c3c43' }}>{run.head_branch}</Text>
                  <Image systemName={icon.systemName} width={16} height={16} foregroundStyle={icon.color} />
                </HStack>
                <HStack spacing={8}>
                  <Text style={{ fontSize: 12, color: '#8e8e93' }}>{run.event}</Text>
                  <Text style={{ fontSize: 12, color: '#8e8e93' }}>· {new Date(run.updated_at).toLocaleString()}</Text>
                </HStack>
              </VStack>
            </NavigationLink>
          )
        })}
      </Section>
    </List>
  )
}

function RunDetailPage({
  api,
  owner,
  repo,
  run: initialRun,
}: {
  api: GitHubAPI
  owner: string
  repo: string
  run: Run
}) {
  const [run] = useState(initialRun)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState('')

  // 任务日志：force=true 绕缓存（轮询/手动刷新），false 用缓存秒开（历史数据永久缓存）。
  // showLoading 控制是否显示加载指示：首次/手动刷新显示，缓存命中与后台轮询静默，避免闪加载。
  const loadJobs = useCallback(async (force: boolean, showLoading = force) => {
    if (showLoading) setJobsLoading(true)
    try {
      const data = await api.getRunJobs(owner, repo, run.id, force)
      setJobs(data)
      setJobsError('')
    } catch (err: any) {
      setJobsError(errorMessage(err, '任务加载失败'))
    } finally {
      setJobsLoading(false)
    }
  }, [api, owner, repo, run.id])

  useEffect(() => {
    // 首次进入用缓存（秒开，不闪加载）；运行中每 10s 静默拉最新
    void loadJobs(false, false)
    let timer: ReturnType<typeof setInterval> | null = null
    if (run.status !== 'completed') {
      timer = setInterval(() => loadJobs(true, false), 10000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [loadJobs, run.status])

  const info = runStatusInfo(run)
  const isRunDone = run.status === 'completed'
  const runDuration = durationText(run.run_started_at, run.completed_at)
  const liveDuration =
    !isRunDone && run.run_started_at ? durationText(run.run_started_at, new Date().toISOString()) : null
  const completedText = isRunDone ? formatTime(run.completed_at) : run.status === 'in_progress' ? '进行中' : '排队中'
  const completedSubtitle = run.completed_at ? timeAgoText(run.completed_at) : null
  const durationDisplay = runDuration || (liveDuration ? `已运行 ${liveDuration}` : '—')
  const repoFull = run.repository?.full_name || `${owner}/${repo}`
  const commitAuthor = run.head_commit?.author?.name || run.head_commit?.committer?.name
  const triggeringActor =
    run.triggering_actor && run.triggering_actor.login !== run.actor.login
      ? run.triggering_actor.login
      : null
  const prCount = run.pull_requests?.length || 0
  const sha = run.head_sha?.slice(0, 7) || ''

  return (
    <ScrollView>
      <VStack padding={14} spacing={10} alignment="leading">
        <HStack spacing={8} alignment="center">
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#3c3c43' }}>任务日志（历史数据已缓存，可手动刷新）</Text>
          <Spacer />
          {jobsLoading ? <ProgressView /> : null}
          <Button title="刷新" systemImage="arrow.clockwise" action={() => void loadJobs(true, true)} disabled={jobsLoading} />
        </HStack>
        <Card>
          <HStack spacing={10} alignment="center">
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1c1c1e' }}>运行 #{run.run_number}</Text>
            <StatusBadge text={info.text} color={info.color} backgroundColor={info.backgroundColor} />
          </HStack>
          {run.display_title ? (
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#3c3c43' }} numberOfLines={1}>{run.display_title}</Text>
          ) : null}
          <HStack spacing={8} alignment="center">
            <Image systemName="arrow.triangle.branch" width={14} height={14} foregroundStyle="#8e8e93" />
            <Text style={{ fontSize: 14, color: '#3c3c43' }}>{run.head_branch || '未知分支'}</Text>
            {sha ? <Text style={{ fontSize: 13, fontFamily: 'monospace', color: '#6e7781' }}>{sha}</Text> : null}
          </HStack>
          {run.head_commit?.message ? (
            <Text style={{ fontSize: 13, color: '#6e7781' }} numberOfLines={1}>{run.head_commit.message}</Text>
          ) : null}
          {commitAuthor ? (
            <HStack spacing={8} alignment="center">
              <Image systemName="person.crop.circle" width={13} height={13} foregroundStyle="#8e8e93" />
              <Text style={{ fontSize: 13, color: '#8e8e93' }}>{commitAuthor}</Text>
              {run.head_commit?.timestamp ? (
                <Text style={{ fontSize: 13, color: '#8e8e93' }}>· {timeAgoText(run.head_commit.timestamp) || formatShortTime(run.head_commit.timestamp)}</Text>
              ) : null}
            </HStack>
          ) : null}
          <HStack spacing={8}>
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>{run.event}</Text>
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>· {run.actor.login}</Text>
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>· 第 {run.run_attempt} 次尝试</Text>
          </HStack>
        </Card>

        <Card>
          <HStack spacing={6} alignment="center">
            <Image systemName="info.circle" width={14} height={14} foregroundStyle="#8e8e93" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8e8e93' }}>概览</Text>
          </HStack>
          <InfoRow label="仓库" value={repoFull} />
          {run.repository?.default_branch ? <InfoRow label="默认分支" value={run.repository.default_branch} /> : null}
          <InfoRow label="工作流" value={run.name || String(run.workflow_id)} />
          {run.path ? <InfoRow label="文件" value={run.path} /> : null}
          <InfoRow label="触发者" value={run.actor.login} />
          {triggeringActor ? <InfoRow label="实际触发" value={triggeringActor} /> : null}
          {run.check_suite_id ? <InfoRow label="Check Suite" value={`#${run.check_suite_id}`} /> : null}
          {prCount > 0 ? (
            <InfoRow label="关联 PR" value={run.pull_requests!.map((pr) => `#${pr.number}`).join(', ')} />
          ) : null}
        </Card>

        <Card>
          <HStack spacing={6} alignment="center">
            <Image systemName="clock" width={14} height={14} foregroundStyle="#8e8e93" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8e8e93' }}>时间</Text>
          </HStack>
          <InfoRow label="创建" value={formatTime(run.created_at)} subtitle={timeAgoText(run.created_at)} />
          <InfoRow label="开始" value={formatTime(run.run_started_at)} subtitle={timeAgoText(run.run_started_at)} />
          <InfoRow label="完成" value={completedText} subtitle={completedSubtitle} />
          <InfoRow label="耗时" value={durationDisplay} />
          <InfoRow label="更新" value={formatTime(run.updated_at)} subtitle={timeAgoText(run.updated_at)} />
        </Card>

        <Card>
          <HStack spacing={6} alignment="center">
            <Image systemName="list.bullet.rectangle" width={14} height={14} foregroundStyle="#8e8e93" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#8e8e93' }}>任务 ({jobs.length})</Text>
          </HStack>
          {jobsLoading && jobs.length === 0 ? <Text style={{ fontSize: 13, color: '#8e8e93' }}>加载中...</Text> : null}
          {jobsError ? <Text style={{ fontSize: 13, color: '#b42318' }}>{jobsError}</Text> : null}
          {!jobsLoading && !jobsError && jobs.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#8e8e93' }}>暂无任务</Text>
          ) : null}
          {jobs.map((job, idx) => {
            const j = jobStatusInfo(job)
            const icon = jobStatusIcon(job)
            const jobDuration = durationText(job.started_at, job.completed_at || undefined)
            const runner = job.runner_name || (job.labels && job.labels.length ? job.labels.join(' / ') : null)
            return (
              <VStack key={job.id} alignment="leading" spacing={5}>
                <HStack spacing={8} alignment="center">
                  <Image systemName={icon.systemName} width={14} height={14} foregroundStyle={icon.color} />
                  <VStack alignment="leading" spacing={2} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1c1c1e' }}>{job.name}</Text>
                    <Text style={{ fontSize: 12, color: '#8e8e93' }}>
                      {j.text}{jobDuration ? ` · ${jobDuration}` : ''}{runner ? ` · ${runner}` : ''}
                    </Text>
                  </VStack>
                </HStack>
                {job.steps && job.steps.length > 0 ? (
                  <VStack alignment="leading" spacing={3}>
                    {job.steps.map((step) => {
                      const s = jobStatusInfo(step)
                      const sIcon = jobStatusIcon(step)
                      const stepDuration = durationText(step.started_at, step.completed_at || undefined)
                      return (
                        <HStack key={step.number} spacing={6} alignment="center">
                          <Text style={{ fontSize: 11, color: '#8e8e93' }}>{step.number}.</Text>
                          <Image systemName={sIcon.systemName} width={12} height={12} foregroundStyle={sIcon.color} />
                          <Text style={{ fontSize: 12, color: '#3c3c43', flex: 1 }} numberOfLines={1}>{step.name}</Text>
                          <Text style={{ fontSize: 11, color: '#8e8e93' }}>
                            {s.text}{stepDuration ? ` · ${stepDuration}` : ''}
                          </Text>
                        </HStack>
                      )
                    })}
                  </VStack>
                ) : null}
                {idx < jobs.length - 1 ? (
                  <HStack style={{ height: 1, backgroundColor: '#e5e7eb' }} frame={{ maxWidth: 'infinity' }} />
                ) : null}
              </VStack>
            )
          })}
        </Card>
      </VStack>
    </ScrollView>
  )
}

export function ActionsRoot() {
  const [auth, setAuth] = useState<{ token: string; username: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setAuth(getStoredAuth())
    setLoading(false)
  }, [])

  const refreshAuth = () => setAuth(getStoredAuth())

  const handleLogin = (authData: { token: string; username: string }) => {
    setAuth(authData)
  }

  // 切换账户：更新激活档案后刷新 auth
  const handleSwitchAccount = (id: string) => {
    if (setActiveProfile(id)) refreshAuth()
  }

  // 添加账号：弹出登录页（可切换已有账户或绑定新账号）
  const handleAddAccount = async () => {
    await Navigation.present({
      element: <LoginPage onLogin={handleLogin} />,
      modalPresentationStyle: 'pageSheet',
    })
    refreshAuth()
  }

  // 退出当前账号：删除档案（含 Keychain token），回到登录页
  const handleLogout = () => {
    if (auth) {
      const p = listProfiles().find((x) => x.username === auth.username)
      if (p) removeProfile(p.id)
    }
    storageRemove('widget_repo')
    storageRemove('widget_repos')
    refreshAuth()
  }

  if (loading) return <Text>加载中...</Text>
  if (!auth) return <LoginPage onLogin={handleLogin} />

  const api = new GitHubAPI(auth)

  return (
    <NavigationStack>
      <RepoListPage
        api={api}
        username={auth.username}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => void handleAddAccount()}
      />
    </NavigationStack>
  )
}

