import { HStack, Spacer, useMemo } from "scripting";
import type { MergedItem } from "../hooks/useDownloadItems";
import { AppConfig } from "../../../constants/AppConfig";
import { useCachedAppIcon } from "../../../hooks";
import AppIcon from "./AppIcon";
import DownloadingInfo from "./DownloadingInfo";
import CompletedInfo from "./CompletedInfo";
import PlayPauseButton from "./PlayPauseButton";

export default function DownloadRow({ item }: { item: MergedItem }) {
  const isCompleted = item.status === "completed";
  const appIconAccent = AppConfig.appearance.appIconAccent;
  const iconUrl = item.icon?.startsWith("http") ? item.icon : null;
  const appIcon = useCachedAppIcon(iconUrl);
  const accentColors = appIconAccent ? appIcon.dominantColors : [];
  const accentColorKey = accentColors.map(color => color.hex).join(",");

  return useMemo(
    () => (
      <HStack
        padding={true}
        spacing={16}
        background={appIconAccent ? appIcon.background : undefined}
      >
        <AppIcon icon={item.icon} appIcon={appIcon} />
        <Spacer />
        {isCompleted ? (
          <CompletedInfo item={item} />
        ) : (
          <DownloadingInfo item={item} dominantColors={accentColors} />
        )}
        <Spacer />
        <PlayPauseButton item={item} dominantColors={accentColors} />
      </HStack>
    ),
    [
      item.status,
      item.id,
      item.icon,
      appIconAccent,
      appIcon.image,
      appIcon.background,
      accentColorKey,
    ]
  );
}
