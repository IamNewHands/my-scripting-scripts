import {
  List,
  Rectangle,
  ZStack,
} from "scripting"
import type {
  EditableGlassListProps,
  EditableListEntry,
} from "./types"
import { useEditableGlassListStore } from "./hooks/useEditableGlassList"
import type { VirtualNode } from "scripting"

const isVirtualNode = (value: unknown): value is VirtualNode => {
  return !!value && typeof value === "object" && "isInternal" in value
}

const renderBackground = (background: EditableGlassListProps<EditableListEntry>["background"]) => {
  if (!background) return null
  if (isVirtualNode(background)) return background

  return (
    <Rectangle
      fill={background as Parameters<typeof Rectangle>[0]["fill"]}
      ignoresSafeArea={true}
      allowsHitTesting={false}
    />
  )
}

export function EditableGlassList<T extends EditableListEntry>(props: EditableGlassListProps<T>) {
  const {
    items,
    background,
    children,
    toolbar: _toolbar,
    safeAreaInset: _safeAreaInset,
    overlay: _overlay,
    enableSelection = false,
    enableEditMode = false,
    ...listProps
  } = props as EditableGlassListProps<T> & {
    toolbar?: unknown
  }


  const store = useEditableGlassListStore(items)

  return (
    <ZStack>
      {renderBackground(background)}
      <List
        {...(enableSelection ? { selection: store.selectionState as Observable<string[]> } : {})}
        {...(enableEditMode ? { environments: { editMode: store.editMode } } : {})}
        scrollContentBackground="hidden"
        listStyle={"plain"}
        listRowSpacing={-15}
        {...listProps}
      >
        {children}
      </List>
    </ZStack>
  )
}
