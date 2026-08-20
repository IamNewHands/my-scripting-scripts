import { fetch } from "scripting"
import type { GitHubRepository } from "./types"

const TOKEN_KEY = "github-star.access-token"
const API_URL = "https://api.github.com/user/starred"

type GitHubStarredRepository = {
  starred_at?: string
  repo: GitHubApiRepository
}

type GitHubApiRepository = {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  pushed_at: string | null
  updated_at: string
  owner: {
    login: string
    avatar_url: string
  }
}

type GitHubApiStarredRepository = GitHubApiRepository & {
  starred_at: string | null
}

type GitHubError = {
  message?: string
}

export function hasGitHubToken(): boolean {
  return Boolean(Keychain.get(TOKEN_KEY)?.trim())
}

export function saveGitHubToken(token: string): boolean {
  return Keychain.set(TOKEN_KEY, token.trim(), {
    accessibility: "unlocked_this_device",
  })
}

export function removeGitHubToken(): boolean {
  return Keychain.remove(TOKEN_KEY)
}

export async function fetchStarredRepositories(): Promise<GitHubRepository[]> {
  const token = Keychain.get(TOKEN_KEY)?.trim()
  if (!token) {
    throw new Error("请先在设置中保存 GitHub Personal Access Token。")
  }

  const repositories: GitHubApiStarredRepository[] = []
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${API_URL}?per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github.star+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as GitHubError
      if (response.status === 401) {
        throw new Error("Token 无效或已过期，请在设置中更新。")
      }
      if (response.status === 403) {
        throw new Error("GitHub 暂时拒绝请求。请确认 Token 有读取 Star 的权限后稍后重试。")
      }
      throw new Error(payload.message ?? `GitHub 请求失败（${response.status}）。`)
    }

    const batch = (await response.json()) as GitHubStarredRepository[]
    repositories.push(...batch.map(starred => ({
      ...starred.repo,
      starred_at: starred.starred_at ?? null,
    })))
    if (batch.length < 100) break
  }

  return repositories
    .map(repository => ({
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      htmlUrl: repository.html_url,
      language: repository.language,
      stargazersCount: repository.stargazers_count,
      forksCount: repository.forks_count,
      pushedAt: repository.pushed_at,
      starredAt: repository.starred_at ?? null,
      updatedAt: repository.updated_at,
      owner: {
        login: repository.owner.login,
        avatarUrl: `${repository.owner.avatar_url}${repository.owner.avatar_url.includes("?") ? "&" : "?"}s=96`,
      },
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.pushedAt ?? left.updatedAt).getTime()
      const rightTime = new Date(right.pushedAt ?? right.updatedAt).getTime()
      return rightTime - leftTime
    })
}
