# my-scripting-scripts

Personal collection of [Scripting App](https://apps.apple.com/app/scripting/id6479691128) scripts for iOS.  
个人自用的 Scripting App 脚本合集。源码为 TypeScript / TSX，运行在 iOS 上的 Scripting 客户端内。

> Language: **English first**, then Chinese. / 英文在前，中文在后。

---

## Catalog / 目录

| Script | Description | Import | Source |
|---|---|---|---|
| [IPA-Tool](./IPA-Tool) | Download older IPA builds and install them. Custom plist servers, Keychain-encrypted passwords. / 下载旧版 IPA 并安装；支持自定义 plist；密码 Keychain 加密 | [📥 One-tap import / 一键导入](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D) | Original: [luestr](https://github.com/luestr) · Maintained by [IamNewHands](https://github.com/IamNewHands) |
| [App-Store-Translate](./App-Store-Translate) | Translate App Store release notes & descriptions into Chinese (system Translation or AI). Author: IamNewHands. / 将 App Store 更新说明与描述译为中文（系统翻译或 AI）。作者：IamNewHands | [📥 One-tap import / 一键导入](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D) | Maintained by [IamNewHands](https://github.com/IamNewHands) · see [App-Store-Translate/README.md](./App-Store-Translate/README.md) |

Add new scripts as sibling folders under the repo root. Each script folder may carry its own bilingual README.

---

# IPA-Tool (English)

## What it does

- Sign in with **your own Apple ID** to iTunes / App Store and request IPA download URLs via Apple Configurator-style protocols.
- You get an **Apple-signed** IPA. Locally the script only injects:
  - `iTunesMetadata.plist`
  - `SC_Info/*.sinf` (license data for **your** account)
- No re-sign, no dump, no `Info.plist` rewrite. Installed apps behave like App Store installs and **do not expire in 7 days**.
- Requirement: your Apple ID has previously obtained the app (free apps count).

## Account & password flow (source-level)

- Login goes **directly** to Apple:  
  `POST https://auth.itunes.apple.com/auth/v1/native/fast/`
- Request body is a plist; the `password` field is password + optional 2FA code.
- Cookies / `dsPersonId` / `storeFront` are stored **only on-device** (`Storage` key `AppleLogin`). Nothing is uploaded to third-party backends for login.
- Passwords are stored in **iOS Keychain** (`loginPassword:<account>`), not plain `Storage`.
- `localApi(...)` is an **in-process router**, not a network call.  
  `services/appleStore/api/localApi.ts` dispatches paths like `/auth/login` to `AuthService.login()`.

## External domains (transparency)

| Host | Purpose | Data sent |
|---|---|---|
| `auth.itunes.apple.com` | Apple login | Apple ID / password / 2FA |
| `buy.itunes.apple.com` / `p*-buy.itunes.apple.com` | Purchase & download | dsPersonId, Cookie, App ID |
| `itunes.apple.com` | Search / lookup | Keywords, App ID |
| `api.timbrd.com` / `apis.bilin.eu.org` | Historical version IDs | Numeric App ID only |
| `api.scripting.fun/ipa-plist` | Install manifest (cloud) | File name, Bundle ID, version |
| `xiaobai.app/install` | Install manifest (local proxy; needs Loon/Surge) | Same fields, **stays on device** |
| `https://your-domain/ipa-plist` | Your own plist service | Same fields, your server only |

## Plist service modes

iOS needs an HTTPS manifest.plist when installing. Privacy levels:

| Mode | Who builds plist | Leaves device? | Proxy needed | Self-host |
|---|---|---|---|---|
| **Scripting** | `api.scripting.fun` | App name + Bundle ID + version + IP | No | No |
| **Proxy module** | Local plugin | **No** | Yes (Loon/Surge) | No |
| **Custom** | Your server | Only to you | No | Yes |

None of these modes send Apple ID / password / Cookie. Those are handled only in the Apple login path.

## Self-hosted plist (Cloudflare Worker sketch)

Deploy a Worker that answers `GET /ipa-plist` and returns XML. IPA URL should point at `http://localhost:8000/<fileName>` (the in-app HTTP server). Then paste the Worker URL into Settings.

Minimal Worker idea:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== "/ipa-plist") {
      return new Response("not found", { status: 404 })
    }
    const name = url.searchParams.get("name") || "app"
    const bundleId = url.searchParams.get("bundleId") || ""
    const displayVersion = url.searchParams.get("displayVersion") || ""
    const fileName = url.searchParams.get("fileName") || ""
    // Build a standard itms-services manifest XML from the query params.
    // IPA asset URL: http://localhost:8000/<fileName>
    const plist = `<?xml version="1.0" encoding="UTF-8"?>...` // fill full manifest
    return new Response(plist, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache",
      },
    })
  },
}
```

## Install steps

1. **Download IPA**: log in with an Apple ID that owns the app → search → pick version → download.
2. **Tap install**: the script starts `http://localhost:8000` and opens `itms-services://`.
3. **Required**: Loon or Surge MitM + trusted CA for plist interception / local proxy.
   - Loon plugin: <https://kelee.one/Tool/Loon/Lpx/IPATool.lpx>  
     Import: `loon://import?plugin=https://kelee.one/Tool/Loon/Lpx/IPATool.lpx`
   - Surge: see <https://hub.kelee.one/> or `luestr/ProxyResource` for `IPATool.sgmodule`.
4. **App Store “update” noise**: after sideload-style install, App Store may show odd states. Turn off auto-updates and don’t tap Update for that app if you want to keep the older build.

## Security & privacy notes (this fork)

- Passwords: **Keychain only** (not `login_history` / not plain Storage blobs).
- Login session (Cookie / tokens): on-device Storage only.
- Debug logging for icon color extraction and download metadata has been stripped in recent builds to reduce log noise and accidental leakage.
- Local HTTP server serves IPA files from the app temp folder on port `8000` for install only.

## Known limits

- Only apps your Apple ID has obtained.
- Switching Apple ID can make older IPAs crash (sinf mismatch).
- Real device install depends on proxy MitM; Scripting alone is not enough for the install path.

## Import & auto-update

- **One-tap import (recommended)**  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D

- **Auto-update** via `script.json` → `remoteResource`:

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/IPA-Tool.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

`hash` is the **MD5 of the whole zip file**. Release zip root must contain `index.tsx` / `script.json` directly (no extra top-level folder).

### Publishing a new version

1. Zip the `IPA-Tool/` contents at zip root.
2. Create a GitHub Release (tag like `IPA-Tool-vX.Y.Z`) and upload `IPA-Tool.zip`.
3. Set `script.json` `remoteResource.hash` to the zip MD5; bump `version`.
4. Commit + push `main`.

---

# IPA-Tool（中文）

## 它是干什么的

- 用你自己的 Apple ID 登录 iTunes/App Store，走 Apple Configurator 风格协议向苹果请求 IPA 下载链接。
- 拿到的是**苹果原始签名**的 IPA；本地只注入 `iTunesMetadata.plist` 与 `SC_Info/*.sinf`。
- 不重签、不脱壳、不改 Info.plist；**不会 7 天失效**。
- 前提：该 Apple ID 曾经获取过这个 App（免费也算）。

## 账号密码走向（源码级）

- 登录直连：`POST https://auth.itunes.apple.com/auth/v1/native/fast/`
- 请求体 plist，`password` = 密码 + 可选 2FA。
- Cookie / dsPersonId / storeFront **只写本机** `Storage(AppleLogin)`。
- 密码走 **iOS Keychain**（`loginPassword:<account>`），不落明文 Storage。
- `localApi(...)` 是**进程内路由**，不是 HTTP；见 `services/appleStore/api/localApi.ts`。

## 外部域名（透明清单）

| 域名 | 用途 | 传的内容 |
|---|---|---|
| `auth.itunes.apple.com` | 苹果登录 | Apple ID / 密码 / 2FA |
| `buy.itunes.apple.com` / `p*-buy.itunes.apple.com` | 购买与下载 | dsPersonId、Cookie、App ID |
| `itunes.apple.com` | 搜索 / lookup | 关键词、App ID |
| `api.timbrd.com` / `apis.bilin.eu.org` | 历史版本 ID | 仅 App 数字 ID |
| `api.scripting.fun/ipa-plist` | 安装 manifest（云端） | 文件名、BundleId、版本 |
| `xiaobai.app/install` | 安装 manifest（本地代理） | 同上，**不出手机** |
| `https://你的域名/ipa-plist` | 自建 plist | 同上，只到你的服务器 |

## Plist 服务三种模式

| 模式 | 谁生成 | 是否出设备 | 代理 | 自建 |
|---|---|---|---|---|
| **Scripting** | 云端 | App 名 + BundleID + 版本 + IP | 否 | 否 |
| **代理模块** | 本机插件 | **无** | 是 | 否 |
| **自定义** | 你的服务器 | 仅到你 | 否 | 是 |

三种模式都不传 Apple ID/密码/Cookie。

## 安装步骤

1. 用已获取过目标 App 的 Apple ID 登录 → 搜索 → 选版本 → 下载。
2. 点安装：本地 `http://localhost:8000` + `itms-services://`。
3. 需要 Loon/Surge MitM 与信任证书。  
   - Loon：<https://kelee.one/Tool/Loon/Lpx/IPATool.lpx>  
   - Surge：hub.kelee.one 或 `luestr/ProxyResource` 的 `IPATool.sgmodule`
4. 装完后 App Store 可能状态异常：关自动更新，别点该 App 的更新。

## 安全说明（本仓库版本）

- 密码 Keychain 加密存储。
- 会话 Cookie 仅本机。
- 近期版本收敛了图标取色/下载过程的调试日志，降低日志噪音与误泄露风险。
- 本地 8000 端口仅用于安装时提供 IPA。

## 已知边界

- 只能下本账号获取过的 App。
- 换账号后旧 IPA 可能因 sinf 不匹配闪退。
- 安装链路依赖代理 MitM。

## 导入与自动更新

- 一键导入：  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D
- `remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json`。

发版：打扁平 zip → Release 上传 → 写 hash → 推 main。

---

# App Store Translate (English)

Full write-up: [App-Store-Translate/README.md](./App-Store-Translate/README.md).

## What it does

- Open via **Share Sheet / Intent** with an App Store product URL.
- Fetch public metadata from **iTunes Lookup** (`itunes.apple.com/{region}/lookup?id=`).
- Show name, App ID, version, release date, bundle ID.
- Translate **release notes** and **description** into Chinese.
- Engines (Settings → picker, stored in `Storage` key `translate_engine`):
  - **System Translation** — iOS 18+ on-device `Translation` API (may prompt language packs).
  - **AI Translation** — Scripting `Assistant.requestStreaming` with your configured model (streaming partial text).
- Long-press: re-translate / copy translation / copy original; info rows copy field values.

## Requirements

- Scripting App on iOS; network for lookup (and AI engine).
- System engine: iOS 18+.
- AI engine: a working model in Scripting Assistant settings.
- **No Apple ID login.** Lookup is public metadata only.

## How to use

1. One-tap import:  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D
2. Share an App Store link → choose this script (or pass URL via Shortcuts / Intent).
3. Gear icon switches System / AI engine; pull to refresh; long-press for copy menus.

Direct run uses a sample URL inside `index.tsx` for quick testing.

## Code map (brief)

| Path | Role |
|---|---|
| `index.tsx` | Run entry → present main view |
| `intent.tsx` | Share/Intent entry; requires URL |
| `page/index.tsx` | Parse App ID + region; load info; bind engine / Translation host |
| `page/info.tsx` | Metadata rows + copy menu |
| `page/translate.tsx` | Translate UI, loading, context menu |
| `page/settings.tsx` | Engine picker |
| `util/itunes.ts` | iTunes Lookup client |
| `util/translate.ts` | System / AI engine router |
| `util/settings.ts` | Engine preference |

## External domains

| Host | Purpose | Data |
|---|---|---|
| `itunes.apple.com` | Public lookup | App ID, storefront region |
| Scripting Assistant backend (AI only) | Streaming completion | Release notes / description + system prompt |

System Translation stays on-device.

## Auto-update

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/App-Store-Translate.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

Zip root must contain `index.tsx` / `script.json` directly. `hash` = whole-zip MD5.

---

# App Store翻译（中文）

完整说明见：[App-Store-Translate/README.md](./App-Store-Translate/README.md)。

## 它是干什么的

- 通过**分享菜单 / Intent** 传入 App Store 商品链接打开。
- 用苹果公开 **iTunes Lookup** 拉元数据。
- 展示名称、App ID、版本、更新日期、Bundle ID。
- 将**更新说明**与**应用描述**译为中文。
- 设置可选引擎（`Storage` 键 `translate_engine`）：
  - **系统翻译**：iOS 18+ 本机 `Translation`（可能提示下载语言包）。
  - **AI 翻译**：Scripting `Assistant.requestStreaming`，流式输出。
- 长按：重新翻译 / 复制译文 / 复制原文；信息行可复制字段。

## 使用前提

- Scripting App；Lookup（及 AI）需网络。
- 系统引擎需 iOS 18+；AI 需在助手设置里配好模型。
- **无需登录 Apple ID**，不涉及密码。

## 使用方法

1. 一键导入：  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D
2. 分享 App Store 链接 → 选本脚本（或快捷指令 / Intent 传 URL）。
3. 齿轮切换系统 / AI；下拉刷新；长按复制或重译。

直接运行时 `index.tsx` 内置示例链接，便于试跑。

## 代码简表

| 路径 | 作用 |
|---|---|
| `index.tsx` | 运行入口 |
| `intent.tsx` | 分享/Intent 入口 |
| `page/index.tsx` | 解析链接、加载信息、绑定引擎 |
| `page/info.tsx` | 应用信息行 |
| `page/translate.tsx` | 翻译区块 UI |
| `page/settings.tsx` | 引擎设置 |
| `util/itunes.ts` | Lookup 请求 |
| `util/translate.ts` | 系统 / AI 路由 |
| `util/settings.ts` | 引擎偏好 |

## 外部域名

| 域名 | 用途 | 内容 |
|---|---|---|
| `itunes.apple.com` | 公开查询 | App ID、区域 |
| Scripting 助手后端（仅 AI） | 流式补全 | 正文 + 系统提示词 |

系统翻译不出设备。

## 自动更新

`remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json`。  
发版：扁平 zip → Release 上传 `App-Store-Translate.zip` → 写 hash → 推 `main`。

---

## About this repo / 关于本仓库

- License: MIT — see [`LICENSE`](./LICENSE).
- Original copyright of third-party scripts remains with their authors. This repo is a personal collection / maintained fork; see each `script.json` `author` field.
- Protocol: MIT.

### How to use in Scripting App

- **A (recommended)**: open the one-tap import link above in Safari.
- **B**: copy a script folder into iCloud `Scripting/Documents/scripts/<name>/`.
- **C**: if `remoteResource` is set, the app can auto-update from the Release zip URL.
