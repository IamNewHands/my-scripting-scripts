import {
  Navigation,
  Script,
  NavigationStack,
  List,
  Section,
  Button,
  Text,
  HStack,
  VStack,
  Image,
} from "scripting"
import { View as GistView } from "./src/gist/page"
import StarredPage from "./src/star/starred-page"
import { ActionsRoot } from "./src/actions/index"

// Star 展示样式偏好（与 Github Star 原脚本共用 Storage key）
const PRESENTATION_STYLE_KEY = "github-star.presentation-style"
const BOTTOM_TABS_KEY = "github-star.bottom-tabs"
type PresentationStyle = "automatic" | "overFullScreen"
type PresentationResult =
  | { type: "close-script" }
  | { type: "change-presentation-style"; style: PresentationStyle }
  | { type: "change-layout"; bottomTabs: boolean }
  | undefined

function readPresentationStyle(): PresentationStyle {
  return Storage.get<string>(PRESENTATION_STYLE_KEY) === "overFullScreen" ? "overFullScreen" : "automatic"
}

function readBottomTabs(): boolean {
  return Storage.get<boolean>(BOTTOM_TABS_KEY) === true
}

// 打开 Gist 管理
async function openGist() {
  await Navigation.present({
    element: <GistView />,
    modalPresentationStyle: "overFullScreen",
  })
}

// 打开 GitHub Star（保留原脚本的展示样式切换循环）
async function openStar() {
  let result: PresentationResult
  do {
    result = await Navigation.present<PresentationResult>({
      element: <StarredPage presentationStyle={readPresentationStyle()} bottomTabs={readBottomTabs()} />,
      modalPresentationStyle: readPresentationStyle(),
    })
    if (result?.type === "change-presentation-style") {
      Storage.set(PRESENTATION_STYLE_KEY, result.style)
    }
    if (result?.type === "change-layout") {
      Storage.set(BOTTOM_TABS_KEY, result.bottomTabs)
    }
  } while (result?.type === "change-presentation-style" || result?.type === "change-layout")
}

// 打开 GitHub Actions（pageSheet 可下滑返回菜单）
async function openActions() {
  await Navigation.present({
    element: <ActionsRoot />,
    modalPresentationStyle: "pageSheet",
  })
}

function MenuRow({
  systemImage,
  tint,
  title,
  subtitle,
  onTap,
}: {
  systemImage: string
  tint: string
  title: string
  subtitle: string
  onTap: () => void
}) {
  return (
    <Button action={onTap}>
      <HStack spacing={12} padding={{ horizontal: 14, vertical: 8 }}>
        <VStack alignment="center" spacing={0} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${tint}22` }}>
          <Image systemName={systemImage} width={18} height={18} foregroundStyle={tint} />
        </VStack>
        <VStack alignment="leading" spacing={3} style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#1c1c1e" }}>{title}</Text>
          <Text style={{ fontSize: 12, color: "#8e8e93" }}>{subtitle}</Text>
        </VStack>
        <Image systemName="chevron.right" width={14} height={14} foregroundStyle="#c7c7cc" />
      </HStack>
    </Button>
  )
}

function Menu() {
  return (
    <NavigationStack>
      <List navigationTitle="GitHub 工具箱">
        <Section header={<Text style={{ fontWeight: "600", color: "#3c3c43" }}>选择一个工具</Text>}>
          <MenuRow
            systemImage="doc.text.magnifyingglass"
            tint="#0a84ff"
            title="Gist 管理"
            subtitle="列表、新建、编辑、删除 Gist，多账号切换"
            onTap={() => void openGist()}
          />
          <MenuRow
            systemImage="star.fill"
            tint="#ff3b30"
            title="GitHub Star"
            subtitle="浏览已 Star 仓库，按推送时间排序与置顶"
            onTap={() => void openStar()}
          />
          <MenuRow
            systemImage="hammer.fill"
            tint="#f59f00"
            title="GitHub Actions"
            subtitle="查看仓库工作流、运行状态与触发运行"
            onTap={() => void openActions()}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({ element: <Menu /> })
  Script.exit()
}

run()
