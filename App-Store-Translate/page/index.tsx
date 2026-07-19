import {
  Button,
  Image,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Script,
  Section,
  Text,
  useEffect,
  useMemo,
  useObservable,
} from "scripting"
import { InfoSection } from "./info"
import { SettingsView } from "./settings"
import { TranslateSection } from "./translate"
import { getAppInfo } from "../util/itunes"
import {
  getTranslateEngine,
  getTranslateEngineLabel,
  type TranslateEngine,
} from "../util/settings"

export function View({ url }: { url: string }) {
  const dismiss = Navigation.useDismiss()
  return (
    <NavigationStack>
      <StackView
        url={url}
        navigationTitle={Script.name}
        toolbar={{
          topBarLeading: [
            <Button title="关闭" systemImage={"xmark"} action={dismiss} />,
          ],
          topBarTrailing: [
            <NavigationLink destination={<SettingsView />}>
              <Image systemName="gearshape" />
            </NavigationLink>,
            <Button
              title="分享"
              systemImage={"square.and.arrow.up"}
              action={async () => ShareSheet.present([url])}
            />,
          ],
        }}
      />
    </NavigationStack>
  )
}

function StackView({ url }: { url: string }) {
  const data = useObservable<any>()
  const engine = useObservable<TranslateEngine>(() => getTranslateEngine())
  // 系统翻译需要绑定 UI 宿主，以便弹出语言下载/选择提示
  const translation = useMemo(() => new Translation(), [])

  // 从 URL 中提取应用 ID 和区域
  const urlMap = url.split("/")
  const appid = urlMap[urlMap.length - 1].split("?")[0].replace("id", "") || ""
  const region = urlMap[3] || "cn"

  async function fetchAppInfo() {
    await getAppInfo(appid, region).then((r) => data.setValue(r))
  }

  function reloadEngine() {
    engine.setValue(getTranslateEngine())
  }

  useEffect(() => {
    fetchAppInfo()
  }, [])

  const engineLabel = getTranslateEngineLabel(engine.value ?? "ai")

  return (
    <List
      refreshable={fetchAppInfo}
      translationHost={translation}
      onAppear={reloadEngine}
    >
      <Section
        header={<Text>应用信息</Text>}
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {"当前翻译引擎：" + engineLabel}
          </Text>
        }
      >
        <InfoSection
          name={data.value?.trackName || ""}
          appid={data.value ? appid : ""}
          version={data.value?.version || ""}
          date={data.value?.releaseDate || ""}
          symbol={data.value?.bundleId || ""}
        />
      </Section>
      <Section title="发布说明">
        <TranslateSection
          content={data.value?.releaseNotes || ""}
          engine={engine.value ?? "ai"}
          translation={translation}
        />
      </Section>
      <Section title="应用说明">
        <TranslateSection
          content={data.value?.description || ""}
          engine={engine.value ?? "ai"}
          translation={translation}
        />
      </Section>
    </List>
  )
}
