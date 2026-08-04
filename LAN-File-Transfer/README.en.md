# LAN File Transfer

Transfer files, images and text between your iPhone and any device's browser over LAN or a personal hotspot. Scan the QR code to connect — no app install on the receiving device.

> 中文文档: [README.md](./README.md)

## Features

- **Connect by QR code**: Show the QR code in the app; the other device scans (or opens the link) to enter the chat page — no install needed
- **Two-way transfer**: App ⇄ Browser, files, images and text in both directions
- **No mobile data**: Devices connect directly over LAN, no cloud relay
- **Text chat**: Real-time text between app and browser (WebSocket)
- **Image preview**: Image messages preview inline; tap to share/save
- **Share Sheet integration**: Drag files/images from the share menu into the chat
- **Dark mode**: Both app and browser adapt to light/dark

## Communication

| Link | Protocol | Description |
|------|----------|-------------|
| Browser → App upload | HTTP POST | Browser sends raw bytes directly |
| App → Browser download | HTTP GET | Temporary route `/dl/<id>` serves the file |
| Text / connection status | WebSocket | Bidirectional real-time messages |

## Project Structure

```
LAN-File-Transfer/
├── index.tsx               Normal entry (opens chat page)
├── intent.tsx              Share intent entry (auto-attaches files/images)
├── launch.tsx              Shared launch flow (serve→keep-alive→page→cleanup)
├── types.ts                Unified message/connection types
├── class/
│   ├── share.ts            Core local HTTP + WebSocket server
│   └── html.ts             Browser chat page HTML
├── components/
│   └── Bubble.tsx          Message bubbles (text/image/file)
├── page/
│   └── index.tsx           ChatPage UI
├── script.json             Script metadata
├── README.md               Chinese docs
└── README.en.md            This file (English)
```

## Usage

1. Open "LAN File Transfer" in the app
2. Tap the QR code button, or open the shown link on another device
3. The browser opens the chat page and you can transfer files/images/text both ways

## Privacy

- Devices connect **directly over LAN**; no relay service, **no mobile data consumed**
- The local HTTP/WS server is temporary; received files are cleaned up when the session closes
- No user data is collected, uploaded, or shared

## Limitations

- Both devices must be on the same LAN/hotspot; not usable over pure cellular
- Received files are stored in a temporary directory; **closing (the ✕ button) deletes them**; use "Minimize" to keep them
- The close button shows a confirmation to avoid accidentally clearing received files

## External Domains

- None (pure LAN direct connection, no external services)

## Original Author & Credits

This is a community-maintained fork of the original script. Original authorship is preserved:

- **Original author**: Keywos ([GitHub](https://github.com/Keywos))
- **Contributor**: Waa ([GitHub](https://github.com/iamwaa)), the original script is hosted in [iamwaa/Scripting](https://github.com/iamwaa/Scripting)

This fork only adds enhancements and maintenance; the original author's license and attribution remain unchanged.

## Other Scripts in This Repo

- [Watchlist Valuation](../WatchlistValuation/README.en.md) — Fund/stock watchlist with estimated NAV widget
- [Gold Price Widget](../Gold-Price-Widget/README.en.md) — Real-time gold price widget

## License

MIT
