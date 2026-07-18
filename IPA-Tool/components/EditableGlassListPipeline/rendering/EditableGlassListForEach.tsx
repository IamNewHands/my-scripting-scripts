import { EmptyView, ForEach } from "scripting"
import type { VirtualNode } from "scripting"
import type { EditableGlassListRowPropsPatch, EditableListEntry } from "../types"
import { getItemType } from "../utils/listUtils"

type EditableGlassListForEachStore<T extends EditableListEntry> = {
  readonly itemsObservable: Observable<T[]>
  readonly isMoveEnabled: boolean
  renderRow: (item: T, index: number, render: (item: T, index: number) => VirtualNode, rowProps?: EditableGlassListRowPropsPatch) => VirtualNode
}

export type EditableGlassListForEachProps<T extends EditableListEntry> = {
  store: EditableGlassListForEachStore<T>
  type: string
  render: (item: T, index: number) => VirtualNode
  rowProps?: EditableGlassListRowPropsPatch
}

export function EditableGlassListForEach<T extends EditableListEntry>(props: EditableGlassListForEachProps<T>) {
  const { store, type, render, rowProps } = props

  /*
    必须绑定主 items Observable，不能按分组创建多个 Observable。
    Scripting 原生排序会直接修改 ForEach.data 指向的数据源；
    如果每个分组各自持有 groupItems，排序只会改分组数据，主 items 不变，
    后续新增/删除/刷新会让主数据和分组数据分叉。
    这里用同一份 items + builder 过滤，是为了保证单一真实数据源。
  */
  return (
    <ForEach
      data={store.itemsObservable}
      {...(store.isMoveEnabled ? {
        editActions: "move",
      } : {})}
      builder={(item, index) => getItemType(item) === type
        ? store.renderRow(item, index, render, rowProps)
        : <EmptyView />}
    />
  )
}
