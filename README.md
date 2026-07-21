# my-scripting-scripts

Personal collection of [Scripting App](https://apps.apple.com/app/scripting/id6479691128) scripts for iOS (TypeScript / TSX).

> **中文说明**：[README.zh-CN.md](./README.zh-CN.md)  
> Per-script details live in each folder’s `README.md` (EN) and `README.zh-CN.md` (ZH). This root file stays short as more scripts are added.

---

## Catalog

| Script | Summary | Docs | Import |
|---|---|---|---|
| [IPA-Tool](./IPA-Tool) | Download older IPAs & install; custom plist; Keychain passwords | [EN](./IPA-Tool/README.md) · [中文](./IPA-Tool/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D) |
| [App-Store-Translate](./App-Store-Translate) | Translate App Store notes/descriptions to Chinese (system or AI) | [EN](./App-Store-Translate/README.md) · [中文](./App-Store-Translate/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D) |
| [App-Region-Price](./App-Region-Price) | Search apps & compare prices across regions with CNY conversion and auto-translated metadata | [EN](./App-Region-Price/README.md) · [中文](./App-Region-Price/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D) |
| [PDD-Quick-Submit](./PDD-Quick-Submit) | Submit Pinduoduo team codes to multiple helper sites; first success returns with N/3 score | [EN](./PDD-Quick-Submit/README.md) · [中文](./PDD-Quick-Submit/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D) |
| [Yoinks](./Yoinks) | Paste a public media link, pick a format, download with yt-dlp, save to Photos or Files | [EN](./Yoinks/README.md) · [中文](./Yoinks/README.zh-CN.md) | [📥](https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FYoinks%22%5D) |

**Docs** columns link to the full per-script write-up (features, code map, privacy, limits).

---

## How to use

1. Install [Scripting App](https://apps.apple.com/app/scripting/id6479691128) on iOS.
2. Open a script’s **one-tap import** link (📥 in the table) in Safari, or import the GitHub tree URL in Scripting.
3. Run the script from Scripting. Some scripts also accept **Share Sheet / Shortcuts** input (see that script’s README).
4. If `script.json` has `remoteResource`, Scripting can **auto-update** from the GitHub Release zip.

Optional: copy a script folder into iCloud `Scripting/Documents/scripts/<name>/`.

---

## Repo layout

```
my-scripting-scripts/
├── README.md                 # English — catalog + common usage
├── README.zh-CN.md           # Chinese — same scope
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

### Adding a script

1. Create `Your-Script/` with source and `script.json`.
2. Write **`Your-Script/README.md`** (English) and **`Your-Script/README.zh-CN.md`** (Chinese).
3. Add **one row** to the catalog table in **both** root README files.
4. Do **not** paste long per-script docs into the root README.

---

## Auto-update note

- Release asset: `https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/<ScriptFolder>.zip`
- `remoteResource.hash` = **MD5 of the whole zip**
- Zip root must contain `index.tsx` / `script.json` directly (no nested folder)

Details and publish steps: see each script’s README.

---

## License

MIT — see [`LICENSE`](./LICENSE).  
Third-party originals remain with their authors; see each `script.json` `author` field.
