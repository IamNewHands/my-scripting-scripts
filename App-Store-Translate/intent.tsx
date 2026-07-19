import { Navigation, Notification, Script, Intent } from "scripting";
import { View } from "./page/index";

(async () => {
  const url = String(Intent.urlsParameter) || "";

  if (url === "") throw new Error("请传入有效的 App Store 链接");

  await Navigation.present({
    element: <View url={url} />,
  });
})()
  .catch(async (e) => {
    await Notification.schedule({
      title: Script.name,
      subtitle: "❌错误",
      body: e.message,
    });
  })
  .finally(() => {
    Script.exit();
  });
