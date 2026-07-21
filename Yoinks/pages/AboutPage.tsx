import { Button, List, Navigation, NavigationStack, Section, Text } from "scripting"

export function AboutPage() {
  const dismiss = Navigation.useDismiss()
  const openUpstreamProject = async () => {
    try {
      await Safari.present("https://github.com/pablostanley/yoinks/tree/main", true)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await Dialog.alert({ title: "无法打开项目页面", message })
    }
  }
  return (
    <NavigationStack>
      <List navigationTitle="关于 Yoinks" navigationBarTitleDisplayMode="inline" toolbar={{ cancellationAction: <Button title="关闭" action={dismiss} /> }}>
        <Section title="Yoinks">
          <Text>Yoinks 是基于 Scripting 的公开媒体链接下载工具：先探测可用格式，再按选择下载和保存。</Text>
        </Section>
        <Section title="功能与特点">
          <Text>支持格式优先选择、可用时的在线预览、音视频下载与 FFmpeg 合并，以及保存到相册或文件。</Text>
          <Text>下载记录和本地原文件可统一管理；需要登录的平台会在探测或下载时提供登录重试。调试模式开启后可查看结构化运行日志。</Text>
        </Section>
        <Section title="原版兼容性">
          <Text>Scripting 中的 Node.js 运行能力由 Swift 与 JavaScript 层模拟，并非完整的原生 Node.js 运行时。即使依赖包齐全，执行 Node 或 npm run 仍可能因 waitUntilExit 等兼容性问题无法正常运行。</Text>
          <Text>因此当前版本保留 Yoinks 的名称与核心下载体验，未能完整复现原项目的全部能力。待 Scripting 作者进一步完善 npm 与 Node 运行支持后，脚本将继续跟进更新。</Text>
        </Section>
        <Section title="致谢">
          <Button title="打开 Yoinks 开源项目" systemImage="arrow.up.right.square" action={() => void openUpstreamProject()} />
          <Text font="caption" foregroundStyle="secondaryLabel">感谢 Pablo Stanley 与 Yoinks 开源项目提供的灵感。</Text>
        </Section>
      </List>
    </NavigationStack>
  )
}
