# App Store Translate

Translate App Store **release notes** and **app descriptions** into Chinese inside [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文说明**：[README.zh-CN.md](./README.zh-CN.md)  
> Repo index：[../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Store-Translate%22%5D

---

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
