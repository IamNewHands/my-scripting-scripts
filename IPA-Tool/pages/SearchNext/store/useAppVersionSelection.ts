import { createGlobalState } from "../../../modules/createGlobalStateUtils";

const init: {
  [appId: string]: {
    bestChoice: string;
    internalVersion: string;
    displayVersion: string;
  };
} = {};

type Action = [string, [string, string]];
/**
 * 应用版本选择状态管理
 * 创建 appId → 选择的历史版本 的映射表
 * 将选择的历史版本同步到展示组件
 */
export const useAppVersionSelection = createGlobalState(
  (state, action: Action) => {
    const [appId, versionInfo] = action;
    const [internalVersion, displayVersion] = versionInfo;
    const bestChoice =
      displayVersion === "????" ? internalVersion : displayVersion;
    if (bestChoice === "暂无历史版本记录") return state;
    return {
      ...state,
      [appId]: {
        bestChoice,
        internalVersion,
        displayVersion,
      },
    };
  },
  init,
  { autoReset: false }
);
