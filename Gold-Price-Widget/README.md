# Gold Price Widget

A real-time gold price widget for iOS home screen and lock screen, supporting multiple Chinese banks.

## Features

- **Multi-bank support**: China Merchants Bank (CMB), Zheshang Bank, ICBC, Minsheng Bank, CGB, CIB, JD Gold, International London Gold (USD)
- **Widget sizes**: systemSmall, systemMedium, systemLarge, accessoryRectangular (lock screen)
- **Price display**: Buy/sell prices, change value, change percentage
- **Trend chart**: 10-slot bar chart showing recent price trend
- **Data source switching**: Tap the bank name to cycle through all data sources
- **Manual refresh**: Tap the refresh button to update prices

## Data Sources

| Bank | Type | API |
|------|------|-----|
| China Merchants Bank (CMB) | Buy/Sell | `mbmodule-openapi.paas.cmbchina.com` (POST) |
| Zheshang Bank (ZS) | Single price | `api.jdjygold.com` (GET) |
| ICBC / Minsheng / CGB / CIB / JD Gold / London Gold | Single price | `jin.20021002.xyz/api.php` (GET) - GoldMonitor aggregator |

## File Structure

```
Gold-Price-Widget/
  index.tsx           # Settings page (data source selection)
  widget.tsx          # Widget rendering (WidgetHeader / TrendBars)
  app_intents.tsx     # RefreshGoldIntent + SwitchBankIntent
  script.json         # Script metadata
  utils/
    fetchGold.ts      # Gold price API wrapper
CLAUDE.md             # Project documentation
```

## Usage

1. Install via Scripting app
2. Add the widget to your home screen or lock screen
3. Tap the bank name to switch data sources
4. Tap the refresh button to update prices

## Privacy

- All data is fetched directly from public APIs
- No user data is collected or transmitted
- External domains: `mbmodule-openapi.paas.cmbchina.com`, `api.jdjygold.com`, `jin.20021002.xyz`

## License

MIT