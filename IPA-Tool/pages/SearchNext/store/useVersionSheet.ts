import type { AppSearchSuccess } from "../../../types/appStore"

/** 模块级 setter，避免向结果行透传回调导致列表重绘 */
export const openVersionSheet: { current: ((app: AppSearchSuccess) => void) | null } = { current: null }
