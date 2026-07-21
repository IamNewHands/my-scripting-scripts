import {
  Button,
  Navigation,
  NavigationStack,
  Text,
  VStack,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "scripting"

export type NativePlayerPageProps = {
  filePath: string
  title?: string
}

export function NativePlayerPage(props: NativePlayerPageProps) {
  const dismiss = Navigation.useDismiss()
  const player = useMemo(() => new AVPlayer(), [])
  const disposed = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    disposed.current = false
    let cancelled = false
    void (async () => {
      try {
        if (!(await FileManager.exists(props.filePath))) {
          if (!cancelled) setError("本地文件不存在或已被清理。")
          return
        }
        try {
          await SharedAudioSession.setCategory("playback", ["mixWithOthers"])
          await SharedAudioSession.setActive(true)
        } catch {}
        player.onReadyToPlay = () => {
          if (disposed.current || cancelled) return
          setReady(true)
          if (!player.play()) setError("无法开始播放。")
        }
        player.onError = (err: unknown) => {
          if (disposed.current || cancelled) return
          const message = err instanceof Error ? err.message : String(err || "播放器错误")
          setError(message)
        }
        if (!player.setSource(props.filePath)) {
          if (!cancelled) setError("无法加载该视频文件。")
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
      disposed.current = true
      try { player.stop() } catch {}
      try { player.dispose?.() } catch {}
      try { void SharedAudioSession.setActive(false, ["notifyOthersOnDeactivation"]) } catch {}
    }
  }, [props.filePath])

  return (
    <NavigationStack>
      <VStack
        spacing={12}
        padding={16}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        navigationTitle={props.title || "播放"}
        navigationBarTitleDisplayMode="inline"
        toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}
      >
        {error ? (
          <VStack spacing={10} frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" as any }}>
            <Text foregroundStyle="secondaryLabel">{error}</Text>
            <Button title="关闭" action={dismiss} />
          </VStack>
        ) : (
          <VStack spacing={8} frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
            {/* @ts-expect-error AVPlayerView 为 Scripting 运行时组件 */}
            <AVPlayerView player={player} showsPlaybackControls={true} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} />
            {!ready ? <Text font="caption" foregroundStyle="secondaryLabel">正在准备播放…</Text> : null}
            <Button title="用其他 App 打开" systemImage="square.and.arrow.up" action={() => void ShareSheet.present([props.filePath])} />
          </VStack>
        )}
      </VStack>
    </NavigationStack>
  )
}

export async function presentNativePlayer(filePath: string, title?: string): Promise<void> {
  if (!(await FileManager.exists(filePath))) {
    await Dialog.alert({ title: "无法播放", message: "本地文件不存在或已被清理。" })
    return
  }
  await Navigation.present({ element: <NativePlayerPage filePath={filePath} title={title} /> })
}

export async function openWithOtherApps(filePath: string): Promise<void> {
  if (!(await FileManager.exists(filePath))) {
    await Dialog.alert({ title: "无法打开", message: "本地文件不存在或已被清理。" })
    return
  }
  await ShareSheet.present([filePath])
}

