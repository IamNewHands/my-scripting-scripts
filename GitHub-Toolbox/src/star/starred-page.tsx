import {
  Button,
  HStack,
  Image,
  List,
  Menu,
  Navigation,
  NavigationLink,
  NavigationStack,
  Script,
  Section,
  Tab,
  TabView,
  Text,
  Toggle,
  Toolbar,
  ToolbarItem,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import { fetchStarredRepositories, hasGitHubToken, removeGitHubToken, saveGitHubToken } from "./github-api"
import { IconButton, PageBackground, RepositoryRow, StatusSurface } from "./glass-ui"
import { PinnedRepositoriesPage } from "./pinned-repositories-page"
import { readPinnedRepositoryIDs, savePinnedRepositoryIDs } from "./pinned-repositories"
import type { GitHubRepository, LoadState } from "./types"

type PresentationStyle = "automatic" | "overFullScreen"
type PresentationResult =
  | { type: "close-script" }
  | { type: "change-presentation-style"; style: PresentationStyle }
  | { type: "change-layout"; bottomTabs: boolean }

export default function StarredPage({ presentationStyle, bottomTabs }: { presentationStyle: PresentationStyle; bottomTabs: boolean }) {
  const dismiss = Navigation.useDismiss()
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [state, setState] = useState<LoadState>(hasGitHubToken() ? "loading" : "idle")
  const [error, setError] = useState("")
  const [pinnedIDs, setPinnedIDs] = useState(readPinnedRepositoryIDs)

  const repositoryByID = new Map(repositories.map(repository => [repository.id, repository]))
  const pinnedRepositories = pinnedIDs.flatMap(id => {
    const repository = repositoryByID.get(id)
    return repository ? [repository] : []
  })
  const unpinnedRepositories = repositories.filter(repository => !pinnedIDs.includes(repository.id))

  function updatePinnedIDs(ids: number[]) {
    const availableIDs = new Set(repositories.map(repository => repository.id))
    const validIDs = [...new Set(ids)].filter(id => availableIDs.has(id))
    savePinnedRepositoryIDs(validIDs)
    setPinnedIDs(validIDs)
  }

  async function loadRepositories() {
    if (!hasGitHubToken()) {
      setState("idle")
      return
    }

    setState("loading")
    setError("")
    try {
      const loadedRepositories = await fetchStarredRepositories()
      setRepositories(loadedRepositories)
      const availableIDs = new Set(loadedRepositories.map(repository => repository.id))
      const validPinnedIDs = pinnedIDs.filter(id => availableIDs.has(id))
      if (validPinnedIDs.length !== pinnedIDs.length) {
        savePinnedRepositoryIDs(validPinnedIDs)
        setPinnedIDs(validPinnedIDs)
      }
      setState("loaded")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取 GitHub Star。")
      setState("error")
    }
  }

  async function configureToken() {
    const token = await Dialog.prompt({
      title: "GitHub Access Token",
      message: "保存一个只读 Token，并授予“已加星仓库”的读取权限。",
      placeholder: "github_pat_...",
      obscureText: true,
      confirmLabel: "保存",
    })
    if (!token?.trim()) return

    if (!saveGitHubToken(token)) {
      await Dialog.alert({ title: "无法保存", message: "Keychain 未能保存 Token，请检查设备权限后重试。" })
      return
    }
    await loadRepositories()
  }

  function removeToken() {
    removeGitHubToken()
    setRepositories([])
    setError("")
    setState("idle")
  }

  const supportsMinimization = Script.supportsMinimization()

  function handleClose() {
    dismiss({ type: "close-script" } satisfies PresentationResult)
  }

  async function handleMinimize() {
    if (!supportsMinimization || Script.isMinimized()) return
    await Script.minimize()
  }

  useEffect(() => {
    if (hasGitHubToken()) void loadRepositories()
  }, [])

  const accountMenu = (
    <Menu label={<Image systemName="key.fill" foregroundStyle="label" />}>
      <Button action={() => { void configureToken() }} accessibilityLabel="更新 Token">
        <HStack spacing={10}><Image systemName="key.horizontal" foregroundStyle="systemRed" frame={{ width: 22 }} /><Text>更新 Token</Text></HStack>
      </Button>
      <Button role="destructive" action={removeToken} accessibilityLabel="移除 Token">
        <HStack spacing={10}><Image systemName="key.slash" foregroundStyle="systemRed" frame={{ width: 22 }} /><Text>移除 Token</Text></HStack>
      </Button>
      <Toggle
        value={presentationStyle === "overFullScreen"}
        onChanged={(enabled) => {
          const nextStyle: PresentationStyle = enabled ? "overFullScreen" : "automatic"
          if (nextStyle !== presentationStyle) dismiss({ type: "change-presentation-style", style: nextStyle } satisfies PresentationResult)
        }}
        accessibilityLabel={presentationStyle === "overFullScreen" ? "全面屏显示，已开启" : "全面屏显示，已关闭"}
        accessibilityHint="开启后使用 overFullScreen 呈现；关闭后使用标准窗口呈现。"
      >
        <HStack spacing={10}><Image systemName="arrow.up.left.and.arrow.down.right" foregroundStyle="systemRed" frame={{ width: 22 }} /><Text>全面屏显示</Text></HStack>
      </Toggle>
      <Toggle
        value={bottomTabs}
        onChanged={(enabled) => dismiss({ type: "change-layout", bottomTabs: enabled } satisfies PresentationResult)}
        accessibilityLabel={bottomTabs ? "使用底部标签页，已开启" : "使用底部标签页，已关闭"}
        accessibilityHint="开启后将钥匙、置顶和 Star 列表放入底部标签页。"
      >
        <HStack spacing={10}><Image systemName="rectangle.3.group.fill" foregroundStyle="systemRed" frame={{ width: 22 }} /><Text>使用底部标签页</Text></HStack>
      </Toggle>
      <Button title="关闭脚本" systemImage="xmark.circle" role="destructive" action={() => dismiss({ type: "close-script" } satisfies PresentationResult)} />
    </Menu>
  )

  const renderRepositoryList = (toolbar?: JSX.Element) => (
    <List
      listStyle="inset"
      refreshable={loadRepositories}
      scrollContentBackground="hidden"
      scrollEdgeEffectHidden={{ edges: "top", hidden: true }}
      listRowBackground={<></>}
      listRowSeparator="hidden"
      navigationTitle="Stars"
      navigationBarTitleDisplayMode="inline"
      toolbar={toolbar}
    >
      <Section listRowBackground={<></>} listRowSeparator="hidden">
        <Header total={repositories.length} pinnedTotal={pinnedRepositories.length} state={state} />
        {state === "idle" ? <StatusSurface icon="key.fill" title="连接你的 GitHub" detail="添加一个具有“已加星仓库”读取权限的 Personal Access Token，即可查看已加星仓库的最新代码推送。" action={() => { void configureToken() }} /> : null}
        {state === "loading" && repositories.length === 0 ? <StatusSurface icon="arrow.triangle.2.circlepath" title="正在更新" detail="正在读取并按最新代码推送时间排序。" /> : null}
        {state === "error" ? <StatusSurface icon="exclamationmark.triangle.fill" title="更新失败" detail={error} action={() => { void loadRepositories() }} /> : null}
        {state === "loaded" && repositories.length === 0 ? <StatusSurface icon="star.slash" title="还没有已加星的仓库" detail="GitHub 返回的已加星仓库列表为空。" /> : null}
        {pinnedRepositories.map(repository => <RepositoryRow key={repository.id} repository={repository} pinned={true} onOpen={async () => { await Safari.openURL(repository.htmlUrl) }} />)}
        {unpinnedRepositories.map(repository => <RepositoryRow key={repository.id} repository={repository} onOpen={async () => { await Safari.openURL(repository.htmlUrl) }} />)}
      </Section>
    </List>
  )

  const pinnedTab = (
    <NavigationStack>
      <PinnedRepositoriesPage repositories={repositories} initialPinnedIDs={pinnedIDs} onChange={updatePinnedIDs} />
    </NavigationStack>
  )

  const accountTab = (
    <NavigationStack>
      <List listStyle="inset" scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden" navigationTitle="GitHub 账户" navigationBarTitleDisplayMode="inline">
        <Section listRowBackground={<></>} listRowSeparator="hidden">
          <StatusSurface
            icon="person.crop.circle"
            iconForegroundStyle="systemRed"
            title="GitHub 账户"
            detail="管理 Token、呈现方式和页面布局。"
          />
          <VStack
            spacing={10}
            frame={{ maxWidth: "infinity" }}
          >
            <Button
              action={() => { void configureToken() }}
              accessibilityLabel="更新 Token"
              buttonStyle="plain"
              frame={{ maxWidth: "infinity", minHeight: 52, alignment: "leading" }}
              padding={{ horizontal: 16 }}
              glassEffect={{ glass: UIGlass.clear().interactive(true), shape: { type: "rect", cornerRadius: 16, style: "continuous" } }}
              glassEffectTransition="materialize"
            >
              <HStack spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="key.horizontal" foregroundStyle="systemRed" frame={{ width: 22 }} />
                <Text>更新 Token</Text>
              </HStack>
            </Button>
            <Button
              role="destructive"
              accessibilityLabel="移除 Token"
              action={removeToken}
              buttonStyle="plain"
              frame={{ maxWidth: "infinity", minHeight: 52, alignment: "leading" }}
              padding={{ horizontal: 16 }}
              glassEffect={{ glass: UIGlass.clear().interactive(true), shape: { type: "rect", cornerRadius: 16, style: "continuous" } }}
              glassEffectTransition="materialize"
            >
              <HStack spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="key.slash" foregroundStyle="systemRed" frame={{ width: 22 }} />
                <Text>移除 Token</Text>
              </HStack>
            </Button>
            <Toggle
              value={presentationStyle === "overFullScreen"}
              onChanged={(enabled) => {
                const nextStyle: PresentationStyle = enabled ? "overFullScreen" : "automatic"
                if (nextStyle !== presentationStyle) dismiss({ type: "change-presentation-style", style: nextStyle } satisfies PresentationResult)
              }}
              frame={{ maxWidth: "infinity", minHeight: 52, alignment: "leading" }}
              padding={{ horizontal: 16 }}
              glassEffect={{ glass: UIGlass.clear().interactive(true), shape: { type: "rect", cornerRadius: 16, style: "continuous" } }}
              glassEffectTransition="materialize"
              accessibilityLabel={presentationStyle === "overFullScreen" ? "全面屏显示，已开启" : "全面屏显示，已关闭"}
              accessibilityHint="开启后使用 overFullScreen 呈现；关闭后使用标准窗口呈现。"
            >
              <HStack spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="arrow.up.left.and.arrow.down.right" foregroundStyle="systemRed" frame={{ width: 22 }} />
                <Text>全面屏显示</Text>
              </HStack>
            </Toggle>
            <Toggle
              value={bottomTabs}
              onChanged={(enabled) => dismiss({ type: "change-layout", bottomTabs: enabled } satisfies PresentationResult)}
              frame={{ maxWidth: "infinity", minHeight: 52, alignment: "leading" }}
              padding={{ horizontal: 16 }}
              glassEffect={{ glass: UIGlass.clear().interactive(true), shape: { type: "rect", cornerRadius: 16, style: "continuous" } }}
              glassEffectTransition="materialize"
              accessibilityLabel={bottomTabs ? "使用底部标签页，已开启" : "使用底部标签页，已关闭"}
              accessibilityHint="关闭后恢复顶部 toolbar 布局。"
            >
              <HStack spacing={12} frame={{ maxWidth: "infinity", alignment: "leading" }}>
                <Image systemName="rectangle.3.group.fill" foregroundStyle="systemRed" frame={{ width: 22 }} />
                <Text>使用底部标签页</Text>
              </HStack>
            </Toggle>
          </VStack>
        </Section>
      </List>
    </NavigationStack>
  )

  if (bottomTabs) {
    const tabToolbar = (
      <Toolbar>
        <ToolbarItem placement="topBarLeading" sharedBackgroundVisibility="visible">
          <Button title="关闭" systemImage="xmark" action={handleClose} buttonStyle="plain" frame={{ minWidth: 44, minHeight: 44 }} />
        </ToolbarItem>
        {supportsMinimization ? (
          <ToolbarItem placement="topBarTrailing" sharedBackgroundVisibility="visible">
            <Button title="最小化" systemImage="arrow.down.right.and.arrow.up.left" action={() => { void handleMinimize() }} buttonStyle="plain" frame={{ minWidth: 44, minHeight: 44 }} />
          </ToolbarItem>
        ) : null}
      </Toolbar>
    )

    return (
      <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
        <PageBackground />
        <NavigationStack>
          <TabView toolbar={tabToolbar}>
            <Tab title="Stars" systemImage="star.fill" value="stars"><NavigationStack>{renderRepositoryList()}</NavigationStack></Tab>
            <Tab title="置顶" systemImage="pin.fill" value="pinned">{pinnedTab}</Tab>
            <Tab title="账户" systemImage="key.fill" value="account">{accountTab}</Tab>
          </TabView>
        </NavigationStack>
      </ZStack>
    )
  }

  const topToolbar = (
    <Toolbar>
      <ToolbarItem placement="topBarLeading">{accountMenu}</ToolbarItem>
      <ToolbarItem placement="topBarTrailing">
        <HStack spacing={4}>
          <NavigationLink accessibilityLabel="管理置顶仓库" destination={<PinnedRepositoriesPage repositories={repositories} initialPinnedIDs={pinnedIDs} onChange={updatePinnedIDs} />}>
            <Image systemName="pin.fill" foregroundStyle="label" frame={{ minWidth: 44, minHeight: 44 }} />
          </NavigationLink>
          <IconButton icon="arrow.clockwise" label="刷新 Star 仓库" action={() => { void loadRepositories() }} />
        </HStack>
      </ToolbarItem>
    </Toolbar>
  )

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <PageBackground />
      <NavigationStack>{renderRepositoryList(topToolbar)}</NavigationStack>
    </ZStack>
  )
}

function Header({ total, pinnedTotal, state }: { total: number; pinnedTotal: number; state: LoadState }) {
  return (
    <VStack
      spacing={4}
      alignment="leading"
      padding={{ horizontal: 16, vertical: 14 }}
      frame={{ maxWidth: "infinity", alignment: "leading" }}
      glassEffect={{ glass: UIGlass.clear().interactive(false), shape: { type: "rect", cornerRadius: 16 } }}
    >
      <Text font={20} fontWeight="bold" foregroundStyle="label">Star 仓库</Text>
      <HStack spacing={6}>
        <Text font={13} foregroundStyle="secondaryLabel">
          {state === "loaded" ? `${total} 个仓库${pinnedTotal > 0 ? ` · ${pinnedTotal} 个置顶` : ""}` : "按最近推送时间排列"}
        </Text>
        {state === "loading" ? <Text font={13} foregroundStyle="secondaryLabel">同步中</Text> : null}
      </HStack>
    </VStack>
  )
}
