import { Button, HStack, Image, Path, useEffect } from "scripting"
import type {
  EditableGlassListDataApi, EditableGlassListEditingApi, EditableGlassListSelectionApi, EditableGlassListDeletionApi,
  EditableGlassListMoveApi
} from "../../../components/EditableGlassListPipeline/types"
import type { MergedItem } from "../hooks/useDownloadItems"
import { toggleDownloadItems } from "../../../services/downloadService"
import { AppConfig } from "../../../constants/AppConfig"
import { notifyAppsFilesChanged } from "../../../utils/appsFilesStore"
import CloseButton from "../../../components/CloseButton"

type Props = {
  editing: EditableGlassListEditingApi
  selection: EditableGlassListSelectionApi<MergedItem>
  deletion: EditableGlassListDeletionApi<MergedItem>
  data: EditableGlassListDataApi<MergedItem>
  move: EditableGlassListMoveApi
}

function ToolbarButton({ systemImage, action }: {
  systemImage: string
  action: () => void | Promise<void>
}) {
  return <Button title="" systemImage={systemImage} action={action} />
}

async function toggleEditing(
  editing: EditableGlassListEditingApi,
  data: EditableGlassListDataApi<MergedItem>,
  move: EditableGlassListMoveApi
) {

  const { promise, resolve } = Promise.withResolvers()

  if (editing.active) {
    editing.exit()
    setTimeout(() => {
      resolve(move.enter())
    }, 0)
  } else {
    move.exit()
    setTimeout(() => {
      resolve(editing.enter())
    }, 0)
  }

  return promise.then(() => data.refresh())
}

export function DownloadToolbar({
  editing,
  selection,
  deletion,
  data,
  move
}: Props) {

  useEffect(() => {
    move.enter()
  }, [])

  return {
    cancellationAction: !editing.active ? <CloseButton /> :
      editing.active && selection.ids.length ?
        <HStack spacing={15}>
          {(() => {
            const { items: sel } = selection
            const action = sel.some(item => /downloading|queued/.test(item.status))
              ? "pause" : "start"

            return <Button
              title=""
              contentTransition="symbolEffect"
              systemImage={action === "pause" ? "stop" : "play"}
              action={async () => {
                toggleDownloadItems(sel, action)
                toggleEditing(editing, data, move)
              }}
            />
          })()}

          <ToolbarButton
            systemImage="trash"
            action={() => deletion.selected("toolbar")}
          />
        </HStack>
        : undefined,

    topBarLeading: editing.active ? (
      <Button
        action={() =>
          selection.ids.length ? selection.clear() : selection.all()
        }
      >
        <Image
          scaleEffect={1.1}
          contentTransition="symbolEffect"
          systemName={
            selection.ids.length
              ? `${selection.ids.length}.circle`
              : "checkmark.circle"
          }
          renderingMode="template"
          foregroundStyle={selection.ids.length ? "label" : "lightGray"}
        />
      </Button>
    ) : undefined,

    primaryAction: editing.active ? (
      <ToolbarButton
        systemImage="xmark"
        action={() => toggleEditing(editing, data, move)}
      />
    ) : undefined,

    topBarTrailing: !editing.active ? (
      <HStack spacing={15}>
        <ToolbarButton
          systemImage="folder.badge.plus"
          action={async () => {
            const paths = await DocumentPicker.pickFiles({ allowsMultipleSelection: true })
            if (!paths?.length) return
            const dir = Path.join(FileManager.documentsDirectory, AppConfig.file.folder)
            await FileManager.createDirectory(dir, true)
            const ipaPaths = paths.filter((p: string) => p.endsWith(".ipa"))
            for (const p of ipaPaths) {
              await FileManager.copyFile(p, Path.join(dir, Path.basename(p)))
            }
            notifyAppsFilesChanged()
          }}
        />
        <ToolbarButton
          systemImage="ellipsis"
          action={() => toggleEditing(editing, data, move)}
        />
      </HStack>
    ) : undefined,
  }
}
