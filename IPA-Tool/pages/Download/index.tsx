import {
  NavigationStack,
  Section,
  ContentUnavailableView,
  Button,
  Image,
  VStack,
  useMemo,
  useRef,
} from "scripting"
import {
  EditableGlassList,
  useEditableGlassList,
  PageBackground,
} from "../../components/EditableGlassListPipeline"
import DownloadRow from "./components/DownloadRow"
import { DownloadToolbar } from "./components/DownloadToolbar"
import { removeDownloadItems } from "../../services/downloadService"
import { DownloadStatsHeader } from "./components/DownloadStatsHeader"
import { useDownloadItems } from "./hooks/useDownloadItems"
import { AppConfig } from "../../constants/AppConfig"
import { getAppState, setDownloadOrder } from "../../hooks/useAppsState"
import { useLoginToast } from "../../hooks/useLoginToast"
import { onDownloadShowToast } from "./store/toast"
import { AnimText } from "../../components/AnimText"

/**
 * 下载页数据流警告：不要在删除逻辑里直接修改列表 items。
 *
 * items 只是 EditableGlassList 的展示/动画载体，真正的数据源是：
 * - 下载任务 / app 状态
 * - 本地 IPA 文件状态
 *
 * 正确链路：删除动作 -> useAppsState / 下载页唯一派生状态更新
 * -> useDownloadItems 重算并同步 items。
 * 如果删除时直接 context.data.update/filter items，会和源状态同步形成“双写”，
 * 导致列表删除动画和派生数据刷新动画互相打架，表现为上下异常跳动。
 *
 * 这里不允许自写源状态流，更不要为了“立刻从页面消失”去手动删 items。
 * 下载任务源操作已经收敛在 useAppsState（由 downloadService 调用），本地文件扫描只作为异步数据源进入 items。
 * 下载页入口只负责确认用户意图并调用共享删除能力，避免这里变成屎山。
 */
export default function DownloadV2View() {
  const { toastConfig, showToast } = useLoginToast()
  const { items, isEmpty } = useDownloadItems()
  const deleteStateSnapshotsRef = useRef({})

  const api = useEditableGlassList(items, {
    async onDelete(itemsToDelete, context) {
      const index = await Dialog.actionSheet({
        title: itemsToDelete.length > 1 ? "批量删除" : "确认删除",
        message:
          itemsToDelete.length > 1
            ? `确定删除 ${itemsToDelete.length} 项吗？删除后无法恢复。`
            : "删除后无法恢复，是否继续？",
        actions: [{ label: "删除", destructive: true }],
      })
      if (index !== 0) return

      deleteStateSnapshotsRef.current = Object.fromEntries(
        itemsToDelete
          .filter(item => item.source === "task" && item.appId)
          .map(item => [item.appId, getAppState(item.appId)])
      )

      return async () => {
        await removeDownloadItems(itemsToDelete, undefined, deleteStateSnapshotsRef.current)
        const removedIds = new Set(itemsToDelete.map(item => item.id))
        await context.data.update(items => items.filter(item => !removedIds.has(item.id)))()
        deleteStateSnapshotsRef.current = {}
      }
    },
    onMove(context) {
      setDownloadOrder(
        context.items
          .filter(item => item.source === "task" && item.appId)
          .map(item => item.appId)
      )
    },
    trailingSwipeActions: {
      actions: () => (
        <Button
          title=""
          tint={{ light: "rgba(0,0,0,0.04)", dark: "rgba(255,255,255,0.18)" }}
          systemImage="folder"
          action={() => Safari.openURL(`shareddocuments://${FileManager.documentsDirectory}/${AppConfig.file.folder}`)}
        />
      ),
    },
  })
  const { render, editing, selection } = api
  const toolbar = DownloadToolbar(api)
  onDownloadShowToast.run = showToast

  return useMemo(
    () => (
      <NavigationStack>
        <EditableGlassList
          items={items}
          navigationTitle="APP下载管理"
          background={<PageBackground />}
          listRowSpacing={-15}
          listRowSeparator="hidden"
          enableSelection={true}
          enableEditMode={true}
          overlay={
            <ContentUnavailableView
              hidden={!isEmpty}
              label={(
                <VStack spacing={12}>
                  <Image systemName="arrow.down.circle" font={56} foregroundStyle="secondaryLabel" />
                  <AnimText font="title" fontWeight="semibold">暂无下载</AnimText>
                </VStack>
              )}
              description={<AnimText font="body" foregroundStyle="secondaryLabel">下载应用后将自动显示在这里</AnimText>}
            />
          }
          toolbar={toolbar}
          toast={toastConfig}
        >
          <Section
            hidden={isEmpty}
            header={<DownloadStatsHeader items={items} />}
          >
            {render(item => DownloadRow({item}))}
          </Section>
        </EditableGlassList>
      </NavigationStack>
    ),
    [isEmpty, editing.active, selection.ids.length, toastConfig, items.value]
  )
}
