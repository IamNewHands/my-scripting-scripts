import type { VirtualNode } from "scripting"
import { Button } from "scripting"
import type {
  EditableGlassListSwipeActions,
  EditableGlassListAddOptions,
  EditableGlassListApi,
  EditableGlassListDeleteContext,
  EditableGlassListOnDelete,
  EditableGlassListOptions,
  EditableGlassListRender,
  EditableGlassListRowPropsPatch,
  EditableGlassListUpdateInput,
  EditableListEntry,
  TriggerSource,
} from "../types"
import { EditableGlassListForEach } from "../rendering/EditableGlassListForEach"
import { withEditableGlassListRowStyle } from "../rendering/EditableGlassListRow"
import { EditableGlassListSelection } from "./EditableGlassListSelection"
import { defaultType, getItemType, isSameItems, normalizeNodes, uniqueItemsById } from "../utils/listUtils"
import { triggerSources } from "../utils/triggerSources"

export type EditableGlassListStoreState<T extends EditableListEntry> = {
  items: Observable<T[]>
  selectedIds: Observable<T["id"][]>
  editMode: Observable<ReturnType<typeof EditMode.inactive>>
  moveEnabled: Observable<boolean>
}

/**
 * 以 items Observable 为 key 的列表状态管道。
 *
 * hook 和 EditableGlassList 只要传入同一个 items，就会拿到同一个 store。
 */
export class EditableGlassListStore<T extends EditableListEntry> {
  private itemsState: Observable<T[]>
  private selectedIdsState: Observable<T["id"][]>
  private editModeState: Observable<ReturnType<typeof EditMode.inactive>>
  private moveEnabledState: Observable<boolean>
  private leadingSwipeActions?: EditableGlassListSwipeActions<T>
  private trailingSwipeActions?: EditableGlassListSwipeActions<T>
  private onDelete?: EditableGlassListOnDelete<T>
  private selection: EditableGlassListSelection<T>

  constructor(state: EditableGlassListStoreState<T>) {
    this.itemsState = state.items
    this.selectedIdsState = state.selectedIds
    this.editModeState = state.editMode
    this.moveEnabledState = state.moveEnabled
    this.selection = new EditableGlassListSelection(state.items, state.selectedIds)
  }

  /** 当前完整列表数据。 */
  get items() {
    return this.itemsState.value
  }

  /** 当前已选中的 id 列表。 */
  get selectedIds() {
    return this.selection.ids
  }

  /** 当前已选中的数据对象列表。 */
  get selectedItems() {
    return this.selection.items
  }

  /** 当前是否处于编辑状态。 */
  get isEditing() {
    return this.editModeState.value.isEditing
  }

  /** 当前是否已开启排序能力。 */
  get isMoveEnabled() {
    return this.moveEnabledState.value
  }

  /** 给 List.selection 使用的 Observable；固定保留，保证编辑态动画完整。 */
  get selectionState() {
    return this.selectedIdsState
  }

  /** 给 List environments.editMode 使用的 Observable。 */
  get editMode() {
    return this.editModeState
  }

  /** 给 ForEach.data 使用的完整数据源 Observable。 */
  get itemsObservable() {
    return this.itemsState
  }

  /** 更新 hook 侧提供的行滑动 action 和删除业务函数。 */
  setOptions(options?: EditableGlassListOptions<T>) {
    this.leadingSwipeActions = options?.leadingSwipeActions
    this.trailingSwipeActions = options?.trailingSwipeActions
    this.onDelete = options?.onDelete
  }

  /** 直接生成可放入 List/Section 的 ForEach 节点。 */
  render = ((
    typeOrRender: string | ((item: T) => VirtualNode),
    maybeRender?: ((item: T) => VirtualNode) | EditableGlassListRowPropsPatch,
    maybeRowProps?: EditableGlassListRowPropsPatch
  ) => {
    const type = typeof typeOrRender === "function" ? defaultType : typeOrRender
    const render = typeof typeOrRender === "function"
      ? typeOrRender
      : maybeRender as (item: T, index: number) => VirtualNode
    const rowProps = typeof typeOrRender === "function"
      ? maybeRender as EditableGlassListRowPropsPatch | undefined
      : maybeRowProps

    return (
      <EditableGlassListForEach
        key={`editable-glass-list-foreach-${type}`}
        store={this}
        type={type}
        render={render}
        rowProps={rowProps}
      />
    )
  }) as EditableGlassListRender<T>

  /** 合并单行样式、选择 tag 和滑动 action 到内容节点。 */
  renderRow(item: T, index: number, render: (item: T, index: number) => VirtualNode, rowProps?: EditableGlassListRowPropsPatch) {
    const leadingActions = normalizeNodes(this.leadingSwipeActions?.actions(this.toActionContext(item)))
    const trailingActions = [
      ...(this.onDelete ? [
        <Button
          title=""
          systemImage="trash"
          tint="red"
          action={() => this.requestDelete([item], triggerSources.row)}
        />
      ] : []),
      ...normalizeNodes(this.trailingSwipeActions?.actions(this.toActionContext(item))),
    ]

    return withEditableGlassListRowStyle(render(item, index), {
      ...rowProps,
      tag: item.id,
      leadingSwipeActions: leadingActions.length ? {
        allowsFullSwipe: this.leadingSwipeActions?.allowsFullSwipe,
        actions: leadingActions,
      } : undefined,
      trailingSwipeActions: trailingActions.length ? {
        allowsFullSwipe: this.trailingSwipeActions?.allowsFullSwipe,
        actions: trailingActions,
      } : undefined,
    })
  }

  /** 更新数据源。 */
  update(input: EditableGlassListUpdateInput<T>) {
    return this.commitUpdate(input)
  }

  /** 新增数据，可指定加入某个分组的前面或后面。 */
  add(itemsToAdd: T | T[], options?: EditableGlassListAddOptions) {
    return this.update(this.createAddUpdater(itemsToAdd, options))
  }

  /** 刷新当前数据引用，用于触发列表布局/编辑态动画重算。 */
  refresh() {
    return withAnimation(() => this.itemsState.setValue([...this.itemsState.value]))
  }

  /** 选中指定 id。 */
  select(id: T["id"]) {
    this.selection.select(id)
  }

  /** 取消选中指定 id。 */
  deselect(id: T["id"]) {
    this.selection.deselect(id)
  }

  /** 选中全部当前数据。 */
  selectAll() {
    this.selection.selectAll()
  }

  /** 清空当前选择。 */
  clearSelection() {
    this.selection.clear()
  }

  /** 进入编辑状态。 */
  enterEdit() {
    return withAnimation(() => this.editModeState.setValue(EditMode.active()))
  }

  /** 退出编辑状态。 */
  exitEdit() {
    return withAnimation(() => this.editModeState.setValue(EditMode.inactive()))
  }

  /** 切换编辑状态。 */
  toggleEdit() {
    return this.editModeState.value.isEditing
      ? this.exitEdit() : this.enterEdit()
  }

  /** 开启排序能力；只影响 ForEach.editActions，不负责进入/退出编辑态。 */
  enterMove() {
    return this.setMoveEnabled(true)
  }

  /** 关闭排序能力；只影响 ForEach.editActions，不负责进入/退出编辑态。 */
  exitMove() {
    return this.setMoveEnabled(false)
  }

  /** 切换排序能力；只影响 ForEach.editActions，不负责进入/退出编辑态。 */
  toggleMove() {
    return this.setMoveEnabled(!this.isMoveEnabled)
  }

  /** 请求删除指定 id 对应的数据对象。 */
  async requestDeleteByIds(ids: T["id"][], triggerSource: TriggerSource = triggerSources.custom) {
    const idSet = new Set(ids)

    await this.requestDelete(
      this.items.filter(item => idSet.has(item.id)),
      triggerSource
    )
  }

  /** 请求删除当前已选中的数据对象。 */
  async requestDeleteSelected(triggerSource: TriggerSource = triggerSources.toolbar) {
    await this.requestDelete(this.selectedItems, triggerSource)
  }

  /** 请求删除指定数据对象。 */
  async requestDelete(itemsToDelete: T[], triggerSource: TriggerSource = triggerSources.custom) {
    const deletingItems = uniqueItemsById(itemsToDelete)
    if (!deletingItems.length || !this.onDelete) return

    const deleteAction = await this.onDelete(deletingItems, this.toDeleteContext(triggerSource))

    if (typeof deleteAction !== "function") return

    if (this.isEditing) await this.exitEdit()

    await deleteAction()
    this.selectedIdsState.setValue([])
  }

  /** 生成外部使用的语义 API。 */
  toApi(): EditableGlassListApi<T> {
    const store = this

    return {
      render: this.render,
      data: {
        update: input => this.update(input),
        add: (items, options) => this.add(items, options),
        refresh: () => this.refresh(),
      },
      selection: {
        get ids() {
          return store.selectedIds
        },
        get items() {
          return store.selectedItems
        },
        select: id => this.select(id),
        deselect: id => this.deselect(id),
        all: () => this.selectAll(),
        clear: () => this.clearSelection(),
      },
      editing: {
        get active() {
          return store.isEditing
        },
        enter: () => this.enterEdit(),
        exit: () => this.exitEdit(),
        toggle: () => this.toggleEdit(),
      },
      move: {
        get active() {
          return store.isMoveEnabled
        },
        enter: () => this.enterMove(),
        exit: () => this.exitMove(),
        toggle: () => this.toggleMove(),
      },
      deletion: {
        items: (items, triggerSource) => this.requestDelete(items, triggerSource),
        ids: (ids, triggerSource) => this.requestDeleteByIds(ids, triggerSource),
        selected: triggerSource => this.requestDeleteSelected(triggerSource),
      },
    }
  }

  /** 生成行级 action 回调上下文。 */
  private toActionContext(item: T) {
    return {
      item,
      items: this.items,
      selectedIds: this.selectedIds,
      selectedItems: this.selectedItems,
      isSelected: this.selection.idSet.has(item.id),
      isEditing: this.isEditing,
    }
  }

  /** 解析 update 输入并在真正写入前统一去重。 */
  private resolveUpdateInput(input: EditableGlassListUpdateInput<T>) {
    const nextItems = typeof input === "function"
      ? input(this.itemsState.value)
      : input

    return uniqueItemsById(nextItems)
  }

  /** 真正刷新数据源的唯一入口。 */
  private commitUpdate(input: EditableGlassListUpdateInput<T>) {
    const nextItems = this.resolveUpdateInput(input)

    if (isSameItems(this.itemsState.value, nextItems)) return Promise.resolve()

    return withAnimation(() => {
      this.itemsState.setValue(nextItems)
    })
  }

  /** 生成新增数据的更新函数。 */
  private createAddUpdater(itemsToAdd: T | T[], options?: EditableGlassListAddOptions) {
    const nextItems = Array.isArray(itemsToAdd) ? itemsToAdd : [itemsToAdd]
    const typedItems = nextItems.map(item => ({
      ...item,
      ...(options?.type && options.type !== defaultType ? { type: options.type } : {}),
    })) as T[]

    return (items: T[]) => {
      if (!typedItems.length) return items

      const type = options?.type ?? defaultType
      const position = options?.position ?? "end"

      if (!options?.type) {
        return position === "start"
          ? [...typedItems, ...items]
          : [...items, ...typedItems]
      }

      const firstIndex = items.findIndex(item => getItemType(item) === type)

      if (firstIndex === -1) {
        return position === "start"
          ? [...typedItems, ...items]
          : [...items, ...typedItems]
      }

      if (position === "start") {
        return [
          ...items.slice(0, firstIndex),
          ...typedItems,
          ...items.slice(firstIndex),
        ]
      }

      let lastIndex = firstIndex
      for (let index = firstIndex + 1; index < items.length; index += 1) {
        if (getItemType(items[index]) !== type) break
        lastIndex = index
      }

      return [
        ...items.slice(0, lastIndex + 1),
        ...typedItems,
        ...items.slice(lastIndex + 1),
      ]
    }
  }

  /** 开关排序能力；只影响 ForEach.editActions，不负责进入/退出编辑态。 */
  private setMoveEnabled(enabled: boolean) {
    if (this.isMoveEnabled === enabled) return Promise.resolve()

    return withAnimation(() => this.moveEnabledState.setValue(enabled))
  }

  /** 生成删除业务上下文。 */
  private toDeleteContext(triggerSource: TriggerSource): EditableGlassListDeleteContext<T> {
    return {
      triggerSource,
      items: this.items,
      selectedIds: this.selectedIds,
      selectedItems: this.selectedItems,
      isEditing: this.isEditing,
      data: {
        update: input => () => this.commitUpdate(input),
        add: (items, options) => () => this.commitUpdate(this.createAddUpdater(items, options)),
        refresh: () => () => this.refresh(),
      },
    }
  }
}
