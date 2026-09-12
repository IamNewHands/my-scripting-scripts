import { Intent, Script } from "scripting";
import { AppVersionList } from "./AppVersionList";
import { AnimText } from "./AnimText"
import { PLATFORM, type Store } from "../constants/Platform";

export const IntentAppVersionList = () => {
  const url = String(Intent.urlsParameter?.[0]);
  if (!url.match(/https:\/\/apps\.apple\.com\/[a-zA-Z]{2,3}\/app\//)) {
    return <AnimText foregroundStyle="systemRed">Invalid URL</AnimText>;
  }

  const country = decodeURIComponent(url).split("/")[3].toUpperCase();
  const store: Store = { platform: PLATFORM.IOS, country };

  const [name, id] = decodeURIComponent(url)
    .replace("id", "")
    .split("?")[0]
    .split("/")
    .slice(-2);

  return (
    <AppVersionList
      id={id}
      name={name}
      store={store}
      callback={(_, [internalVersion]) => {
        const openUrl = Script.createRunSingleURLScheme("IPA-Tool", {
          urls: JSON.stringify({ id, name, internalVersion, store }),
        });
        Safari.openURL(openUrl);
      }}
    />
  );
};

