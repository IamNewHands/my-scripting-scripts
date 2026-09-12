import type { AppSearchResponse } from "../../../types/appStore"
import { isAppSearchSuccess } from "../../../types/appStore"
import type { EditableListEntry } from "../../../components/EditableGlassListPipeline"

export const SEARCH_RESULT_TYPE = "result"
export const SEARCH_SKELETON_TYPE = "skeleton"

export type SearchResultEntry = EditableListEntry & (
  | {
    type: typeof SEARCH_RESULT_TYPE
    app: AppSearchResponse
  }
  | {
    type: typeof SEARCH_SKELETON_TYPE
  }
)

export const DEFAULT_SEARCH_COUNT = 10
export type SearchEntity =
  | "software"
  | "iPadSoftware"
  | "desktopSoftware"
  | "software,tvSoftware"
export const DEFAULT_SEARCH_ENTITY: SearchEntity = "software"
export const TV_SEARCH_ENTITY: SearchEntity = "software,tvSoftware"
export const isTvSearchEntity = (entity: SearchEntity) => entity === TV_SEARCH_ENTITY
export const DEFAULT_IS_TV = isTvSearchEntity(DEFAULT_SEARCH_ENTITY)
export const MAX_ANIMATED_SKELETONS = 9
export const MAX_SKELETON_COUNT = 30
export const SKELETON_INTERVAL_MS = 100

export type SearchQuery =
  | { type: "keyword"; term: string }
  | { type: "appId"; appId: string }
  | { type: "appId + versionId"; appId: string; versionId: string }

export const parseSearchQuery = (query: string): SearchQuery => {
  const value = query.trim()
  const parts = value.split("/").map(item => item.trim())

  if (parts.length === 1 && /^\d{8,}$/.test(parts[0])) {
    return { type: "appId", appId: parts[0] }
  }

  if (
    parts.length === 2 &&
    /^\d{8,}$/.test(parts[0]) &&
    /^\d+$/.test(parts[1])
  ) {
    return { type: "appId + versionId", appId: parts[0], versionId: parts[1] }
  }

  return { type: "keyword", term: value }
}

export const createErrorResult = (description: string): AppSearchResponse[] => [
  {
    name: "未找到应用",
    description,
  },
]

export const toResultEntries = (apps: AppSearchResponse[]): SearchResultEntry[] => {
  return apps.map((app, index) => ({
    id: isAppSearchSuccess(app) ? String(app.id) : `error-${index}`,
    type: SEARCH_RESULT_TYPE,
    app,
  }))
}

export const createLoadingEntries = (token: string, count = DEFAULT_SEARCH_COUNT): SearchResultEntry[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `loading-${token}-${index}`,
    type: SEARCH_SKELETON_TYPE,
  }))
}

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
  ) {
    return (error as { errors: Error[] }).errors.map(item => item.message).join(", ")
  }
  return "请检查搜索内容是否正确"
}

/** 监听键盘弹起立即关闭，键盘收起后自行移除监听 */
export const blockKeyboardOnce = () => {

  if (Keyboard.visible) {
    setTimeout(() => Keyboard.hide(), 0)
    return
  }

  const listener = (visible: boolean) => {
    if (visible) {
      setTimeout(() => Keyboard.hide(), 700)
    } else {
      Keyboard.removeVisibilityListener(listener)
    }
  }

  Keyboard.addVisibilityListener(listener)
}
