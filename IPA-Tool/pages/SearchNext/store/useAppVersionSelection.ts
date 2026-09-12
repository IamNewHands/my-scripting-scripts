import { createGlobalState } from "../../../modules/createGlobalStateUtils";
import { PLATFORM, type Platform } from "../../../constants/Platform";

export type VersionSelection = {
  bestChoice: string;
  internalVersion: string;
  displayVersion: string;
};

type PlatformSelection = Partial<Record<Platform, VersionSelection>>;

type VersionSelectionState = Record<string, PlatformSelection>;

const init: VersionSelectionState = {};

type Action = [string, keyof PlatformSelection, [string, string]];

/** 应用版本选择状态：以 appId 为 key，分别保存 iOS 与 tvOS 选择。 */
export const useAppVersionSelection = createGlobalState(
  (state: VersionSelectionState, action: Action) => {
    const [appId, platform, versionInfo] = action;
    const [internalVersion, displayVersion] = versionInfo;
    const bestChoice = displayVersion === "????" ? internalVersion : displayVersion;
    if (bestChoice === "暂无历史版本记录") return state;
    return {
      ...state,
      [appId]: {
        ...state[appId],
        [platform]: { bestChoice, internalVersion, displayVersion },
      },
    };
  },
  init,
  { autoReset: false }
);
