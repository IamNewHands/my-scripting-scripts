export type GitHubRepository = {
  id: number
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  language: string | null
  stargazersCount: number
  forksCount: number
  pushedAt: string | null
  starredAt: string | null
  updatedAt: string
  owner: {
    login: string
    avatarUrl: string
  }
}

export type LoadState = "idle" | "loading" | "loaded" | "error"
