import { Intent, Script } from "scripting";
import { AppVersionList } from "./AppVersionList";
import { AnimText } from "./AnimText"

export const IntentAppVersionList = () => {
  const url = String(Intent.urlsParameter?.[0]);
  if (!url.match(/https:\/\/apps\.apple\.com\/[a-zA-Z]{2,3}\/app\//)) {
    return <AnimText foregroundStyle="systemRed">Invalid URL</AnimText>;
  }

  const [name, id] = decodeURIComponent(url)
    .replace("id", "")
    .split("?")[0]
    .split("/")
    .slice(-2);

  return (
    <AppVersionList
      id={id}
      name={name}
      callback={(_, [internalVersion]) => {
        const openUrl = Script.createRunSingleURLScheme("IPA-Tool", {
          urls: JSON.stringify({ id, name, internalVersion }),
        });
        Safari.openURL(openUrl);
      }}
    />
  );
};

