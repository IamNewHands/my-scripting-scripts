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
export const DEFAULT_SEARCH_TYPE = "software,iPadSoftware"
export const MAX_ANIMATED_SKELETONS = 9
export const MAX_SKELETON_COUNT = 30
export const SKELETON_INTERVAL_MS = 100

export const isAppIdQuery = (query: string) => /^\d{8,}$/.test(query.trim())

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
