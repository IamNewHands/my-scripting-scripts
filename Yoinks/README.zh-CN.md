# Yoinks
基于 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 的公开媒体链接下载工具（TypeScript / TSX + yt-dlp）。
> **English**：[README.md](./README.md)  
> 目录：[../README.zh-CN.md](../README.zh-CN.md) · [../README.md](../README.md)
**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FYoinks%22%5D
---
## 功能
- 粘贴、手输或分享公开 **http(s)** 媒体页链接。
- **先探测格式**，再按选择用 yt-dlp 下载。
- 需要时用内置 **FFmpeg** 合并音视频，并用 **ffprobe** 校验流。
- 保存到 **相册** 或 **文件**；下载历史与本地存储上限管理。
- 本地 **AVPlayer** 播放 + **用其他 App 打开**（系统分享）。
- 默认兼容 Scripting Python 证书环境；抖音 / 小红书可按需 WebView 登录。
- 调试模式提供脱敏的结构化运行日志。
## 作者
- **维护者**：[IamNewHands](https://github.com/IamNewHands)
- **主页**：https://github.com/IamNewHands/my-scripting-scripts/tree/main/Yoinks
- 灵感来自 [pablostanley/yoinks](https://github.com/pablostanley/yoinks)（非完整 Node 原版移植）。
## 环境要求
| 项 | 说明 |
|---|---|
| Scripting App | iOS TSX 运行时 |
| 网络 | 可访问媒体站 / CDN |
| 工具 | `python3 -m yt_dlp`、`ffmpeg`、`ffprobe`（设置页可安装 yt-dlp） |
| 权限 | 按使用情况申请相册 / 文件 / 剪贴板 |
## 代码地图
| 路径 | 职责 |
|---|---|
| `index.tsx` | 记录 / 下载 / 设置三 Tab |
| `intent.tsx` | 分享 / 快捷指令 URL 或文本 |
| `services/media.ts` | 探测、下载、合并、保存 |
| `services/history.ts` | 历史与存储清理 |
| `services/logs.ts` | 结构化日志（最小 + 调试） |
| `services/platform-auth.ts` | 抖音 / 小红书 Cookie 会话 |
| `services/preferences.ts` | 保存方式、并发、上限 |
| `pages/*` | 关于、日志、原生播放 |
| `ytdlp_probe.py` / `ytdlp_runner.py` | yt-dlp 封装 |
## 外部域名 / 隐私
- 请求域名来自用户粘贴的链接（如 YouTube、抖音、小红书等）。
- 平台登录使用应用内 WebView；Cookie 仅写入任务临时文件，用后删除。
- 日志尽量脱敏 cookie / token 与 URL query。
## 边界
- 并非上游 Node Yoinks 的完整复刻。
- 部分站点（尤其 YouTube）在风控下可能需要 Cookie / JS 运行时。
- 续传依赖 yt-dlp 分片能力，尚无完整「暂停任务列表」UI。
- 自动更新依赖本仓 Release 资源 `Yoinks.zip`。
## License
见仓库根目录 [LICENSE](../LICENSE)。
