/**
 * AppVersionList 组件 - 应用历史版本列表
 * 使用 EditableGlassList 增强组件，数据加载后渐进添加
 */

import { Button, Divider, EmptyView, HStack, Image, Navigation, ProgressView, Section, Text, TextField, VStack, useCallback, useEffect, useObservable, useRef, useState } from "scripting"
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

  const [query, setQuery] = useState("")
  const queryRef = useRef("")
  const allEntriesRef = useRef<VersionEntry[]>([])
  const stoppedRef = useRef(false)

  const isQueryMatch = (item: VersionEntry, q: string) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return (
      item.version.toLowerCase().includes(needle) ||
      item.bundleId.toLowerCase().includes(needle)
    )
  }

  const handleQueryChange = (value: string) => {
    queryRef.current = value
    setQuery(value)
    // 同步重建列表，避免先渲染一帧未过滤数据
    if (!loadingRef.current) {
      applyCurrentFilter()
    }
  }

  const applyCurrentFilter = useCallback(() => {
    // 停止渐进添加，直接按当前搜索词重建完整列表
    stoppedRef.current = true
    clearLoadingTimer()
    const q = queryRef.current.trim().toLowerCase()
    const all = allEntriesRef.current
    const filtered = q ? all.filter(item => isQueryMatch(item, q)) : all
    const emptyEntry = items.value.find(item => item.id === "empty")
    items.setValue([HEADER_ENTRY, ...(emptyEntry ? [emptyEntry] : []), ...filtered])
  }, [])

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
    stoppedRef.current = false
    allEntriesRef.current = []
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
      allEntriesRef.current = entries
      let index = 0

      const addNext = () => {
        if (stoppedRef.current) {
          timerRef.current = null
          finishLoading()
          return
        }

        if (index >= entries.length) {
          timerRef.current = null
          finishLoading()
          applyCurrentFilter()
          return
        }

        if (index >= 9) {
          list.data.add(entries.slice(index).filter(item => isQueryMatch(item, queryRef.current)))
          timerRef.current = null
          finishLoading()
          applyCurrentFilter()
          return
        }

        const item = entries[index]
        index += 1
        if (isQueryMatch(item, queryRef.current)) {
          list.data.add(item)
        }
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

  // 搜索词变化时按版本号/版本ID过滤（加载中由渐进添加自行过滤，完成后统一重建）
  useEffect(() => {
    if (loadingRef.current) return
    applyCurrentFilter()
  }, [query])

  const showNoMatch =
    query.trim() !== "" &&
    !loading &&
    !items.value.some(
      item => item.id !== "header" && isQueryMatch(item, query)
    )

  return (
    <VStack
      spacing={0}
      frame={{ maxHeight: "infinity" }}
      presentationDragIndicator={"visible"}
      presentationDetents={["large"]}
    >
      <HStack
        spacing={8}
        padding={{ horizontal: 16, top: 20, bottom: 6 }}
      >
        <Image systemName="magnifyingglass" imageScale="medium" foregroundStyle="secondaryLabel" />
        <TextField
          title=""
          prompt="搜索版本号或版本ID"
          value={query}
          onChanged={handleQueryChange}
          textFieldStyle="plain"
          textInputAutocapitalization="never"
        />
        {query.length > 0 && (
          <Button
            action={() => handleQueryChange("")}
            buttonStyle="plain"
          >
            <Image systemName="xmark.circle.fill" imageScale="medium" foregroundStyle="secondaryLabel" />
          </Button>
        )}
      </HStack>
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
        {list.render(item => {
          if (item.id !== "header" && !isQueryMatch(item, query)) {
            return <EmptyView />
          }
          return (
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
          )
        }, {
          glassEffect: undefined,
          overlay: undefined,
        })}
        <HStack
          spacing={8}
          hidden={!showNoMatch}
          frame={{ maxWidth: "infinity", alignment: "center" }}
          padding={{ vertical: 12 }}
        >
          <Image systemName="magnifyingglass" imageScale="medium" foregroundStyle="secondaryLabel" />
          <Text foregroundStyle="secondaryLabel">未找到匹配的版本号或版本ID</Text>
        </HStack>
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
    </VStack>
  )
}

export default AppVersionList
