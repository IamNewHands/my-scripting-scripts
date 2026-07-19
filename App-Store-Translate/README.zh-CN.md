# App Store翻译

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 内把 App Store 的**更新说明**和**应用描述**翻译成中文。

> **English**：[README.md](./README.md)  
> 仓库目录：[../README.zh-CN.md](../README.zh-CN.md) · [../README.md](../README.md)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D

---

## 它是干什么的

- 用 **App Store 链接**打开（分享菜单 / 快捷指令 / Intent）。
- 通过苹果公开的 **iTunes Lookup API** 拉取应用元数据。
- 展示名称、App ID、版本、更新日期、Bundle ID。
- 把**更新说明**和**应用描述**翻译成中文。
- 设置里可选引擎：
  - **系统翻译**：iOS 18+ 本机 `Translation` API（可能提示下载语言包），目标语言中文。
  - **AI 翻译**：走 Scripting 已配置的 `Assistant.requestStreaming`，流式输出。
- 长按译文：重新翻译 / 复制译文 / 复制原文。
- 长按信息行：复制字段值。

## 作者 / 致谢

- **作者 / 维护**：[IamNewHands](https://github.com/IamNewHands)
- **主页**：https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Store-Translate
- 基于社区脚本 **App Store翻译**（原版 `script.json` 作者与描述为空）；本仓库版本增加双引擎（系统 + AI）、设置页与发版打包。

## 使用前提

| 项目 | 说明 |
|---|---|
| Scripting App | iOS 上运行 TSX 脚本 |
| 网络 | Lookup 与 AI 引擎需要联网 |
| 系统引擎 | iOS 18+，按提示下载语言包 |
| AI 引擎 | 在 Scripting 助手设置里配置可用模型 |

**不需要**登录 Apple ID，不涉及密码。Lookup 仅公开元数据。

## 使用方法

1. **一键导入**：  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D
2. 在 Safari / App Store **分享**应用链接 → 选本脚本（或用快捷指令 / Intent 传入 URL）。
3. 等待信息拉取与翻译完成。
4. 点右上角 **齿轮** 切换 **系统 / AI** 引擎。
5. 下拉刷新应用信息；长按文字可复制或重新翻译。

直接运行 `index.tsx` 时内置了一条示例 App Store 链接，方便本地试跑。

## 功能一览

- 双引擎，偏好持久化（`Storage` 键 `translate_engine`）。
- AI 流式输出（生成过程中逐步更新 UI）。
- 系统翻译绑定列表 `translationHost`，便于弹出语言包下载提示。
- 工具栏可分享当前链接。
- Intent 未收到 URL 时用通知提示错误。

## 代码结构说明

```
App-Store-Translate/
├── index.tsx
├── intent.tsx
├── script.json
├── page/
│   ├── index.tsx
│   ├── info.tsx
│   ├── translate.tsx
│   └── settings.tsx
└── util/
    ├── itunes.ts
    ├── translate.ts
    └── settings.ts
```

| 文件 | 作用 |
|---|---|
| `index.tsx` | 运行入口：展示主界面（本地测试用示例 URL） |
| `intent.tsx` | 分享/Intent 入口：必须传入 App Store URL |
| `page/index.tsx` | 从 URL 解析 App ID 与区域；加载信息；绑定引擎与 `Translation` |
| `page/info.tsx` | 应用信息行 + 复制菜单 |
| `page/translate.tsx` | 调用翻译、加载态/错误、重新翻译菜单 |
| `page/settings.tsx` | 引擎选择器 |
| `util/itunes.ts` | iTunes Lookup 请求 |
| `util/translate.ts` | 系统翻译 / AI 流式翻译路由 |
| `util/settings.ts` | 引擎读写与展示名 |

## 外部域名

| 域名 | 用途 | 传的内容 |
|---|---|---|
| `itunes.apple.com` | 公开应用查询 | App ID、商店区域（来自链接） |
| Scripting 助手后端（仅 AI 引擎） | 流式对话补全 | 更新说明/描述正文 + 系统提示词 |

系统翻译走本机框架，不出设备。不爬取 App Store 网页 HTML。

## 自动更新

`script.json` 的 `remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json`。

发版：打扁平 zip → GitHub Release 上传 `App-Store-Translate.zip` → 写回 hash → 推 `main`。

## 已知边界

- 本版目标语言固定为**中文**。
- 系统引擎依赖 iOS 18+，可能要下语言包。
- AI 效果取决于你在 Scripting 里配置的模型。
- 仅解析带 `/id数字` 的 App Store 商品链接。
- 直接运行的示例 URL 仅用于测试；日常请走分享 / Intent。

## 协议

MIT — 见仓库根目录 [`LICENSE`](../LICENSE)。
