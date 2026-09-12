/**
 * AppVersionList 组件 - 应用历史版本列表
 * 使用 EditableGlassList 增强组件，数据加载后渐进添加
 */

import { Button, Divider, HStack, Image, Navigation, ProgressView, Section, Text, VStack, useCallback, useEffect, useObservable, useRef, useState } from "scripting"
import {
  EditableGlassList,
  useEditableGlassList,
  type EditableListEntry,
} from "./EditableGlassListPipeline"
import { type AppVersionItem } from "../types/appStore"
import { PLATFORM, type Store } from "../constants/Platform"
import { apiGetAppVersionList, apiGetAppVersions3rd } from "../services/api"
import { useAuth } from "../hooks/useAuth"
import { useStartAppDownload } from "../hooks/useStartAppDownload"

interface Props {
  id: string
  name: string
  store: Store
  startVersionId?: string
  callback?: (id: string, item: AppVersionItem[number]) => void
}

type VersionEntry = EditableListEntry & {
  externalVersionId: string
  bundleVersion: string
}

const HEADER_ENTRY: VersionEntry = {
  id: "header",
  externalVersionId: "版本 ID",
  bundleVersion: "版本号",
}

const toVersionEntries = (versions: AppVersionItem): VersionEntry[] => {
  const items = versions.map(([externalVersionId, bundleVersion]) => ({
    id: `${externalVersionId}-${bundleVersion}`,
    externalVersionId,
    bundleVersion,
  }))
  return [HEADER_ENTRY, ...items]
}

export function AppVersionList({ id, name, store, startVersionId, callback }: Props) {
  const { isLoggedIn } = useAuth().authState
  const dismiss = Navigation.useDismiss()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const items = useObservable<VersionEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingRef = useRef(false)
  const list = useEditableGlassList(items)
  const { startAppDownload } = useStartAppDownload()

  const clearLoadingTimer = () => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const finishLoading = () => {
    loadingRef.current = false
    setLoading(false)
  }

  const refreshVersions = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    clearLoadingTimer()
    items.setValue([HEADER_ENTRY])

    try {
      const currentPlatform = store.platform
      const versions = isLoggedIn
        ? await apiGetAppVersionList(id, store, startVersionId)
        : currentPlatform === PLATFORM.TV
          ? (() => { throw new Error("tvOS 历史版本需要先登录") })()
          : await apiGetAppVersions3rd(id)

      // 数据已到达即可移除 ProgressView；loadingRef 保持为 true，直到渐进渲染结束，继续防止重复刷新。
      setLoading(false)

      if (!versions.length) {
        list.data.add({
          id: "empty",
          externalVersionId: "暂无历史版本记录",
          bundleVersion: "????",
        })
        finishLoading()
        return
      }

      const entries = toVersionEntries(versions).filter(e => e.id !== "header")
      let index = 0

      const addNext = () => {
        if (index >= entries.length) {
          timerRef.current = null
          finishLoading()
          return
        }

        if (index >= 9) {
          list.data.add(entries.slice(index))
          timerRef.current = null
          finishLoading()
          return
        }

        list.data.add(entries[index])
        index += 1
        timerRef.current = setTimeout(addNext, 100)
      }

      addNext()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      finishLoading()
    }
  }, [id, isLoggedIn, store, startVersionId])

  useEffect(() => {
    refreshVersions()

    return () => {
      clearLoadingTimer()
      loadingRef.current = false
    }
  }, [id])


  return (
    <EditableGlassList
      items={items}
      scrollContentBackground="hidden"
    >
      <Section header={
        <Text
          padding={{ leading: true }}
          font="title2"
          lineLimit={1}
        >{name}</Text>
      }>
        {list.render(item => (
          <VStack padding={true}>
            <Button
              key={item.id}
              action={() => {
                if (item.id === "header") return
                callback?.(id, [item.externalVersionId, item.bundleVersion])
              }}
            >
              <HStack>
                
                <Text frame={{ maxWidth: "infinity", alignment: "leading" }}>{item.externalVersionId}</Text>
                
                <Text frame={{ maxWidth: "infinity", alignment: "center" }}>{item.bundleVersion}</Text>
                
                <HStack frame={{ maxWidth: "infinity", alignment: "trailing" }}>
                  {item.id === "header" ? (
                    <Button
                      action={refreshVersions}
                      buttonBorderShape={{ roundedRectangleRadius: 20 }}
                      buttonStyle="glassProminent"
                    >
                      <Image
                        systemName="arrow.clockwise"
                        imageScale="medium"
                        contentTransition="symbolEffect"
                        symbolEffect={{ effect: "bounce", value: loading }}
                      />
                    </Button>
                  ) : (
                    <Button
                      action={() => {
                        callback?.(id, [item.externalVersionId, item.bundleVersion])
                        startAppDownload({
                          id,
                          name,
                          internalVersion: item.externalVersionId,
                          store,
                        })
                        dismiss()
                      }}
                      buttonBorderShape={{ roundedRectangleRadius: 20 }}
                      buttonStyle="glassProminent"
                    >
                      <Image systemName="arrowshape.down"
                        imageScale="medium"
                      />
                    </Button>
                  )}
                </HStack>
              </HStack>
            </Button>
            
            <Divider />
          </VStack>
        ), {
          glassEffect: undefined,
          overlay: undefined,
        })}
        <HStack
          spacing={8}
          hidden={error == null}
        >
          <Image systemName="xmark.circle" imageScale="large"
            foregroundStyle="systemRed"
          />
          <Text foregroundStyle="secondaryLabel">{error ?? ""}</Text>
        </HStack>
        <ProgressView
          hidden={!loading}
          key={Date.now()}
          frame={{
            maxWidth: "infinity",
            alignment: "center"
          }}
          listRowSeparator={"hidden"}
          progressViewStyle="circular"
        />
      </Section>
    </EditableGlassList>
  )
}

export default AppVersionList
