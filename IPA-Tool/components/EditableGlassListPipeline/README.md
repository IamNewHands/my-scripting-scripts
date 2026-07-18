# EditableGlassListPipeline

增强版原生 `List` 管道。保留 `ListProps & CommonViewProps` 的直觉用法，只额外接管编辑、多选、删除、排序监听、行 action、玻璃行样式和背景层。

## 目录职责

- `EditableGlassList.tsx`：原生 `List` 外壳，挂载 `selection`、`editMode` 和背景层
- `hooks/useEditableGlassList.tsx`：hook 入口，按 `items Observable` 复用同一个 store
- `hooks/useEditableGlassListMove.ts`：排序监听，订阅主数据并派发排序副作用
- `store/`：状态管道、选择派生、删除流程和对外 API
- `rendering/`：`ForEach.data` 渲染和行样式 props 合并
- `utils/`：纯工具、分组辅助和常量
- `types.ts`：对外类型

## 数据模型

```ts
type Item = {
  id: string
  type?: string
}
```

- `id`：必填且唯一，作为行的 `key / tag / selection` 值；写入前会按 `id` 去重，保留第一次出现的数据
- `type`：可选，决定渲染分组；不写归入默认分组
- `group(type, ...items)`：给一组数据补上同一个 `type`，方便拼接初始数据

```tsx
const initialItems = [
  { id: "tomato", name: "番茄" },
  { id: "potato", name: "土豆" },
  ...group("水果",
    { id: "apple", name: "苹果" },
    { id: "banana", name: "香蕉" },
  ),
]
```

## 快速使用

```tsx
const items = useObservable(initialItems)

const {
  render,
  data,
  selection,
  editing,
  deletion,
} = useEditableGlassList(items, {
  async onDelete(itemsToDelete, context) {
    const index = await Dialog.actionSheet({
      title: context.triggerSource === "toolbar" || context.isEditing ? "批量删除" : "确认删除",
      message: itemsToDelete.length > 1
        ? `确定删除 ${itemsToDelete.length} 项吗？删除后无法恢复。`
        : "删除后无法恢复，是否继续？",
      actions: [{ label: "删除", destructive: true }],
    })

    if (index !== 0) return

    return context.data.update(items =>
      items.filter(item => !itemsToDelete.some(deleteItem => deleteItem.id === item.id))
    )
  },
  trailingSwipeActions: {
    allowsFullSwipe: false,
    actions: api => (
      <Button
        title=""
        systemImage="star"
        tint="orange"
        action={() => console.log("收藏", api.item.id)}
      />
    ),
  },
})

<EditableGlassList
  items={items}
  navigationTitle="管道列表"
  background={<PageBackground />}
  toolbar={{
    topBarLeading: editing.active ? (
      <Button title="删除" action={() => deletion.selected("toolbar")} />
    ) : (
      <Button title="新增水果" action={() => data.add({ id: Date.now().toString(), name: "新水果" }, { type: "水果" })} />
    ),
    principal: <Text opacity={editing.active ? 1 : 0}>{selection.ids.length}</Text>,
    topBarTrailing: <Button title={editing.active ? "完成" : "编辑"} action={editing.toggle} />,
  }}
>
  {render(item => (
    <Text>{item.name}</Text>
  ))}

  <Section title="水果">
    {render("水果", item => (
      <Text>{item.name}</Text>
    ))}
  </Section>
</EditableGlassList>
```

## Hook API

```ts
const {
  render,
  data,
  selection,
  editing,
  move,
  deletion,
} = useEditableGlassList(items, options)
```

### Options

- `onDelete(items, context)`：注册删除业务；注册后每行自动添加内置删除 action
- `leadingSwipeActions`：注册公共左侧滑动操作，字段名和原生 `leadingSwipeActions` 对齐
- `trailingSwipeActions`：注册公共右侧滑动操作，字段名和原生 `trailingSwipeActions` 对齐
- `onMove(context)`：监听主 `items` 的一次全局排序变化，只做副作用
- `onGroupMove(context)`：监听同一 `type` 分组内的一次排序变化，跨分组不触发

### 返回值

- `render(item => node, rowProps?)`：渲染默认分组；`rowProps` 会合并到行节点
- `render(type, item => node, rowProps?)`：渲染指定分组；`rowProps` 会合并到行节点
- `data.update(updater | nextItems)`：立即更新数据；可新增、删除、排序、替换；写入前按 `id` 去重
- `data.add(item | items, { type?, position? })`：立即新增数据；`position` 为 `"start" | "end"`，默认 `"end"`
- `selection.ids / selection.items`：当前已选 id 和数据项；通过 getter 读取最新值
- `selection.all()` / `selection.clear()`：全选 / 清空选择
- `editing.active` / `editing.toggle()`：读取或切换编辑状态
- `move.active` / `move.toggle()`：读取或切换排序移动能力，只控制 `ForEach.editActions="move"`，不进入或退出编辑态
- `deletion.selected(source?)`：删除已选项
- `deletion.items(items, source?)`：删除指定数据项
- `deletion.ids(ids, source?)`：删除指定 id

## 原生能力透传

`EditableGlassList` 继承 `ListProps & CommonViewProps`，除内部固定接管的 `selection`、`editMode` 外，其它原生 `List` 能力优先直接透传使用，不额外封装。

```tsx
<EditableGlassList
  items={items}
  listStyle="insetGroup"
  listRowSpacing={8}
  listSectionSpacing="compact"
  refreshable={async () => {
    const nextItems = await loadItems()
    data.update(nextItems)
  }}
>
  <Section
    header={<Text>水果</Text>}
    sectionActions={
      <Button title="刷新" action={() => reloadGroup("水果")} />
    }
  >
    {render("水果", item => <Text>{item.name}</Text>)}
  </Section>
</EditableGlassList>
```

行级 List modifier 通过 `render(..., rowProps)` 传入，会合并到每一行原节点上：

```tsx
render(item => (
  <Text>{item.name}</Text>
), {
  listRowInsets: 12,
  listRowSeparator: "hidden",
  listRowBackground: <Rectangle fill="clear" />,
})
```

常用透传能力：

- `EditableGlassList`：`refreshable`、`listStyle`、`listRowSpacing`、`listSectionSpacing`、`scrollContentBackground`
- `Section`：`sectionActions`、`sectionIndexLabel`、`listSectionMargins`、`listSectionSeparator`、`listSectionSeparatorTint`
- `rowProps`：`listRowInsets`、`listRowSeparator`、`listRowSeparatorTint`、`listRowBackground`、`listItemTint`


## 删除上下文

`onDelete` 的 `context` 用于读取当前状态，并返回真正的数据更新函数。组件层会把返回的更新函数包进动画。

- `triggerSource`：触发来源，值为 `"row" | "toolbar" | "custom"`
- `items`：当前完整数据
- `selectedIds` / `selectedItems`：当前选择
- `isEditing`：当前是否编辑中
- `data.update(...)` / `data.add(...)`：返回可执行的数据更新函数

自定义入口不需要返回值，只负责调用删除 API 并传入来源；真正删除仍在 `onDelete` 里统一确认和返回更新函数。下面示例排除一个自定义来源：`quickDelete` 直接删除，其它来源先弹窗确认。

```tsx
const { deletion } = useEditableGlassList(items, {
  async onDelete(itemsToDelete, context) {
    if (context.triggerSource !== "quickDelete") {
      const index = await Dialog.actionSheet({
        title: itemsToDelete.length > 1 ? "批量删除" : "确认删除",
        message: itemsToDelete.length > 1
          ? `确定删除 ${itemsToDelete.length} 项吗？删除后无法恢复。`
          : "删除后无法恢复，是否继续？",
        actions: [{ label: "删除", destructive: true }],
      })

      if (index !== 0) return
    }

    return context.data.update(items =>
      items.filter(item => !itemsToDelete.some(deleteItem => deleteItem.id === item.id))
    )
  },
})

<Button
  title="快速删除已选"
  action={() => deletion.selected("quickDelete")}
/>
```


## 行 Action

公共 swipe actions 写在 hook 里，会自动添加到每一行。字段名和原生行属性保持一致：

| Hook 配置 | 原生属性 | 手势 |
|---|---|---|
| `leadingSwipeActions` | `leadingSwipeActions` | 右滑行，露出左侧操作 |
| `trailingSwipeActions` | `trailingSwipeActions` | 左滑行，露出右侧操作 |

```tsx
useEditableGlassList(items, {
  leadingSwipeActions: {
    allowsFullSwipe: false,
    actions: api => [
      <Button title="已读" action={() => markRead(api.item)} />
    ],
  },
  trailingSwipeActions: {
    allowsFullSwipe: false,
    actions: api => [
      <Button title="收藏" action={() => collect(api.item)} />
    ],
  },
})
```

每行 swipe actions 完全不同时，不注册 hook 级公共配置，直接写在 `render(...)` 返回的节点上：

```tsx
render(item => (
  <Text
    trailingSwipeActions={{
      actions: [
        <Button title="处理" action={() => handle(item)} />
      ],
    }}
  >
    {item.name}
  </Text>
))
```

不要同时使用 hook 级公共 swipe actions 和行内同方向 swipe actions，避免同一行重复注册。

## 行样式

`render(...)` 返回的是行节点。默认玻璃样式、用户传入的 `rowProps`、内部稳定 props 会按顺序浅合并到这个节点的 `props` 上：

1. 默认玻璃行样式
2. 用户 `rowProps`，用于覆盖宽高、padding、背景、玻璃效果等样式
3. 内部 `tag`、`leadingSwipeActions` 和 `trailingSwipeActions`，用于保证多选和内置 action 稳定，会覆盖同名 `rowProps`

也就是说，用户可以覆盖视觉样式，但不能通过 `rowProps` 覆盖内部选择标识和内置滑动 action。可多选行必须保持 `render(...)` 返回的单行节点层级；不要在 `ForEach.builder` 返回的单行节点外层再套 `Group` / 自定义壳组件，否则 `List.selection` 无法显示全选勾选。`Section` 或 `List` 内部包裹整个 `ForEach` 不影响多选。

```tsx
render(item => (
  <Text>{item.name}</Text>
), {
  padding: 20,
  frame: { height: 70 },
  background: "red",
})

render("水果", item => (
  <Text>{item.name}</Text>
), {
  padding: { horizontal: 20, vertical: 12 },
})
```

`EditableGlassListRow` 只用于手写普通展示行，不参与多选：

```tsx
<EditableGlassListRow padding={20}>
  <Text>自定义行</Text>
</EditableGlassListRow>
```

## 分组渲染

`render(type)` 内部始终绑定同一个主 `items Observable`，不会创建分组缓存或分组 `Observable`。

- 主 `items` 是唯一真实数据源，也是唯一传给 `ForEach.data` 的数据源
- 每个 `Section` 调用 `render(type)` 时都会创建一个 `ForEach`，但 `data` 都指向同一个 `items`
- `ForEach.builder` 里用 `getItemType(item) === type` 判断是否属于当前分组
- 不属于当前分组时返回 `EmptyView`，属于当前分组时才渲染行
- 原生排序、删除、新增、选择都围绕同一个 `items`，避免分组数据和主数据分叉

这个方案牺牲一点 builder 过滤成本，换来单一数据源和最少同步逻辑。

## 排序监听

排序监听只在 hook 里做最小接入：`hooks/useEditableGlassListMove.ts` 负责订阅、判断是否需要 diff、派发回调；`utils/moveDiff.ts` 只比较两组数组并识别一次 move。

- `onMove(context)`：主 `items` 顺序变化时触发，返回全局 `fromIndex / toIndex`
- `onGroupMove(context)`：移动项前后仍属于同一分组时触发，返回分组内 `fromIndex / toIndex`
- 新增、删除或 id 集合变化不会派发排序事件
- 组件因 `items.value` 刷新时会跳过本轮 subscribe diff；原生排序不会启动组件，才进入排序判断
- 回调只做副作用，不负责修改数据；原生排序已经直接修改主 `items Observable`

## 实现约束

- `items Observable` 必须同时传给 `useEditableGlassList(items)` 和 `<EditableGlassList items={items}>`
- `selection` 和 `editMode` 固定挂在内部原生 `List` 上，保证编辑态和多选动画
- `ForEach.data` 只能绑定主 `items Observable`，不要恢复多分组 `Observable`
- 可多选行只能对 `render(...)` 返回的单行节点合并 props，不要外包单行视觉壳；包裹整个 `ForEach` 不影响多选
- `utils/moveDiff.ts` 保持纯数组比较；是否 diff、是否派发回调都放在 hook 层
