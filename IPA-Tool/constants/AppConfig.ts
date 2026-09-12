// 文件：scripts/ipaTool/constants/appConfig.ts
// 说明：全局业务配置，供各模块与 Hook 使用（不包含样式）
import { deepProxy } from "../utils/deepProxy";
import { EventBus } from "../modules/EventBus";
import type { DeepMutable } from "../types/utils";
import { AppResources } from "./AppResources";

const bus = new EventBus();

// 下载相关配置
export const defaultConfig = Object.freeze({
  // 下载配置
  download: Object.freeze({
    maxTaskCount: 10,
    maxDownloadingCount: 3,
  }),

  // 文件夹路径
  file: Object.freeze({
    folder: "app-temp",
  }),

  // 本地 HTTP 服务配置
  server: Object.freeze({
    host: "127.0.0.1",
    port: 8000,
  }),

  // 通知配置
  notification: Object.freeze({
    downloadSuccess: true,
    downloadFailed: true,
    serverNotification: true,
    debugLogging: false, // 调试日志（写入 IPA-Tool_debug.log，维护版新增）
  }),

  // 外观配置
  appearance: Object.freeze({
    appIconAccent: true,
  }),

  // 实验配置
  experimental: Object.freeze({
    sapSignCache: true,
  }),

  // 安装配置
  install: Object.freeze({
    plistServer: "https://api.scripting.fun/ipa-plist",
    disableUpdateCheck: false, // 安装后禁用 App Store 更新检查（免更新，维护版新增）
  }),
});

let config = Storage.get(AppResources.downloadConfig);
if (!config) {
  config = JSON.parse(JSON.stringify(defaultConfig));
  Storage.set(AppResources.downloadConfig, config);
} else {
  const storedConfig = JSON.parse(JSON.stringify(config));
  delete storedConfig.storageKeys;
  config = { ...JSON.parse(JSON.stringify(defaultConfig)), ...storedConfig };
  Storage.set(AppResources.downloadConfig, config);
}

// ============ 类型定义 ============
type AppConfigType = DeepMutable<typeof defaultConfig>;
type ConfigKey = keyof AppConfigType;
type ConfigValue<K extends ConfigKey> = AppConfigType[K];

/**
 * 全局应用配置对象（响应式）
 * 使用 deepProxy 包装，实现配置修改时的自动持久化和事件通知
 */
export const AppConfig = deepProxy(config as AppConfigType, {
  set: (target, key, value, oldValue) => {
    Storage.set(AppResources.downloadConfig, config);
    bus.emit(AppResources.downloadConfig, key, value, oldValue);
  },
});

// ============ 函数重载定义 ============
export function onConfigChange<K extends ConfigKey>(
  callback: (
    key: K,
    newValue: ConfigValue<K>,
    oldValue: ConfigValue<K>
  ) => void,
  keyFilter: K
): () => void;

export function onConfigChange(
  callback: (
    key: ConfigKey,
    newValue: AppConfigType[ConfigKey],
    oldValue: AppConfigType[ConfigKey]
  ) => void
): () => void;

// ============ 实现 ============
export function onConfigChange(
  callback: (
    key: ConfigKey,
    newValue: AppConfigType[ConfigKey],
    oldValue: AppConfigType[ConfigKey]
  ) => void,
  keyFilter?: ConfigKey
) {
  const handler = (
    key: string | symbol,
    newValue: unknown,
    oldValue: unknown
  ) => {
    if (typeof key !== "string" || !(key in AppConfig)) return;
    const configKey = key as ConfigKey;
    if (keyFilter === undefined || configKey === keyFilter) {
      callback(
        configKey,
        newValue as AppConfigType[ConfigKey],
        oldValue as AppConfigType[ConfigKey]
      );
    }
  };

  bus.on(AppResources.downloadConfig, handler);
  return () => {
    bus.off(AppResources.downloadConfig, handler);
  };
}

/** 将配置恢复为默认值并触发持久化。 */
export const resetConfig = () => {
  const defaultConfigCopy = JSON.parse(JSON.stringify(defaultConfig));
  Object.keys(defaultConfigCopy).forEach(key => {
    const configKey = key as ConfigKey;
    AppConfig[configKey] = defaultConfigCopy[configKey];
  });
};
