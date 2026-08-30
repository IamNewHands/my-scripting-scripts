# My Scripting Scripts

A collection of Scripting app scripts including iOS home screen widgets, control panel tools, and more.

> 中文文档: [README.md](./README.md)

## Scripts

### [Watchlist Valuation](./WatchlistValuation/README.en.md)

Estimate off-exchange fund NAV from portfolio holdings + stock quotes. Manage fund, A-share, HK and US watchlists with day/hold P&L. Click a name in the widget to view 7/15/30-day history. Non-trading hours render from local cache.

- [📖 English Docs](./WatchlistValuation/README.en.md) | [📖 中文文档](./WatchlistValuation/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/WatchlistValuation"]`

### [Gold Price Widget](./Gold-Price-Widget/README.en.md)

Real-time gold price widget for home screen and lock screen. Supports CMB, Zheshang Bank, ICBC, Minsheng Bank, CGB, CIB, JD Gold, International London Gold. Includes change percentage and trend chart.

- [📖 English Docs](./Gold-Price-Widget/README.en.md) | [📖 中文文档](./Gold-Price-Widget/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Gold-Price-Widget"]`

### [Magnet Resource Preview](./Magnet-Resource-Preview/README.en.md)

Search magnet resources via xcili.net, preview metadata via whatslink.info, and recognize codes from screenshots via whos.tv image search. Supports favorites, link copying, and screenshot saving.

- [📖 English Docs](./Magnet-Resource-Preview/README.en.md) | [📖 中文文档](./Magnet-Resource-Preview/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Magnet-Resource-Preview"]`

### [LAN File Transfer](./LAN-File-Transfer/README.en.md)

Transfer files, images and text between your iPhone and any device's browser over LAN or a personal hotspot. Scan the QR code to connect, no app install required, no mobile data consumed.

- [📖 English Docs](./LAN-File-Transfer/README.en.md) | [📖 中文文档](./LAN-File-Transfer/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/LAN-File-Transfer"]`

### [PDD Quick Submit](./PDD-Quick-Submit/README.zh-CN.md)

Submit Pinduoduo team codes to multiple helper sites in parallel; returns as soon as any site succeeds (5s per-code deadline). Codes up to 10 digits are sent as one; longer input is auto-split into 8/9-digit chunks.

- [📖 English Docs](./PDD-Quick-Submit/README.zh-CN.md) | [📖 中文文档](./PDD-Quick-Submit/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/PDD-Quick-Submit"]`

### [App Region Price](./App-Region-Price/README.zh-CN.md)

Query App Store prices across regions with CNY conversion, name-matching search ranking, and version / release notes / overview display.

- [📖 English Docs](./App-Region-Price/README.zh-CN.md) | [📖 中文文档](./App-Region-Price/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Region-Price"]`

### [App Store Translate](./App-Store-Translate/README.zh-CN.md)

Translate App Store app pages into multiple languages.

- [📖 English Docs](./App-Store-Translate/README.zh-CN.md) | [📖 中文文档](./App-Store-Translate/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Store-Translate"]`

### [Gist](./Gist/README.zh-CN.md)

Manage GitHub Gists: create, edit, view and organize code snippets.

- [📖 English Docs](./Gist/README.zh-CN.md) | [📖 中文文档](./Gist/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Gist"]`

### [IPA-Tool](./IPA-Tool/README.en.md)

IPA file management: install, sign and inspect app information.

- [📖 English Docs](./IPA-Tool/README.en.md) | [📖 中文文档](./IPA-Tool/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/IPA-Tool"]`

### [Yoinks](./Yoinks/README.md)

Media downloader using yt-dlp for video/audio, with history, settings and platform cookie login.

- [📖 中文文档](./Yoinks/README.md)
- One-click import: `https://scripting.fun/import_scripts?urls=` + URL-encoded `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Yoinks"]`

## Usage

All scripts require the Scripting app on iOS. Install via:

1. **One-click import**: Click the import link above (open on your iOS device)
2. **Manual install**: Copy the script directory to Scripting's `scripts/` directory

## Auto Updates

Scripts support automatic updates via `remoteResource`:
- Release `.zip` packages are provided in GitHub Releases
- `script.json` includes `remoteResource.url` and `hash`
- Scripting app detects and downloads updates automatically

## Structure

```
my-scripting-scripts/
├── App-Region-Price/           App Region Price
├── App-Store-Translate/        App Store Translate
├── Gist/                       Gist
├── Gold-Price-Widget/          Gold Price Widget
├── IPA-Tool/                   IPA Tool
├── LAN-File-Transfer/          LAN File Transfer
├── Magnet-Resource-Preview/    Magnet Resource Preview
├── PDD-Quick-Submit/           PDD Quick Submit
├── WatchlistValuation/         Watchlist Valuation
├── Yoinks/                     Media Downloader
├── README.md                   Chinese docs
└── README.en.md                This file (English)
```

## Adding New Scripts

When adding a new script:
1. Create an ASCII-named directory at the root level
2. Include `script.json`, `README.md` (Chinese docs), `README.en.md` (English docs)
3. Update this README's script list

## License

MIT