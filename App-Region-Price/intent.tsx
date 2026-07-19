import { Navigation, Script, Intent, NavigationStack, Button } from "scripting"
import { View as DetailView } from "./page/detail"
import { parseAppId } from "./util/validate"

;(async () => {
  if (!Intent.urlsParameter) {
    await Dialog.alert({ title: "无效", message: "请从 App Store 分享链接调用此捷径" })
    return
  }

  const appid = parseAppId(String(Intent.urlsParameter))
  if (!appid) {
    await Dialog.alert({
      title: "无法识别",
      message: "未能从链接中解析出 App ID，请确认分享的是 App Store 应用链接。",
    })
    return
  }

  await Navigation.present({
    element: <AppView appid={appid} />,
  })
})()
  .catch(async (e) =>
    await Dialog.alert({ title: "错误", message: String(e) })
  )
  .finally(Script.exit)

function AppView({ appid }: { appid: string }) {
  const dismiss = Navigation.useDismiss()
  return (
    <NavigationStack>
      <DetailView
        id={appid}
        navigationTitle={Script.name}
        toolbar={{
          topBarLeading: [<Button title="关闭" systemImage={"xmark"} action={dismiss} />],
        }}
      />
    </NavigationStack>
  )
}
