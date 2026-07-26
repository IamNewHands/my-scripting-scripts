import {
  Button,
  Circle,
  Image,
  ZStack,
  useEffect,
  useMemo,
  useObservable,
} from "scripting";
import type { MergedItem } from "../hooks/useDownloadItems";
import { useAppsHook } from "../../../hooks/useAppsState";
import {
  cancelQueuedTask,
  downloadManager,
  startDownload,
} from "../../../services/downloadService";
import { AppConfig, defaultConfig } from "../../../constants/AppConfig";
import { makeAppIconColor } from "../../../hooks";
import type { RGBAColor } from "../../../types/utils";

function FetchingIcon({ value, dominantColor }: { value: string, dominantColor?: RGBAColor | null }) {
  const deg = useObservable(0);
  const animation = useMemo(
    () => ({
      rotationEffect: deg.value,
      animation: {
        animation: Animation.linear(1).repeatForever(false),
        value: deg.value,
      },
    }),
    [deg.value]
  );

  useEffect(() => {
    setTimeout(() => deg.setValue(360), 0)
  }, [value]);

  return (
    <Image
      {...animation}
      systemName="arrow.triangle.2.circlepath"
      renderingMode="template"
      contentTransition="symbolEffect"
      symbolEffect={{ effect: "bounce", value: deg.value }}
      foregroundStyle={dominantColor ? makeAppIconColor(dominantColor) : "systemBlue"}
      scaleEffect={1.15}
    />
  );
}

export default function PlayPauseButton({ item, dominantColor }: { item: MergedItem, dominantColor?: RGBAColor | null }) {
  const isFetching = item.status === "fetching";
  const isQueued = item.status === "queued";
  const isIdle = /queued|cancelled|failed/.test(item.status);
  const isCompleted = item.status === "completed";
  const task =
    item.source === "task" ? useAppsHook.getState()?.[item.appId] : undefined;

  let systemName: string;
  if (isCompleted) systemName = "square.and.arrow.down.badge.checkmark.fill";
  else if (isQueued) systemName = "clock.fill";
  else if (isIdle) systemName = "play.fill";
  else systemName = "stop.fill";

  const normalTint = dominantColor ? makeAppIconColor(dominantColor) : "systemBlue";
  const normalTintFill = dominantColor ? makeAppIconColor(dominantColor, 0.1) : "rgba(0,122,255,0.1)";
  const normalTintStroke = dominantColor ? makeAppIconColor(dominantColor, 0.15) : "rgba(0,122,255,0.15)";
  const normalTintSecondary = dominantColor ? makeAppIconColor(dominantColor, 0.25) : "rgba(0,122,255,0.25)";
  const completedTint = dominantColor ? makeAppIconColor(dominantColor) : "systemGreen";
  const completedTintFill = dominantColor ? makeAppIconColor(dominantColor, 0.1) : "rgba(52,199,89,0.1)";
  const completedTintStroke = dominantColor ? makeAppIconColor(dominantColor, 0.15) : "rgba(52,199,89,0.15)";
  const completedTintSecondary = dominantColor ? makeAppIconColor(dominantColor, 0.25) : "rgba(52,199,89,0.25)";

  return (
    <Button
      buttonStyle="borderless"
      action={() => {
        if (item.status === "completed") {
          const meta = encodeURIComponent(
            `name=${item.name}&bundleId=${item.bundleId}&displayVersion=${item.displayVersion}&fileName=${item.fileName}`
          );
          const plistServer =
            AppConfig.install.plistServer?.trim() || defaultConfig.install.plistServer;
          Safari.openURL(
            `itms-services://?action=download-manifest&url=${plistServer}?${meta}`
          );
        } else if (isQueued) {
          HapticFeedback.mediumImpact();
          cancelQueuedTask(item.appId);
        } else if (isIdle && task?.down) {
          HapticFeedback.mediumImpact();
          startDownload(item.appId, task.down);
        } else if (/fetching|downloading/.test(item.status)) {
          HapticFeedback.mediumImpact();
          downloadManager.findTaskById(item.appId)?.cancel();
        }
      }}
    >
      <ZStack
        frame={{ width: 44, height: 44 }}
        shadow={{ color: "rgba(0,0,0,0.15)", radius: 6, y: 2 }}
      >
        <Circle
          fill={isCompleted ? completedTintFill : normalTintFill}
          frame={{ width: 44, height: 44 }}
        />
        <Circle
          stroke={{
            shapeStyle: isCompleted
              ? completedTintStroke
              : normalTintStroke,
            strokeStyle: { lineWidth: 0.5 },
          }}
          frame={{ width: 40, height: 40 }}
        />
        {isFetching ? (
          <FetchingIcon value={item.status} dominantColor={dominantColor} />
        ) : (
          <Image
            systemName={systemName}
            renderingMode="original"
            contentTransition="symbolEffect"
            foregroundStyle={
              isCompleted
                ? { primary: completedTint, secondary: completedTintSecondary }
                : isQueued
                  ? {
                      primary: "systemOrange",
                      secondary: "rgba(255,149,0,0.25)",
                    }
                  : { primary: normalTint, secondary: normalTintSecondary }
            }
            scaleEffect={1.2}
            symbolEffect={{ effect: "bounce", value: item.status }}
            animation={{
              animation: Animation.linear(0.3),
              value: isCompleted,
            }}
            opacity={0.8}
          />
        )}
      </ZStack>
    </Button>
  );
}
