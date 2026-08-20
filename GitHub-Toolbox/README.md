# GitHub 工具箱

> English: [README.en.md](./README.en.md)

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 内使用 **一个入口、三个 GitHub 工具**：Gist 管理、Star 仓库浏览、Actions 工作流监控（含桌面小组件）。

用户名：原作者 [001](https://github.com/001ProMax)（Gist）· [瀬戸 明日葉](https://github.com/OkadaMei/Scripting)（Star）· Actions 与整合维护：[IamNewHands](https://github.com/IamNewHands)。

![version](https://img.shields.io/badge/version-1.0.0-blue)
![platform](https://img.shields.io/badge/platform-iOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-green)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGitHub-Toolbox%22%5D

---

## 功能

### 🔧 Gist 管理（原作 001）
- 列出你的 GitHub Gist，可展开文件树
- 新建公开/私有 Gist，支持写入描述
- 内嵌代码编辑器编辑文件内容
- 在已有 Gist 里添加 / 重命名 / 删除文件
- 拷贝文件 raw 链接到剪贴板
- **多账号切换**：通过命名档案维护多个 GitHub Token，Token 全部存 **iOS Keychain**（按档案独立域），不落明文 Storage

### ⭐ GitHub Star（原作 瀬戸 明日葉）
- 浏览你 Star 过的仓库，分页拉全（每页 100）
- 按 **推送时间** 排序，突出最近活跃仓库
- 仓库置顶、展示样式切换（自动 / 全屏）与底部 Tab 布局偏好，偏好持久化
- Pin 仓库页：查看置顶仓库

### ⚙️ GitHub Actions
- 按仓库查看工作流、运行历史与状态（排队/进行中/成功/失败）
- 触发（dispatch）工作流运行，支持取消
- 多账号档案管理（元数据存 Storage，Token 存 Keychain）
- 本地 TTL 缓存，状态快速复用；触发/重跑/取消后自动清对应缓存
- **桌面小组件**：展示多仓库工作流运行状态与下次 cron 运行时间；点击按钮经 `RunWorkflowIntent` 一键触发并发本地通知

## Token 管理

三个工具各自维护 Token，全部使用 **iOS Keychain**（`unlocked_this_device` 级别），Storage 只存档案元数据（id / 名称 / login），不落明文：

- Gist：`gist_token_<profileId>`（旧版 `gist_token` 自动迁移）
- Star：`github-star.access-token`
- Actions：`gh_token_<profileId>` 等 Keychain 键 + `gh_profiles_v1` 档案清单

### 如何创建 PAT

- Gist：[生成含 `gist` 权限的 PAT](https://github.com/settings/tokens/new?scopes=gist&description=Scripting%20Gist)（经典 `gist` 或 Fine-grained Gist 读写均可）
- Star：需要 `repo`（或 `public_repo`）读 Star 列表
- Actions：需要 `repo` 与 `workflow` 权限以查看/触发工作流

## 外部域名

| 域名 | 用途 |
|------|------|
| `api.github.com` | Gist CRUD、Star 列表、Actions 工作流/运行/触发 |

所有请求直连 GitHub，不经任何第三方后端。

## 项目结构

```
GitHub-Toolbox/
├── index.tsx                         入口：三工具菜单（NavigationStack）
├── widget.tsx                        小组件：Actions 状态 + 一键触发
├── app_intents.tsx                   RunWorkflowIntent（小组件点按触发工作流）
├── script.json                       元数据
├── README.md / README.en.md          文档
│
├── src/
│   ├── gist/                          Gist 管理（原作 001）
│   │   ├── class/gist.ts              Gist API + 档案/Keychain 管理
│   │   └── page/                      list / add / edit / update / setting
│   ├── star/                          Star 浏览（原作 瀬戸 明日葉）
│   │   ├── types.ts                   GitHub 仓库类型
│   │   ├── github-api.ts              Keychain Token + Starred API
│   │   ├── starred-page.tsx           已 Star 列表页（推送时间排序）
│   │   ├── pinned-repositories-page.tsx / pinned-repositories.ts   置顶仓库
│   │   └── glass-ui.tsx               毛玻璃 UI 组件
│   └── actions/                       Actions 监控（本仓整合）
│       ├── github.ts                  Git 请求/缓存/多账号档案
│       └── index.tsx                  控制台页面（仓库/工作流/运行/触发）
```

## 隐私

- Token 仅存于本机 **iOS Keychain**，请求直连 `api.github.com`（Bearer 认证），不外传
- 脚本不收集、不上传、不分享任何用户信息
- 唯一本地持久化：Storage 中的档案元数据与 Actions 缓存（`gh_cache_v1_*`）
- README 中不包含任何真实 Token / Cookie / 私钥

## 已知边界

- Gist API 默认只返回前 30 个（本版未加分页）
- Star 分页已按 `per_page=100` 拉全，超大收藏量时仍受 GitHub API 速率限制
- Actions 触发仅支持 `workflow_dispatch` 入口（`inputs` 传空对象）
- 小组件数据依赖 Actions 档案已登录；未登录时显示「未登录」提示

## 导入与自动更新

- 一键导入：  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGitHub-Toolbox%22%5D
- `remoteResource.url` = `https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/GitHub-Toolbox.zip`
- `remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json` / `src`。

## 仓库中的其他脚本

- [自选估值](../WatchlistValuation/README.md) — 场外基金盘中估值与多市场自选
- [金价小组件](../Gold-Price-Widget/README.md) — 实时银行黄金价格小组件
- [Gist](../Gist/README.md) — 独立版 Gist 管理

## License

MIT — 见仓库根目录 [`LICENSE`](../LICENSE)。