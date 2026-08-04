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
├── WatchlistValuation/         Watchlist Valuation
├── Gold-Price-Widget/          Gold Price Widget
├── Magnet-Resource-Preview/    Magnet Resource Preview
├── LAN-File-Transfer/          LAN File Transfer
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