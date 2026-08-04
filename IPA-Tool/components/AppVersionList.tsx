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
import { apiGetAppVersionList, apiGetAppVersions3rd } from "../services/api"
import { useAuth } from "../hooks/useAuth"
import { useStartAppDownload } from "../hooks/useStartAppDownload"

interface Props {
  id: string
  name: string
  callback?: (id: string, item: AppVersionItem[number]) => void
}

type VersionEntry = EditableListEntry & {
  version: string
  bundleId: string
}

const HEADER_ENTRY: VersionEntry = {
  id: "header",
  version: "版本号",
  bundleId: "版本ID",
}

const toVersionEntries = (versions: AppVersionItem): VersionEntry[] => {
  const items = versions.map(([version, bundleId]) => ({
    id: `${version}-${bundleId}`,
    version,
    bundleId,
  }))
  return [HEADER_ENTRY, ...items]
}

export function AppVersionList({ id, name, callback }: Props) {
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
      const versions = isLoggedIn
        ? await apiGetAppVersionList(id)
        : await apiGetAppVersions3rd(id)

      if (!versions.length) {
        list.data.add({
          id: "empty",
          version: "暂无历史版本记录",
          bundleId: "????",
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
  }, [id, isLoggedIn])

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
          <VStack>
            <Button
              key={item.id}
              action={() => {
                if (item.id === "header") return
                callback?.(id, [item.version, item.bundleId])
              }}
            >
              <HStack>
                <Text frame={{ maxWidth: "infinity", alignment: "leading" }}>{item.version}</Text>
                <Text frame={{ maxWidth: "infinity", alignment: "center" }}>{item.bundleId}</Text>
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
                      callback?.(id, [item.version, item.bundleId])
                      startAppDownload({
                        id,
                        name,
                        internalVersion: item.version,
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
