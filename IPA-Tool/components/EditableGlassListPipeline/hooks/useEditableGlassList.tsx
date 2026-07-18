import { useObservable } from "scripting"
import type {
  EditableGlassListOptions,
  EditableListEntry,
} from "../types"
import { EditableGlassListStore } from "../store/EditableGlassListStore"
import { useEditableGlassListMove } from "./useEditableGlassListMove"

const stores = new WeakMap<object, EditableGlassListStore<EditableListEntry>>()

/** 读取已存在的列表状态管道；不创建任何内部 Observable。 */
export const getEditableGlassListStore = <T extends EditableListEntry>(items: Observable<T[]>) =>
  stores.get(items as object) as unknown as EditableGlassListStore<T> | undefined

/** 初始化指定 items 对应的列表状态管道。 */
const useInitEditableGlassListStore = <T extends EditableListEntry>(items: Observable<T[]>) => {
  const selectedIds = useObservable<T["id"][]>([])
  const editMode = useObservable(() => EditMode.inactive())
  const moveEnabled = useObservable(false)
  const existingStore = getEditableGlassListStore(items)

  if (existingStore) return existingStore

  const store = new EditableGlassListStore({ items, selectedIds, editMode, moveEnabled })
  stores.set(items as object, store as unknown as EditableGlassListStore<EditableListEntry>)
  return store
}

/** 在组件内取得列表状态管道；要求 useEditableGlassList 已先完成初始化。 */
export const useEditableGlassListStore = <T extends EditableListEntry>(items: Observable<T[]>) => {
  const store = getEditableGlassListStore<T>(items)
  if (!store) throw new Error("EditableGlassListStore 尚未初始化，请先调用 useEditableGlassList(items)")
  return store
}

/**
 * 取得指定 items 对应的可编辑玻璃列表 API。
 *
 * 同一个 items 会通过 WeakMap 连接 hook 与 EditableGlassList 组件，避免显式传 controller/api。
 */
export const useEditableGlassList = <T extends EditableListEntry>(
  items: Observable<T[]>,
  options?: EditableGlassListOptions<T>
) => {
  const store = useInitEditableGlassListStore(items)
  store.setOptions(options)

  useEditableGlassListMove(items, options)

  return store.toApi()
}

export { triggerSources } from "../utils/triggerSources"
