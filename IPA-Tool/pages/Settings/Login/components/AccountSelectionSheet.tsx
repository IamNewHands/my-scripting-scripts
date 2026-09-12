import {
  Button,
  Divider,
  HStack,
  Image,
  Navigation,
  NavigationStack,
  Section,
  VStack,
  useEffect,
  useObservable,
} from "scripting"
import {
  EditableGlassList,
  useEditableGlassList,
  type EditableListEntry,
} from "../../../../components/EditableGlassListPipeline"
import { AnimText } from "../../../../components/AnimText"
import { useAccountManager, useAuth } from "../../../../hooks"

type AccountItem = ReturnType<typeof useAuth>["accountHistory"][number]

type AccountEntry = EditableListEntry & AccountItem

type AccountSelectionSheetProps = {
  accounts: AccountItem[]
  onSelect: (account: AccountItem) => void | Promise<void>
  onDelete?: (account: AccountItem) => void | Promise<void>
}

const toEntries = (accounts: AccountItem[]): AccountEntry[] => {
  return accounts.map(account => ({
    ...account,
    id: account.account,
  }))
}

/**
 * 账号选择 Sheet。
 *
 * 风格复用搜索页 sheet 中的 EditableGlassList：
 * - NavigationStack 作为根组件；
 * - toolbar 左侧关闭、右侧编辑；
 * - 点击行：选择账号；
 * - 右滑：删除账号；
 * - 编辑态：可全选并批量删除。
 */
export function AccountSelectionSheet({
  accounts,
  onSelect,
  onDelete,
}: AccountSelectionSheetProps) {
  const dismiss = Navigation.useDismiss()
  const { getAccountDisplayInfo } = useAccountManager()
  const items = useObservable<AccountEntry[]>(toEntries(accounts))
  const list = useEditableGlassList(items, {
    async onDelete(itemsToDelete, context) {
      const index = await Dialog.actionSheet({
        title: context.isEditing || itemsToDelete.length > 1 ? "删除账号" : "确认删除",
        message: itemsToDelete.length > 1
          ? `确定删除 ${itemsToDelete.length} 个账号吗？会同时清理本地历史和 CK 缓存。`
          : `确定删除 ${itemsToDelete[0]?.account ?? "该账号"} 吗？会同时清理本地历史和 CK 缓存。`,
        actions: [{ label: "删除", destructive: true }],
      })

      if (index !== 0) return

      const updateItems = context.data.update(items =>
        items.filter(item => !itemsToDelete.some(deleteItem => deleteItem.id === item.id))
      )

      return async () => {
        for (const item of itemsToDelete) {
          await onDelete?.(item)
        }
        await updateItems()
      }
    },
  })

  useEffect(() => {
    items.setValue(toEntries(accounts))
  }, [accounts.length, accounts.map(account => `${account.account}:${account.isActive ? 1 : 0}:${account.storeFront}`).join("|")])

  const handleSelect = async (account: AccountEntry) => {
    await onSelect(account)
    dismiss()
  }

  return (
    <NavigationStack>
      <EditableGlassList
        items={items}
        enableSelection={true}
        enableEditMode={true}
        navigationTitle={"快速切换"}
        listRowSpacing={-20}
        toolbar={{
          cancellationAction: !list.editing.active ? (
            <Button
              title=""
              systemImage="xmark"
              action={dismiss}
            />
          ) : list.selection.ids.length ? (
            <Button
              title=""
              systemImage="trash"
              tint="systemRed"
              action={() => list.deletion.selected("toolbar")}
            />
          ) : undefined,
          topBarLeading: list.editing.active ? (
            <Button
              action={() => list.selection.ids.length ? list.selection.clear() : list.selection.all()}
            >
              <Image
                scaleEffect={1.1}
                contentTransition="symbolEffect"
                systemName={list.selection.ids.length ? `${list.selection.ids.length}.circle` : "checkmark.circle"}
                renderingMode="template"
                foregroundStyle={list.selection.ids.length ? "label" : "lightGray"}
              />
            </Button>
          ) : undefined,
          primaryAction: list.editing.active ? (
            <Button
              title=""
              systemImage="xmark"
              action={list.editing.toggle}
            />
          ) : undefined,
          topBarTrailing: !list.editing.active ? (
            <Button
              title=""
              systemImage="square.and.pencil"
              disabled={items.value.length === 0}
              action={list.editing.toggle}
            />
          ) : undefined,
        }}
      >
        <Section>
          {list.render(item => {
            const info = getAccountDisplayInfo(item)
            const rowContent = (
              <HStack
                key={item.id}
                spacing={10}
                padding={{ vertical: 8 }}
                contentShape="rect"
              >
                <AnimText font={40} lineLimit={1}>
                  {info.flag}
                </AnimText>
                <VStack spacing={15} alignment="leading">
                  <AnimText
                    font="body"
                    fontWeight={item.isActive ? "semibold" : "regular"}
                    foregroundStyle="label"
                    lineLimit={1}
                    
                  >
                    {info.email}
                  </AnimText>
                  <Divider />
                </VStack>
              </HStack>
            )

            if (list.editing.active) return rowContent

            return {
              ...rowContent,
              props: {
                ...rowContent.props,
                onTapGesture: () => handleSelect(item),
              },
            }
          }, {
            glassEffect: undefined,
            overlay: undefined,
          })}
        </Section>
      </EditableGlassList>
    </NavigationStack>
  )
}
