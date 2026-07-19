# App Store Translate / App Store翻译

Translate App Store **release notes** and **app descriptions** into Chinese inside [Scripting App](https://apps.apple.com/app/scripting/id6479691128).  
在 Scripting App 内把 App Store 的**更新说明**和**应用描述**翻译成中文。

> Language: **English first**, then Chinese. / 英文在前，中文在后。

---

# English

## What it does

- Open with an **App Store URL** (Share Sheet / Shortcuts / Intent).
- Fetch app metadata from Apple’s public **iTunes Lookup API**.
- Show name, App ID, version, release date, bundle ID.
- Translate **release notes** and **description** into Chinese.
- Choose engine in Settings:
  - **System Translation** — iOS 18+ on-device `Translation` API (may prompt to download language packs). Target: Chinese.
  - **AI Translation** — Scripting `Assistant.requestStreaming` with your configured AI model. Streams partial results.
- Long-press translated text: re-translate / copy translation / copy original.
- Long-press info rows: copy the field value.

## Author / Credits

- **Author / Maintainer**: [IamNewHands](https://github.com/IamNewHands)
- **Homepage**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Store-Translate
- Based on the community script **App Store翻译** (original `script.json` had empty author/description); this fork adds dual engines (system + AI), settings UI, and release packaging.

## Requirements

| Item | Notes |
|---|---|
| Scripting App | iOS client that runs TSX scripts |
| Network | Lookup + AI engine need network |
| System engine | iOS 18+, Chinese language pack if prompted |
| AI engine | A working model configured in Scripting Assistant settings |

No Apple ID login. No passwords. Lookup is public metadata only.

## How to use

1. **Import** (one-tap):  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D
2. In Safari / App Store, **Share** an app link → choose this script (or pass the URL via Shortcuts / Intent).
3. Wait for lookup + translation.
4. Tap the **gear** to switch **System** / **AI** engine.
5. Pull to refresh app info; long-press text for copy / re-translate.

Direct run (`index.tsx`) uses a built-in sample App Store URL for quick testing.

## Features

- Dual engines with persistent preference (`Storage` key `translate_engine`).
- Streaming AI output (partial updates while generating).
- System translation host bound to the list UI (`translationHost`) so download prompts can appear.
- Share current URL from the toolbar.
- Error toast via notification when Intent receives an empty URL.

## Project layout / code map

```
App-Store-Translate/
├── index.tsx              # Run entry: present main View (sample URL for local test)
├── intent.tsx             # Share/Intent entry: requires App Store URL
├── script.json            # Metadata, remoteResource auto-update
├── page/
│   ├── index.tsx          # Main NavigationStack + List (info + two translate sections)
│   ├── info.tsx           # App metadata rows (name / id / version / date / bundleId)
│   ├── translate.tsx      # Translate section UI: loading, errors, context menu
│   └── settings.tsx       # Engine picker (system | ai)
└── util/
    ├── itunes.ts          # iTunes Lookup API client
    ├── translate.ts       # Engine router: system Translation / AI streaming
    └── settings.ts        # Engine preference get/set + labels
```

| File | Role |
|---|---|
| `index.tsx` | Async bootstrap → `Navigation.present(<View url=…>)` → `Script.exit` |
| `intent.tsx` | Reads `Intent.urlsParameter`; empty URL → notification error |
| `page/index.tsx` | Parses App ID + storefront region from URL; loads info; wires engine + `Translation` host |
| `page/info.tsx` | Presentational rows with copy context menu |
| `page/translate.tsx` | Calls `translateText`; shows progress / result; re-translate menu |
| `page/settings.tsx` | Picker bound to `setTranslateEngine` |
| `util/itunes.ts` | `GET https://itunes.apple.com/{region}/lookup?id={appid}` → first result |
| `util/translate.ts` | `translateWithSystem` / `translateWithAI` (+ partial callback) |
| `util/settings.ts` | `TranslateEngine = "system" \| "ai"`, default `"ai"` |

## External domains

| Host | Purpose | Data sent |
|---|---|---|
| `itunes.apple.com` | Public app lookup | App ID, storefront region (from URL) |
| Scripting Assistant backend (AI engine only) | Streaming chat completion | Release notes / description text + system prompt |

System Translation stays on-device (Apple Translation framework). No third-party scrape of App Store HTML.

## Auto-update

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/App-Store-Translate.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

`hash` is the **MD5 of the whole zip**. Zip root must contain `index.tsx` / `script.json` directly (no nested folder).

## Known limits

- Target language is fixed to **Chinese** in this version.
- System engine needs iOS 18+ and may require downloading language packs.
- AI quality depends on the model you configured in Scripting.
- Only App Store product URLs with `/idNNNN` are parsed; malformed links fail lookup.
- Direct run sample URL is for testing; real use is via Share / Intent.

## License

MIT — see repo root [`LICENSE`](../LICENSE).

---

# 中文

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

- **作者 / 维护**： [IamNewHands](https://github.com/IamNewHands)
- **主页**： https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Store-Translate
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
