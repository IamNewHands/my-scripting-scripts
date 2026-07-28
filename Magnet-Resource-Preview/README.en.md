# Magnet Resource Preview

Magnet search and resource preview tool. Search resources via xcili.net, extract pure magnet links and file lists. Preview metadata (name, size, file count, type, screenshots) of magnet/ED2K/download links via whatslink.info. Supports image search via whos.tv to identify video codes and jump to magnet search. Supports favorites, link copying, and screenshot saving.

> 中文文档: [README.md](./README.md)

## Features

- **Magnet Search** — Search resources via xcili.net, extract pure magnet links and file lists
- **Resource Preview** — Query metadata (name, size, file count, type, screenshots) via whatslink.info
- **Image Search** — Identify video codes via whos.tv image search, then jump to magnet search
- **Favorites** — Save favorites, copy links, save preview screenshots

## Project Structure

```
Magnet-Resource-Preview/
├── index.tsx                   Entry point
├── api.ts                      Network requests
├── types.ts                    Type definitions
├── utils.ts                    Utility functions
├── api/
│   └── whosTv.ts               whos.tv API wrapper
├── components/
│   └── Glass.tsx               UI component
├── pages/
│   └── ImageSearchPage.tsx     Image search page
├── script.json                 Metadata
├── README.md                   Chinese docs
└── README.en.md                This file (English)
```

## Data Sources

| Domain | Purpose | Notes |
|--------|---------|-------|
| `xcili.net` | Magnet search | Resource search and link extraction |
| `whatslink.info` | Resource preview | Query metadata and screenshots |
| `whos.tv` | Image search | Code identification and magnet redirect |

## Privacy

This script calls public search and preview APIs directly. No user data is collected, uploaded, or shared.

## Other Scripts in This Repo

- [Watchlist Valuation](../WatchlistValuation/README.en.md) — Fund/stock watchlist with estimated NAV widget
- [Gold Price Widget](../Gold-Price-Widget/README.en.md) — Real-time bank gold price widget

## License

MIT