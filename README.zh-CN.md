# my-scripting-scripts

个人自用的 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 脚本合集（TypeScript / TSX）。

> **English**：[README.md](./README.md)  
> 各脚本细则见对应文件夹内的 `README.md`（英文）与 `README.zh-CN.md`（中文）。根说明只保留目录与通用用法，避免随脚本增多而膨胀。

---

## 目录

| 脚本 | 摘要 | 说明 | 导入 |
|---|---|---|---|
| [IPA-Tool](./IPA-Tool) | 下载旧版 IPA 并安装；自定义 plist；密码 Keychain | [中文](./IPA-Tool/README.zh-CN.md) · [EN](./IPA-Tool/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D) |
| [App-Store-Translate](./App-Store-Translate) | App Store 更新说明与描述译中文（系统或 AI） | [中文](./App-Store-Translate/README.zh-CN.md) · [EN](./App-Store-Translate/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D) |
| [App-Region-Price](./App-Region-Price) | 搜索 App 对比多区价格，自动换算人民币，简介按需翻译 | [中文](./App-Region-Price/README.zh-CN.md) · [EN](./App-Region-Price/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D) |
| [PDD-Quick-Submit](./PDD-Quick-Submit) | 多站点提交拼多多组队码；首成功即返回，结果显示成功数/总数 | [中文](./PDD-Quick-Submit/README.zh-CN.md) · [EN](./PDD-Quick-Submit/README.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D) |
| [Yoinks](./Yoinks) | 粘贴公开媒体链接，选择格式后用 yt-dlp 下载，保存到相册或文件 | [EN](./Yoinks/README.md) · [中文](./Yoinks/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FYoinks%22%5D) |

**说明** 列为该脚本完整文档（功能、代码结构、隐私、边界等）。

---

## 使用方法

1. 在 iOS 安装 [Scripting App](https://apps.apple.com/app/scripting/id6479691128)。
2. 用 Safari 打开表格中的 **一键导入** 链接，或在 Scripting 里导入对应 GitHub 目录。
3. 在 Scripting 中运行。部分脚本支持 **分享菜单 / 快捷指令**（见该脚本自己的说明）。
4. 若 `script.json` 配置了 `remoteResource`，可从 GitHub Release zip **自动更新**。

也可把脚本文件夹拷到 iCloud `Scripting/Documents/scripts/<名称>/`。

---

## 仓库结构

```
my-scripting-scripts/
├── README.md                 # 英文 — 目录 + 通用用法
├── README.zh-CN.md           # 中文 — 同上范围
├── LICENSE
├── IPA-Tool/
│   ├── README.md
│   ├── README.zh-CN.md
│   └── …
└── App-Store-Translate/
    ├── README.md
    ├── README.zh-CN.md
    └── …
```

### 新增脚本约定

1. 创建 `Your-Script/`，放入源码与 `script.json`。
2. 编写 **`Your-Script/README.md`**（英文）与 **`Your-Script/README.zh-CN.md`**（中文）。
3. 在根目录 **两个** README 的目录表各加 **一行**。
4. **不要**把长文细则写进根 README。

---

## 自动更新说明

- Release 资源：`https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/<脚本文件夹>.zip`
- `remoteResource.hash` = **整个 zip 的 MD5**
- zip 根目录须直接包含 `index.tsx` / `script.json`（不要再包一层文件夹）

细节与发版步骤见各脚本说明。

---

## 协议

MIT — 见 [`LICENSE`](./LICENSE)。  
第三方原作版权归原作者；见各脚本 `script.json` 的 `author`。
