/**
 * File: pages/Settings/Config/index.tsx
 *
 * 响应式配置组件
 * 显示和管理应用配置项
 */

import { NavigationStack, Rectangle, List, ZStack } from "scripting";
import { AppConfig } from "../../../constants/AppConfig";
import { DownloadConfigSection } from "./DownloadConfigSection";
import { NotificationConfigSection } from "./NotificationConfigSection";
import { InstallConfigSection } from "./InstallConfigSection";
import { AppearanceConfigSection } from "./AppearanceConfigSection";
import { ResetConfigButton } from "./ResetConfigButton";
import { useLoginToast } from "../../../hooks";
import {
  PageBackground,
  EditableGlassListRow,
} from "../../../components/EditableGlassListPipeline";

/**
 * 配置页面组件
 */
const ConfigView = ({ dismiss }: { dismiss: () => void }) => {
  const { toastConfig, showToast } = useLoginToast();
  return (
    <NavigationStack>
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <PageBackground />
        <List
          toast={toastConfig}
          navigationTitle="设置"
          scrollContentBackground="hidden"
          listRowBackground={<Rectangle fill="clear" />}
          listStyle="plain"
          listSectionSpacing={5}
        >
          {/* 下载任务配置 */}
          <DownloadConfigSection
            initialValue={AppConfig.download}
            onChange={value => (AppConfig.download = value)}
          />
          {/* 通知配置 */}
          <NotificationConfigSection
            initialValue={AppConfig.notification}
            onChange={value => (AppConfig.notification = value)}
          />
          {/* 外观配置 */}
          <AppearanceConfigSection
            initialValue={AppConfig.appearance}
            onChange={value => (AppConfig.appearance = value)}
          />
          {/* 安装配置 */}
          <InstallConfigSection
            initialValue={AppConfig.install}
            onChange={value => (AppConfig.install = value)}
          />

          {/* 底部重置按钮 */}
          <ResetConfigButton showToast={showToast} dismiss={dismiss} />
        </List>
      </ZStack>
    </NavigationStack>
  );
};

export default ConfigView;
