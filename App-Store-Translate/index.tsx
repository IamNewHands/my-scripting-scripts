import { Navigation, Script } from "scripting";
import { View } from "./page/index";

(async () => {
  // Test
  const url = "https://apps.apple.com/cn/app/%E4%BF%9D%E5%8D%AB%E8%90%9D%E5%8D%9C4/id1123876959";

  await Navigation.present({
    element: <View url={url} />,
  });
})()
  .catch((e) => console.error(e))
  .finally(Script.exit);
