# my-scripting-scripts

Personal collection of [Scripting App](https://apps.apple.com/app/scripting/id6479691128) scripts for iOS.  
个人自用的 Scripting App 脚本合集（TypeScript / TSX）。

> Language: **English first**, then Chinese. / 英文在前，中文在后。  
> **Per-script details live in each folder’s `README.md`.** Root README stays short as more scripts are added.  
> **各脚本细则见对应文件夹内的 `README.md`。** 根说明只保留目录与通用用法，避免随脚本增多而膨胀。

---

## Catalog / 目录

| Script | Summary | Docs | Import |
|---|---|---|---|
| [IPA-Tool](./IPA-Tool) | Download older IPAs & install; custom plist; Keychain passwords. / 下载旧版 IPA 并安装；自定义 plist；密码 Keychain | [README](./IPA-Tool/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D) |
| [App-Store-Translate](./App-Store-Translate) | Translate App Store notes/descriptions to Chinese (system or AI). / App Store 更新说明与描述译中文（系统或 AI） | [README](./App-Store-Translate/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D) |

Each row’s **Docs** link is the full bilingual write-up (features, code map, privacy, limits).  
表格 **Docs** 列为该脚本完整中英说明（功能、代码结构、隐私、边界等）。

---

## How to use / 使用方法

### English

1. Install [Scripting App](https://apps.apple.com/app/scripting/id6479691128) on iOS.
2. Open a script’s **one-tap import** link (📥 in the table) in Safari, or import the GitHub tree URL in Scripting.
3. Run the script from Scripting. Some scripts also accept **Share Sheet / Shortcuts** input (see that script’s README).
4. If `script.json` has `remoteResource`, Scripting can **auto-update** from the GitHub Release zip.

Optional: copy a script folder into iCloud `Scripting/Documents/scripts/<name>/`.

### 中文

1. 在 iOS 安装 [Scripting App](https://apps.apple.com/app/scripting/id6479691128)。
2. 用 Safari 打开表格中的 **一键导入** 链接，或在 Scripting 里导入对应 GitHub 目录。
3. 在 Scripting 中运行。部分脚本支持 **分享菜单 / 快捷指令**（见该脚本自己的 README）。
4. 若 `script.json` 配置了 `remoteResource`，可从 GitHub Release zip **自动更新**。

也可把脚本文件夹拷到 iCloud `Scripting/Documents/scripts/<名称>/`。

---

## Repo layout / 仓库结构

```
my-scripting-scripts/
├── README.md                 # this file — catalog + common usage only
├── LICENSE
├── IPA-Tool/                 # script + IPA-Tool/README.md
└── App-Store-Translate/      # script + App-Store-Translate/README.md
```

Convention when adding a script:

1. Create `Your-Script/` with source and `script.json`.
2. Write **`Your-Script/README.md`** (bilingual details).
3. Add **one row** to the catalog table above (summary + docs link + import link).
4. Do **not** paste long per-script docs into the root README.

新增脚本约定：源码进独立文件夹 → 自带 `README.md` 细则 → 根目录表格只加一行摘要。

---

## Auto-update note / 自动更新说明

- Release asset: `https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/<ScriptFolder>.zip`
- `remoteResource.hash` = **MD5 of the whole zip**
- Zip root must contain `index.tsx` / `script.json` directly (no nested folder)

细节与发版步骤见各脚本 README。

---

## License / 协议

MIT — see [`LICENSE`](./LICENSE).  
Third-party originals remain with their authors; see each `script.json` `author` field.  
第三方原作版权归原作者；见各脚本 `script.json` 的 `author`。
