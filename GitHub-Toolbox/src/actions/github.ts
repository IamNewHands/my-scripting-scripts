export interface WidgetTarget {
  owner: string
  repo: string
  workflowId?: number
  branch: string
}

export interface RunLite {
  id: number
  run_number: number
  status: string
  conclusion: string | null
  created_at: string
  event: string
}

// ===== 数据缓存（TTL，Storage 存 { ts, data }）=====
const CACHE_PREFIX = 'gh_cache_v1_'
const CACHE_INDEX_KEY = 'gh_cache_v1__index'

function cacheIndex(): string[] {
  const idx = Storage.get<string[]>(CACHE_INDEX_KEY)
  return Array.isArray(idx) ? idx : []
}

export function cacheSet(key: string, data: unknown): void {
  Storage.set(key, { ts: Date.now(), data })
  const idx = cacheIndex()
  if (!idx.includes(key)) {
    idx.push(key)
    Storage.set(CACHE_INDEX_KEY, idx)
  }
}

export function cacheGet<T>(key: string, ttlSec?: number): T | null {
  const raw = Storage.get<{ ts: number; data: T }>(key)
  if (!raw || typeof raw.ts !== 'number') return null
  // ttlSec 不传或 ≤0 = 永久缓存（打开直接显示留存数据，手动刷新才更新）
  if (ttlSec && ttlSec > 0 && Date.now() - raw.ts > ttlSec * 1000) return null
  return raw.data ?? null
}

// 按路径前缀清除缓存（触发/重跑/取消后调用）
export function cacheClearPrefix(prefix: string): void {
  const idx = cacheIndex()
  const keep: string[] = []
  for (const k of idx) {
    if (k.startsWith(prefix)) {
      Storage.remove(k)
    } else {
      keep.push(k)
    }
  }
  Storage.set(CACHE_INDEX_KEY, keep)
}

// ===== 多账户（元数据存 Storage，token 存 Keychain）=====
const PROFILES_KEY = 'gh_profiles_v1'
const LEGACY_USERNAME_KEY = 'github_username'
const LEGACY_TOKEN_KEY = 'github_token'

export interface ProfileMeta {
  id: string
  name: string
  username: string
}

interface ProfilesState {
  activeId: string | null
  profiles: ProfileMeta[]
}

function tokenKey(id: string): string {
  return `gh_token_${id}`
}

function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readProfiles(): ProfilesState {
  const raw = Storage.get<ProfilesState>(PROFILES_KEY)
  if (raw && Array.isArray(raw.profiles)) {
    return {
      activeId: raw.activeId ?? null,
      profiles: raw.profiles.filter((p) => p && typeof p.id === 'string' && typeof p.username === 'string'),
    }
  }
  return { activeId: null, profiles: [] }
}

function writeProfiles(state: ProfilesState): void {
  Storage.set(PROFILES_KEY, { activeId: state.activeId, profiles: state.profiles })
}

export function listProfiles(): ProfileMeta[] {
  return readProfiles().profiles.slice()
}

export function getStoredAuth(): { token: string; username: string } | null {
  const state = readProfiles()
  if (state.activeId) {
    const p = state.profiles.find((x) => x.id === state.activeId)
    if (p) {
      const token = Keychain.get(tokenKey(p.id))
      if (token) return { username: p.username, token }
    }
  }
  // 旧版单账户明文迁移为默认档案（一次性）
  const legacyUser = Storage.get<string>(LEGACY_USERNAME_KEY)
  const legacyToken = Storage.get<string>(LEGACY_TOKEN_KEY)
  if (legacyUser && legacyToken) {
    const id = newId()
    Keychain.set(tokenKey(id), legacyToken)
    writeProfiles({ activeId: id, profiles: [{ id, name: legacyUser, username: legacyUser }] })
    Storage.remove(LEGACY_USERNAME_KEY)
    Storage.remove(LEGACY_TOKEN_KEY)
    return { username: legacyUser, token: legacyToken }
  }
  return null
}

// 绑定账号：同名用户名更新 token 并激活，否则新增档案
export function addProfile(username: string, token: string): ProfileMeta {
  const state = readProfiles()
  const existing = state.profiles.find((p) => p.username === username)
  if (existing) {
    Keychain.set(tokenKey(existing.id), token)
    writeProfiles({ activeId: existing.id, profiles: state.profiles })
    return existing
  }
  const p: ProfileMeta = { id: newId(), name: username, username }
  Keychain.set(tokenKey(p.id), token)
  writeProfiles({ activeId: p.id, profiles: [...state.profiles, p] })
  return p
}

export function setActiveProfile(id: string): boolean {
  const state = readProfiles()
  if (!state.profiles.some((p) => p.id === id)) return false
  writeProfiles({ activeId: id, profiles: state.profiles })
  return true
}

// 删除档案（含 Keychain token），激活位落到下一个或空
export function removeProfile(id: string): void {
  const state = readProfiles()
  const next = state.profiles.filter((p) => p.id !== id)
  Keychain.remove(tokenKey(id))
  const activeId = state.activeId === id ? next[0]?.id ?? null : state.activeId
  writeProfiles({ activeId, profiles: next })
}

export async function ghRequest<T>(
  path: string,
  token: string,
  options?: { method?: string; body?: string; cacheTtlSec?: number; force?: boolean }
): Promise<T> {
  const cacheKey = options?.cacheTtlSec != null ? `${CACHE_PREFIX}${path}` : null
  if (options?.cacheTtlSec != null && !options?.force) {
    const hit = cacheGet<T>(cacheKey!, options.cacheTtlSec)
    if (hit !== null) return hit
  }
  const resp = await fetch(`https://api.github.com${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: options?.body,
  })
  if (!resp.ok) throw new Error(`GitHub API error (${resp.status})`)
  const text = await resp.text()
  if (!text) return undefined as T
  const data = JSON.parse(text) as T
  if (options?.cacheTtlSec != null) cacheSet(cacheKey!, data)
  return data
}

export function parseTarget(param: string): { owner: string; repo: string; workflowRef?: string } {
  const parts = (param || '').split('/').filter(Boolean)
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1], workflowRef: parts[2] }
  }
  return { owner: '', repo: '' }
}

export function getWidgetTargets(): string[] {
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

export function setWidgetTargets(targets: string[]) {
  const clean = targets.filter((t) => t.split('/').filter(Boolean).length >= 2)
  if (clean.length === 0) {
    Storage.remove('widget_repos')
    Storage.remove('widget_repo')
    return
  }
  Storage.set('widget_repos', JSON.stringify(clean))
  Storage.remove('widget_repo')
}

export function recordWidgetTrigger(owner: string, repo: string, workflowId: number) {
  Storage.set('widget_last_target', `${owner}/${repo}/${workflowId}`)
}

export async function fetchWorkflowInfo(owner: string, repo: string, token: string, workflowRef?: string) {
  const repoInfo = await ghRequest<{ default_branch: string }>(
    `/repos/${owner}/${repo}`,
    token,
    { cacheTtlSec: 60 }
  )
  const branch = repoInfo.default_branch || 'main'
  const wfList = await ghRequest<{ workflows: { id: number; name: string; path: string }[] }>(
    `/repos/${owner}/${repo}/actions/workflows`,
    token,
    { cacheTtlSec: 60 }
  )
  let wf = wfList.workflows[0]
  if (workflowRef) {
    wf =
      wfList.workflows.find((w) => String(w.id) === workflowRef) ??
      wfList.workflows.find((w) => w.name === workflowRef) ??
      wfList.workflows.find((w) => w.path.endsWith('/' + workflowRef)) ??
      wf
  }
  return { branch, workflow: wf, all: wfList.workflows }
}

export async function fetchCron(owner: string, repo: string, branch: string, path: string, token: string): Promise<string | null> {
  const cacheKey = `${CACHE_PREFIX}raw:${owner}/${repo}/${branch}/${path}`
  const hit = cacheGet<{ content: string }>(cacheKey, 120)
  if (hit) {
    const crons = extractCron(hit.content)
    return crons
  }
  const resp = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`, {
    headers: { 'Authorization': `token ${token}` },
  })
  if (!resp.ok) return null
  const content = await resp.text()
  cacheSet(cacheKey, { content })
  return extractCron(content)
}

function extractCron(content: string): string | null {
  const lines = content.split('\n').filter((l) => !l.trim().startsWith('#'))
  const crons = lines.join('\n').match(/cron\s*:\s*['"]?([^'"\n#]+)['"]?/gi)
  if (!crons) return null
  return crons.map((c: string) => c.replace(/cron\s*:\s*['"]?/i, '').replace(/['"]\s*$/, '').trim())[0] || null
}

export async function fetchLatestRuns(owner: string, repo: string, workflowId: number, token: string): Promise<RunLite[]> {
  const data = await ghRequest<{ workflow_runs: RunLite[] }>(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=5`,
    token,
    { cacheTtlSec: 30 }
  )
  return data.workflow_runs ?? []
}

interface CronField {
  values: Set<number>
  star: boolean
}

function parseCronField(field: string, min: number, max: number): CronField {
  const values = new Set<number>()
  let star = false
  for (const part of field.split(',')) {
    let range = part
    let step = 1
    if (part.includes('/')) {
      const [r, s] = part.split('/')
      range = r
      step = parseInt(s, 10) || 1
    }
    if (range === '*') {
      star = true
      for (let i = min; i <= max; i += step) values.add(i)
    } else if (range.includes('-')) {
      const [a, b] = range.split('-').map(Number)
      for (let i = a; i <= b; i += step) values.add(i)
    } else {
      const v = parseInt(range, 10)
      if (!isNaN(v)) values.add(v)
    }
  }
  return { values, star }
}

function parseCron(expr: string): { minutes: CronField; hours: CronField; dom: CronField; months: CronField; dow: CronField } | null {
  const fields = expr.trim().split(/\s+/)
  if (fields.length < 5) return null
  return {
    minutes: parseCronField(fields[0], 0, 59),
    hours: parseCronField(fields[1], 0, 23),
    dom: parseCronField(fields[2], 1, 31),
    months: parseCronField(fields[3], 1, 12),
    dow: parseCronField(fields[4], 0, 7),
  }
}

function dayMatches(date: Date, c: NonNullable<ReturnType<typeof parseCron>>): boolean {
  const month = date.getUTCMonth() + 1
  const dom = date.getUTCDate()
  const dow = date.getUTCDay()
  if (!c.months.values.has(month)) return false
  const domOk = c.dom.values.has(dom)
  const dowOk = c.dow.values.has(dow) || (dow === 0 && c.dow.values.has(7))
  const domRestricted = !c.dom.star
  const dowRestricted = !c.dow.star
  return domRestricted && dowRestricted ? domOk || dowOk : domOk && dowOk
}

export function nextCronRun(expr: string, from: Date = new Date()): Date | null {
  const c = parseCron(expr)
  if (!c) return null
  for (let d = 0; d <= 366; d++) {
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + d))
    if (!dayMatches(day, c)) continue
    const minutes = Array.from(c.minutes.values).sort((a, b) => a - b)
    for (let h = 0; h < 24; h++) {
      if (!c.hours.values.has(h)) continue
      for (const m of minutes) {
        const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m, 0, 0))
        if (t.getTime() > from.getTime()) return t
      }
    }
  }
  return null
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

export function runStatusText(run: RunLite): string {
  if (run.status === 'completed') {
    return run.conclusion === 'success' ? '成功' : run.conclusion || '失败'
  }
  if (run.status === 'in_progress') return '运行中'
  if (run.status === 'queued') return '排队中'
  return run.status
}
