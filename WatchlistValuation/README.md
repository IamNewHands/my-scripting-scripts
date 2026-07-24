# Watchlist Valuation (自选估值)

> 简体中文文档：[README.zh-CN.md](./README.zh-CN.md)

Track your fund estimated NAV (holdings-weighted), A-share, HK and US stock quotes in a home-screen widget. The widget shows day/hold P&L, intra-day valuation, and 7/15/30-day historical chart. Non-trading hours render from a local cache for sub-100ms launch.

![version](https://img.shields.io/badge/version-2.0.0-blue)
![platform](https://img.shields.io/badge/platform-iOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-green)

## Features

- **Mutual funds** — weighted by top-10 holdings; when the API provides `gsz/gszzl` (fund estimated NAV) it is used directly; otherwise the script estimates NAV by re-weighting the holding quotes
- **A-share / HK / US stocks** — full name / pinyin / ticker search via Tencent smartbox; 1-5 letter US tickers are also matched through a fallback to East Money quotes
- **Historical chart** — 7/15/30-day history per holding (A-share + HK from Tencent daily K-line; US not yet supported)
- **Holdings tab** — for funds / ETFs, show the top 10 holdings with live price and day change
- **Off-hours cache** — when markets are closed, the widget reads the last snapshot from local Storage and renders in 1ms; manual "Refresh" button always pulls fresh
- **Color direction** — choose between red-up / green-down (CN convention) or green-up / red-down (US convention)
- **Search filter** — filter your watchlist by name / code / alias
- **Debounced input** — continuous text input is debounced 300ms before persisting

## Data Sources

| Source | Used for | Notes |
|--------|----------|-------|
| `fundmobapi.eastmoney.com` | Fund NAV, holdings, previous-day NAV | Fund-only data |
| `push2.eastmoney.com` / `push2delay.eastmoney.com` | A-share / HK / US quotes | Sina fallback for CN |
| `web.ifzq.gtimg.cn` (Tencent) | Stock search (smartbox), A-share & HK K-line (fqkline) | Unified A-share + HK K-line |
| Local Storage | All caches, watchlist, config, snapshot | Survives process restart |

## Project Layout

```
自选估值/
├── index.tsx                    490 lines  Control panel (entry)
├── widget.tsx                   220 lines  Widget entry (run() + cache loader)
├── app_intents.tsx              196 lines  9 AppIntents (page / chart / refresh)
├── script.json                            Metadata
├── CHANGELOG.md                           Version history
├── README.md / README.zh-CN.md            This file
│
├── lib/                                   Business logic
│   ├── api/{fund,stock}.ts                A/HK/US data fetch
│   ├── cache/
│   │   ├── prevnav.ts                     Fund previous-day NAV (48h + neg 5min)
│   │   └── snapshot.ts                    Widget off-hours snapshot
│   ├── calc/{estimate,profit}.ts          NAV estimation & P&L
│   ├── format.ts                          Color / currency / percent
│   ├── http.ts                            fetch + parseNumber
│   ├── portfolio.ts                       loadPortfolioSnapshot + loadPortfolioSmart
│   ├── storage.ts                         9 Storage keys + migrations
│   ├── types.ts                           All TS types
│   └── util/{async,debounce,marketHours}.ts
│
├── components/                            Control-panel sub-components
│   ├── FundSection.tsx            194
│   ├── StockSection.tsx           190
│   ├── PreviewSection.tsx         179
│   ├── SettingsSection.tsx        129
│   └── ListFilter.tsx              33
│
├── widget/                                Widget sub-views
│   ├── common/fontScale.ts               Font / layout helpers
│   └── views/
│       ├── Chart.tsx               400
│       └── List.tsx                478
│
└── tests/                                69 unit tests
    ├── runner.ts                          Mini expect DSL
    ├── run-all.ts                         Entry
    └── {format,estimate,profit,http,debounce,
       fontScale,searchStock,fetchStockHistory,
       marketHours}.test.ts
```

## Storage Keys

| Key | Contents | Lifetime |
|-----|----------|----------|
| `watchlist.funds` | User's fund watchlist | Permanent |
| `watchlist.stocks` | User's stock watchlist (A/HK/US) | Permanent |
| `watchlist.widgetConfig` | Font / rows / color direction | Permanent |
| `watchlist.widgetPage` | Last page (fund / stock / chart) | Permanent |
| `watchlist.listPage.fund` | Last fund list page | Permanent |
| `watchlist.listPage.stock` | Last stock list page | Permanent |
| `watchlist.widgetChart` | Current chart state (code, kind, days, page, tab) | Permanent |
| `watchlist.holdings.<code>` | Fund top-10 holdings (12h TTL) | Temporary |
| `fund_prevnav_cache` | Fund previous-day NAV (48h + cross-day) | Temporary |
| `fund_prevnav_negcache` | Negative cache (5min) | Temporary |
| `watchlist.chartHistory.<kind>.<secid>` | 30-day K-line (5min TTL) | Temporary |
| `watchlist.snapshot` | Last full portfolio snapshot for off-hours | Until next day |

## Off-Hours Behavior

The widget detects market hours automatically:

- **A-shares** — Mon-Fri 09:30-11:30 / 13:00-15:00 (Asia/Shanghai)
- **HK** — Mon-Fri 09:30-12:00 / 13:00-16:00
- **US** — Mon-Fri 22:30-04:00 next day (cross-midnight, summer/winter midpoint)

When all held markets are closed (lunch break, after close, weekends), the widget skips the network and renders from the local snapshot. The first refresh on a new trading day (or after the cache expires) re-pulls and re-saves.

Note: the current implementation does **not** include a public holiday table. On CN public holidays (Spring Festival, National Day, etc.) the widget will still treat Mon-Fri 09:30-15:00 as trading hours; if the API returns no data, the previous trading day's snapshot is reused.

## Search Behavior

| Keyword | Tencent smartbox | East Money fallback |
|---------|------------------|---------------------|
| Chinese name (e.g. "兆易") | Returns ranked hits | – |
| Pinyin / abbreviation (e.g. "maotai") | Returns ranked hits | – |
| 6-digit CN code (e.g. "600519") | – | Direct quote fetch (gets name) |
| 5-digit HK code (e.g. "00700") | – | Direct quote fetch (gets name) |
| 1-5 letter US ticker (e.g. "AAPL") | – | Direct quote fetch (gets name) |

Tencent's response escapes CJK as `\uXXXX`; the parser unescapes it via `JSON.parse('"' + s + '"')`.

## K-Line Coverage

| Market | Provider | Field | Note |
|--------|----------|-------|------|
| A-share | Tencent fqkline | `qfqday` (前复权) | 30-day window |
| HK | Tencent fqkline | `day` | 30-day window |
| US | – | – | Not yet supported (Tencent usfqkline returns "type error") |

In the widget, the chart view auto-preloads 30 days and slices the last N days for 7/15/30-day display. Cache TTL: 5 minutes.

## Tests

```bash
scripting-ts run tests/run-all.ts
```

Output:
```
总测试数: 69
通过:     69
失败:     0
耗时:     ~2000ms
```

## Privacy

This script calls public market-data APIs (East Money, Tencent) directly. The watchlist is stored in your local Scripting Storage (per-device, not uploaded). The script does **not** collect, upload, or share any personal information.

## External Domains

- `fundmobapi.eastmoney.com` — fund NAV / holdings
- `push2.eastmoney.com` / `push2delay.eastmoney.com` — stock quotes
- `hq.sinajs.cn` — Sina fallback (CN quotes only)
- `smartbox.gtimg.cn` — Tencent search
- `web.ifzq.gtimg.cn` — Tencent daily K-line

## License

MIT
