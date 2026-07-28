# Gold Price Widget

Real-time gold price widget for iOS home screen and lock screen. Supports multiple Chinese banks and international London Gold.

> 中文文档: [README.md](./README.md)

## Features

- Supports **CMB (China Merchants Bank)**, **Zheshang Bank**, **ICBC**, **Minsheng Bank**, **CGB**, **CIB**, **JD Gold**, **International London Gold**
- Real-time gold price with change percentage
- Trend chart for recent price history
- Data source switching
- Home screen widget + Lock screen widget + App Intent

## Data Sources

| Source | Description |
|--------|-------------|
| Bank official APIs | Real-time bank gold prices |
| London Gold | International spot gold price |

## Project Structure

```
Gold-Price-Widget/
├── index.tsx               Control panel entry
├── widget.tsx              Widget entry
├── app_intents.tsx         App Intent entry
├── script.json             Metadata
├── utils/
│   └── fetchGold.ts        Gold price fetching logic
├── README.md               Chinese docs
└── README.en.md            This file (English)
```

## Privacy

This script calls bank public gold price APIs directly. No user data is collected, uploaded, or shared.

## Other Scripts in This Repo

- [Watchlist Valuation](../WatchlistValuation/README.en.md) — Fund/stock watchlist with estimated NAV widget
- [Magnet Resource Preview](../Magnet-Resource-Preview/README.en.md) — Magnet search and resource preview tool

## License

MIT