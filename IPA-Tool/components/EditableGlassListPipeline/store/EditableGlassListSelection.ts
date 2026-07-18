import type { EditableListEntry } from "../types"

export type SelectionCache<T extends EditableListEntry> = {
  items: T[]
  selectedIds: T["id"][]
  selectedIdSet: Set<T["id"]>
  selectedItems: T[]
}

export class EditableGlassListSelection<T extends EditableListEntry> {
  private selectionCache?: SelectionCache<T>

  constructor(
    private itemsState: Observable<T[]>,
    private selectedIdsState: Observable<T["id"][]>
  ) {}

  get ids() {
    return this.selectedIdsState.value
  }

  get items() {
    return this.getSelectionCache().selectedItems
  }

  get idSet() {
    return this.getSelectionCache().selectedIdSet
  }

  /** 缓存选中派生数据，同一份 items/selectedIds 引用只计算一次。 */
  private getSelectionCache() {
    const items = this.itemsState.value
    const selectedIds = this.selectedIdsState.value

    if (this.selectionCache?.items === items && this.selectionCache.selectedIds === selectedIds) {
      return this.selectionCache
    }

    const selectedIdSet = new Set(selectedIds)
    const selectedItems = items.filter(item => selectedIdSet.has(item.id))

    this.selectionCache = {
      items,
      selectedIds,
      selectedIdSet,
      selectedItems,
    }

    return this.selectionCache
  }

  select(id: T["id"]) {
    if (this.selectedIdsState.value.includes(id)) return
    this.selectedIdsState.setValue([...this.selectedIdsState.value, id])
  }

  deselect(id: T["id"]) {
    this.selectedIdsState.setValue(this.selectedIdsState.value.filter(selectedId => selectedId !== id))
  }

  selectAll() {
    this.selectedIdsState.setValue(this.itemsState.value.map(item => item.id))
  }

  clear() {
    this.selectedIdsState.setValue([])
  }
}
