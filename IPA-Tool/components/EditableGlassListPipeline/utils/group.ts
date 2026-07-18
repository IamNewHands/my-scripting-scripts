import type {
  EditableListEntry,
  EditableListEntryType,
} from "../types"

/** 给一组列表项补上指定 type；default 分组不写入 type。 */
export const group = <TEntry extends EditableListEntry>(
  type: EditableListEntryType,
  ...items: TEntry[]
): TEntry[] => items.map(item => ({
  ...item,
  ...(type === "default" ? {} : { type }),
}))
