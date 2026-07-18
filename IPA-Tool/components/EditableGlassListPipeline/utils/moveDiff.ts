import type { EditableListEntry } from "../types"

export type MoveDiff<T extends EditableListEntry> = {
  item: T
  fromIndex: number
  toIndex: number
}

/**
 * 只比较两组数组，识别一次 move。
 *
 * 调用方必须先保证：
 * - 两组数组长度相同
 * - 两组数组 id 集合相同
 * - 本次变化确实需要做排序 diff
 */
export const resolveMoveDiff = <T extends EditableListEntry>(previousItems: T[], nextItems: T[]): MoveDiff<T> | undefined => {
  let firstChangedIndex = -1
  let lastChangedIndex = -1

  for (let index = 0; index < previousItems.length; index += 1) {
    if (previousItems[index].id === nextItems[index].id) continue

    if (firstChangedIndex === -1) firstChangedIndex = index
    lastChangedIndex = index
  }

  if (firstChangedIndex === -1) return undefined

  if (previousItems[firstChangedIndex].id === nextItems[lastChangedIndex].id) {
    return {
      item: previousItems[firstChangedIndex],
      fromIndex: firstChangedIndex,
      toIndex: lastChangedIndex,
    }
  }

  if (previousItems[lastChangedIndex].id === nextItems[firstChangedIndex].id) {
    return {
      item: previousItems[lastChangedIndex],
      fromIndex: lastChangedIndex,
      toIndex: firstChangedIndex,
    }
  }

  return undefined
}
