import type { VirtualNode } from "scripting"
import type { EditableListEntry } from "../types"

export const defaultType = "default"

export const getItemType = <T extends EditableListEntry>(item: T) => item.type ?? defaultType

export const normalizeNodes = (node: VirtualNode | VirtualNode[] | undefined) => {
  if (!node) return []
  return Array.isArray(node) ? node : [node]
}

export const uniqueItemsById = <T extends EditableListEntry>(items: T[]) => {
  const ids = new Set<T["id"]>()

  return items.filter(item => {
    if (ids.has(item.id)) return false
    ids.add(item.id)
    return true
  })
}

export const isSameItems = <T extends EditableListEntry>(left: T[], right: T[]) => {
  return left.length === right.length && left.every((item, index) => item === right[index])
}
