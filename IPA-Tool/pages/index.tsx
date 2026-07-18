/**
 * File: pages/index.tsx
 *
 * TabView 根组件 (iOS 18+ Tab API)
 * 管理应用的 Tab 导航，包括搜索、下载、文件和设置四个页面
 */
import { TabView, Tab as TabItem } from "scripting";

import SearchView from "./SearchNext";
import DownloadV2View from "./Download";
import SettingsView from "./Settings";
import { useTabs, useDownloadCount, useScenePhase } from "../hooks";
import { Tab } from "../hooks/useTabs";

export default function TabViewApp() {
  const { downTask } = useDownloadCount();
  const selection = useTabs();
  useScenePhase();

  return (
    <TabView selection={selection} tabBarMinimizeBehavior="automatic">
      <TabItem title="" systemImage="magnifyingglass" value={Tab.Search} role="search">
        <SearchView />
      </TabItem>

      <TabItem
        title=""
        systemImage="arrow.down.circle"
        value={Tab.Download}
        badge={downTask.filter(i => i.status === "downloading").length}
      >
        <DownloadV2View />
      </TabItem>

      <TabItem title="" systemImage="gearshape" value={Tab.Settings}>
        <SettingsView />
      </TabItem>
    </TabView>
  );
}
