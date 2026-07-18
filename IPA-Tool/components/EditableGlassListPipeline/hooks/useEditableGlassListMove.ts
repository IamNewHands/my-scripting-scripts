import { useEffect, useRef } from "scripting"
import type {
  EditableGlassListOptions,
  EditableListEntry,
  EditableListEntryType,
} from "../types"
import { getItemType } from "../utils/listUtils"
import { resolveMoveDiff } from "../utils/moveDiff"

const getGroupItems = <T extends EditableListEntry>(items: T[], type: EditableListEntryType) => {
  return items.filter(item => getItemType(item) === type)
}

export const useEditableGlassListMove = <T extends EditableListEntry>(
  items: Observable<T[]>,
  options?: EditableGlassListOptions<T>
) => {
  const optionsRef = useRef(options)
  optionsRef.current = options
  // 新增/删除会重新执行组件，原生排序不会；用这个标记区分两种 items 变化来源。
  const isRenderingItemsRef = useRef(true)

  useEffect(() => {
    // 追踪 items.value 对应的组件生命周期：effect 后结束，cleanup 后开始下一轮。
    isRenderingItemsRef.current = false
    return () => isRenderingItemsRef.current = true
  }, [items.value])

  useEffect(() => {
    const handleItemsChange = (nextItems: T[], previousItems: T[]) => {
      const currentOptions = optionsRef.current
      if (isRenderingItemsRef.current) return
      if (!currentOptions?.onMove && !currentOptions?.onGroupMove) return

      const move = resolveMoveDiff(previousItems, nextItems)
      if (!move) return

      currentOptions.onMove?.({
        ...move,
        previousItems,
        items: nextItems,
      })

      if (!currentOptions.onGroupMove) return

      const nextItem = nextItems[move.toIndex]
      const previousType = getItemType(move.item)
      const nextType = getItemType(nextItem)
      if (previousType !== nextType) return

      const previousGroupItems = getGroupItems(previousItems, previousType)
      const groupItems = getGroupItems(nextItems, previousType)
      const groupMove = resolveMoveDiff(previousGroupItems, groupItems)
      if (!groupMove) return

      currentOptions.onGroupMove({
        ...groupMove,
        type: previousType,
        previousItems,
        items: nextItems,
        previousGroupItems,
        groupItems,
      })
    }

    items.subscribe(handleItemsChange)

    return () => {
      items.unsubscribe(handleItemsChange)
    }

  }, [])
}
