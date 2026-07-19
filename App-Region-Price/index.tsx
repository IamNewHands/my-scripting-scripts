import { Navigation, Script } from "scripting";
import { View } from "./page/index";

(async () => {
  await Navigation.present({
    element: <View />,
    // modalPresentationStyle: Device.isiPhone ? undefined : "fullScreen",
  });
})()
  .catch(async (e) => {
    await Dialog.alert({
      title: "错误",
      message: String(e),
    });
  })
  .finally(Script.exit);
