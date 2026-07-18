import { Intent, Navigation, Script } from "scripting";
import { redirectIpaToApp } from "./utils/redirectIpaToApp";
import { IntentAppVersionList } from "./components/IntentAppVersionList";

const intentStrategies = [
  {
    match: Intent.fileURLsParameter?.some(i => i.endsWith(".ipa")),
    action: () => redirectIpaToApp(Intent.fileURLsParameter ?? []),
  },
  {
    match: Intent.urlsParameter?.some(i =>
      i.startsWith("https://apps.apple.com/")
    ),
    component: <IntentAppVersionList />,
  },
];

const presentIntentView = async () => {
  const strategy = intentStrategies.find(i => i.match);

  
  if (!strategy) {
    return Script.exit();
  }

  if (strategy?.component) {
    await Navigation.present(strategy.component);
  }

  if (strategy?.action) {
    await strategy.action();
  }

  Script.exit();
};

presentIntentView();
