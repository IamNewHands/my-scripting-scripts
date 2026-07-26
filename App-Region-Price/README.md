# App Multi-Region Price Check

Search App Store apps and compare prices across multiple storefronts inside [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文说明**：[README.zh-CN.md](./README.zh-CN.md)  
> Repo index: [../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D

---

## What it does

- **Search** for any app by name or keyword.
- See **prices** across all enabled App Store regions **in one table**.
- Each price **auto-converts to CNY** (exchange rates from `exchangerate-api.com`).
- Tap into a result to see **version info**, **release notes**, and **app description**.
- Non-Chinese descriptions/release notes are **auto-translated** via the on-device Translation framework.
- Customise which **regions and currencies** are queried via settings.
- Supports **Share Sheet / Shortcuts** (Intent) — open from an App Store link directly.

## Features

- **Multi-region comparison table**: region code + local price + estimated CNY.
- **Smart search ranking**: results are sorted by name similarity to your query (exact > prefix > contains).
- **App Store preview button**: opens the product page in-app; falls back to Safari if unavailable.
- **App metadata**: version, release date, description, release notes — all auto-translated via `Translation.shared`.
- **Independent per-region requests**: one region failing (timeout / no listing) won't blank the whole page.
- **Request timeout**: 10 s for API calls (12 s for optional HTML scrapes) to prevent slow regions from hanging.
- **Input validation**: regions must be `[A-Z]{2}`, currencies `[A-Z]{3}`; malformed App Store URLs are rejected early.
- **Settings**: enable/disable regions, add custom ones with currency codes.

## Author / Credits

- **Author / Maintainer**: [IamNewHands](https://github.com/IamNewHands)
- **Homepage**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Region-Price

## Requirements

| Item | Notes |
|---|---|
| Scripting App | iOS client that runs TSX scripts |
| Network | iTunes Search/Lookup API + exchange-rate API |
| Translation | Uses iOS `Translation` framework (on-device, offline-able) |

No Apple ID login. No passwords. Lookup + rates are public data only.

## How to use

1. **Import** (one-tap):  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D
2. **Run** the script — enter an app name in the search bar.
3. Tap a result to see the **multi-region price table** + version info + translated description.
4. Use the **gear** to customise enabled regions.
5. Share an App Store link → choose this script (Intent) to **jump directly** to the price detail.

## Project layout / code map

```
App-Region-Price/
├── index.tsx              # Run entry: present NavigationSplitView
├── intent.tsx             # Share/Intent entry: parse App Store URL, validate App ID
├── script.json            # Metadata, remoteResource auto-update
├── types.ts               # RegionPriceInfo shared type
├── class/
│   ├── itunes.ts          # iTunes Search / Lookup API client + region config
│   ├── web.ts             # App Store HTML scraper (in-app purchases)
│   └── rate.ts            # Exchange-rate singleton (fetch + cache)
├── page/
│   ├── index.tsx          # NavigationSplitView: search sidebar detail pane
│   ├── search.tsx         # Search UI + result list + preview button
│   ├── detail.tsx         # Multi-region price table + app info + translation
│   ├── setting.tsx        # Region enable/disable, add/edit, validation
│   └── components/
│       └── PriceTable.tsx # Grid table: region / local price / CNY
└── util/
    ├── format.ts          # Price parser, CNY converter, size/rating formatters
    ├── http.ts           # fetchWithTimeout (10 s default)
    ├── validate.ts        # App ID / region / url regex validators
    └── appInfo.ts       # App metadata extraction translation translation
```

| File | Role |
|---|---|
| `index.tsx` | Bootstrap → `Navigation.present` → `Script.exit` |
| `intent.tsx` | Reads `Intent.urlsParameter`; validates + opens detail |
| `class/itunes.ts` | Public Apple API calls (search, lookup); `CountryItem` storage |
| `class/web.ts` | Optional HTML scraper for in-app purchases |
| `class/rate.ts` | Fetches latest rates from exchangerate-api.com; caches 24h |
| `page/search.tsx` | Search field + result list; ranks by name similarity |
| `page/detail.tsx` | Runs per-region lookups; builds price table; translates metadata |
| `page/setting.tsx` | Manage enabled regions; validation + de-duplication |
| `util/http.ts` | `fetchWithTimeout()` helper |
| `util/validate.ts` | Input validators for app IDs, region codes, currency codes |
| `util/appInfo.ts` | `AppInfo` extract, translation pipeline (`Translation.shared`) |
| `util/format.ts` | Number formatting, CNY conversion, size/rating display |

## External domains

| Host | Purpose | Data sent |
|---|---|---|
| `itunes.apple.com` | Public App Store search / lookup API | Search terms, App ID, region code |
| `api.exchangerate-api.com` | Currency exchange rates | Base currency code |

No third-party tracking. No HTML scraping in normal use. System Translation stays on-device.

## Auto-update

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/App-Region-Price.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

`hash` is the **MD5 of the whole zip**. Zip root must contain `index.tsx` / `script.json` directly (no nested folder).

## Changelog

- **1.3.0** — Reuse lookup results for metadata (no extra request). In-app purchases disabled. Translation pipeline simplified. Request timeouts added. Input validation for Intent and settings. Search ranking by name similarity. Preview button fallback.
- **1.2.0** — Multi-region pricing table with CNY conversion. Region labels in Chinese. App info section (version + release date + description + release notes) with iOS system translation.
- **1.1.0** — Price table format: region / local price / CNY. Improved per-region error isolation.
- **1.0.0** — Initial search + multi-region lookup.

## License

MIT — see repo root [`LICENSE`](../LICENSE).