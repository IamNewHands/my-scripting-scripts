import type { CommonViewProps, ListProps, VirtualNode } from "scripting"

/** 当前操作的触发来源，用于业务层区分来自行、toolbar 或自定义入口的操作。 */
export type TriggerSource = "row" | "toolbar" | "custom"

/** 组件内置的触发来源常量，避免外部散落字符串。 */
export type TriggerSources = {
  /** 来自行左滑 action。 */
  row: "row"
  /** 来自 toolbar 或 bottomBar。 */
  toolbar: "toolbar"
  /** 来自外部自定义入口。 */
  custom: "custom"
}

/** 列表项 id 类型；当前固定为字符串，保证 List.selection 选中态稳定。 */
export type EditableListEntryId = string

/** 列表项渲染分组类型。 */
export type EditableListEntryType = string

/** 列表项基础约束：id 同时作为 List 的 key / tag / selection 值。 */
export type EditableListEntry = {
  /** 列表项唯一标识。 */
  id: EditableListEntryId
  /** 渲染分组；不传时归入 default 分组。 */
  type?: EditableListEntryType
}

/** 删除业务回调拿到的上下文。 */
export type EditableGlassListDeleteContext<T extends EditableListEntry> = {
  /** 本次删除请求的触发来源。 */
  triggerSource: TriggerSource
  /** 当前完整列表数据。 */
  items: T[]
  /** 当前已选中的 id 列表。 */
  selectedIds: T["id"][]
  /** 当前已选中的数据项。 */
  selectedItems: T[]
  /** 当前是否处于编辑状态。 */
  isEditing: boolean
  /** 数据更新操作；返回执行函数，组件层会把执行函数包进 withAnimation。 */
  data: EditableGlassListDataApi<T, () => Promise<void> | void>
}

/** 删除业务函数；确认弹窗、权限校验写在这里。需要删除时返回真正的数据移除函数，组件层会把该函数包进 withAnimation。返回空值表示取消删除。 */
export type EditableGlassListOnDelete<T extends EditableListEntry> = (
  items: T[],
  context: EditableGlassListDeleteContext<T>
) => void | (() => Promise<void> | void) | Promise<void | (() => Promise<void> | void)>

/** 行级滑动 action 回调拿到的上下文。 */
export type EditableGlassListActionContext<T extends EditableListEntry> = {
  /** 当前行数据。 */
  item: T
  /** 当前完整列表数据。 */
  items: T[]
  /** 当前已选中的 id 列表。 */
  selectedIds: T["id"][]
  /** 当前已选中的数据项。 */
  selectedItems: T[]
  /** 当前行是否已选中。 */
  isSelected: boolean
  /** 当前是否处于编辑状态。 */
  isEditing: boolean
}

export type EditableGlassListSwipeActions<T extends EditableListEntry> = {
  /** 是否允许滑到底直接触发第一个 action。 */
  allowsFullSwipe?: boolean
  /** 生成当前行的滑动操作。 */
  actions: (context: EditableGlassListActionContext<T>) => VirtualNode | VirtualNode[] | undefined
}

/** 排序移动事件上下文。 */
export type EditableGlassListMoveContext<T extends EditableListEntry> = {
  /** 本次移动的数据项。 */
  item: T
  /** 排序前的全局索引。 */
  fromIndex: number
  /** 排序后的全局索引。 */
  toIndex: number
  /** 排序前完整数据快照。 */
  previousItems: T[]
  /** 排序后完整数据快照。 */
  items: T[]
}

/** 同分组内排序移动事件上下文。 */
export type EditableGlassListGroupMoveContext<T extends EditableListEntry> = EditableGlassListMoveContext<T> & {
  /** 本次移动所属分组；未写 type 时为 default。 */
  type: EditableListEntryType
  /** 排序前当前分组数据快照。 */
  previousGroupItems: T[]
  /** 排序后当前分组数据快照。 */
  groupItems: T[]
}

/** 排序移动回调；只做副作用，不负责修改数据。 */
export type EditableGlassListOnMove<T extends EditableListEntry> = (
  context: EditableGlassListMoveContext<T>
) => void

/** 同分组内排序移动回调；只做副作用，不负责修改数据。 */
export type EditableGlassListOnGroupMove<T extends EditableListEntry> = (
  context: EditableGlassListGroupMoveContext<T>
) => void

export type EditableGlassListRowPropsPatch = CommonViewProps & Record<string, unknown>

/** 直接渲染列表行；不传 type 时渲染 default 分组。 */
export type EditableGlassListRender<T extends EditableListEntry> = {
  /** 渲染 default 分组。 */
  (render: (item: T, index: number) => VirtualNode, rowProps?: EditableGlassListRowPropsPatch): VirtualNode
  /** 渲染指定 type 分组。 */
  <TType extends NonNullable<T["type"]> & string>(
    type: TType,
    render: (item: Extract<T, { type: TType }>, index: number) => VirtualNode,
    rowProps?: EditableGlassListRowPropsPatch
  ): VirtualNode
}

export type EditableGlassListAddPosition = "start" | "end"

export type EditableGlassListAddOptions = {
  /** 指定加入的分组；不传则保持数据原样。 */
  type?: EditableListEntryType
  /** 加到目标分组前面或后面，默认 end。 */
  position?: EditableGlassListAddPosition
}

export type EditableGlassListUpdateInput<T extends EditableListEntry> =
  | T[]
  | ((items: T[]) => T[])

/** 数据更新操作。 */
export type EditableGlassListDataApi<T extends EditableListEntry, TResult = Promise<void>> = {
  /** 直接更新数据源；可传新数组或 updater，可用于新增、删除、排序、替换。 */
  update: (input: EditableGlassListUpdateInput<T>) => TResult
  /** 新增数据；可指定加入某个分组的前面或后面。 */
  add: (items: T | T[], options?: EditableGlassListAddOptions) => TResult
  /** 刷新当前数据引用，用于触发列表布局/编辑态动画重算。 */
  refresh: () => TResult
}

/** 选择状态与选择操作。 */
export type EditableGlassListSelectionApi<T extends EditableListEntry> = {
  /** 当前已选中的 id 列表。 */
  readonly ids: T["id"][]
  /** 当前已选中的数据对象列表。 */
  readonly items: T[]
  /** 选中指定 id。 */
  select: (id: T["id"]) => void
  /** 取消选中指定 id。 */
  deselect: (id: T["id"]) => void
  /** 选中全部当前数据。 */
  all: () => void
  /** 清空当前选择。 */
  clear: () => void
}

/** 开关型操作 API。 */
export type EditableGlassListToggleApi = {
  /** 当前是否开启。 */
  readonly active: boolean
  /** 开启。 */
  enter: () => Promise<void>
  /** 关闭。 */
  exit: () => Promise<void>
  /** 切换开启状态。 */
  toggle: () => Promise<void>
}

/** 编辑状态与编辑操作。 */
export type EditableGlassListEditingApi = EditableGlassListToggleApi

/** 排序移动能力；只控制 ForEach.editActions="move"，不负责进入/退出编辑态。 */
export type EditableGlassListMoveApi = EditableGlassListToggleApi

/** 删除请求操作。 */
export type EditableGlassListDeletionApi<T extends EditableListEntry> = {
  /** 请求删除指定数据对象。 */
  items: (items: T[], triggerSource?: TriggerSource) => Promise<void>
  /** 请求删除指定 id 对应的数据对象。 */
  ids: (ids: T["id"][], triggerSource?: TriggerSource) => Promise<void>
  /** 请求删除当前已选中的数据对象。 */
  selected: (triggerSource?: TriggerSource) => Promise<void>
}

/** useEditableGlassList 返回的完整语义 API。 */
export type EditableGlassListApi<T extends EditableListEntry> = {
  /** 声明列表行渲染。 */
  render: EditableGlassListRender<T>
  /** 数据更新操作。 */
  data: EditableGlassListDataApi<T>
  /** 选择状态与选择操作。 */
  selection: EditableGlassListSelectionApi<T>
  /** 编辑状态与编辑操作。 */
  editing: EditableGlassListEditingApi
  /** 排序移动能力。 */
  move: EditableGlassListMoveApi
  /** 删除请求操作。 */
  deletion: EditableGlassListDeletionApi<T>
}

/** useEditableGlassList 配置。 */
export type EditableGlassListOptions<T extends EditableListEntry> = {
  /** 左侧滑动操作；字段名和原生 leadingSwipeActions 对齐，注册后会自动添加到每一行。 */
  leadingSwipeActions?: EditableGlassListSwipeActions<T>
  /** 右侧滑动操作；字段名和原生 trailingSwipeActions 对齐，注册后会自动添加到每一行。 */
  trailingSwipeActions?: EditableGlassListSwipeActions<T>
  /** 真正的删除业务函数；render 生成内置删除 action 时需要提前拿到。异步确认后应返回数据移除函数，由组件层包动画执行。 */
  onDelete?: EditableGlassListOnDelete<T>
  /** 同长度、同 id 集合的全局排序变化；用于副作用监听。 */
  onMove?: EditableGlassListOnMove<T>
  /** 同分组内排序变化；跨分组排序不会触发。 */
  onGroupMove?: EditableGlassListOnGroupMove<T>
}

export type EditableGlassListChildren =
  | VirtualNode
  | VirtualNode[]
  | (VirtualNode | VirtualNode[])[]
  | null
  | undefined
  | boolean

/** EditableGlassList 对外属性。 */
export type EditableGlassListProps<T extends EditableListEntry> = ListProps & CommonViewProps & {
  /** 数据源；必须与 useEditableGlassList(items) 传入同一个 Observable。 */
  items: Observable<T[]>
  /** List 行间距，默认 -15。 */
  listRowSpacing?: number
  /** 内部 ZStack 背景：传节点直接渲染；传颜色/渐变等样式会自动包成 Rectangle。 */
  background?: CommonViewProps["background"]
  /** 是否向 List 传入 selection，默认 false。 */
  enableSelection?: boolean
  /** 是否向 List 传入 editMode environment，默认 false。 */
  enableEditMode?: boolean
  /** 普通 List children，支持 Section 等任意节点和 render(...) 返回的 ForEach 节点。 */
  children?: EditableGlassListChildren
}
