# Yoinks
Public media link downloader for [Scripting App](https://apps.apple.com/app/scripting/id6479691128) (TypeScript / TSX + yt-dlp).
> **中文**：[README.zh-CN.md](./README.zh-CN.md)  
> Catalog：[../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)
**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FYoinks%22%5D
---
## Features
- Paste, type, or share a public **http(s)** media page URL.
- **Probe formats first**, then download the selected stream (yt-dlp).
- Video/audio merge via built-in **FFmpeg** when needed; stream verification with **ffprobe**.
- Save to **Photos** or **Files**; history with managed storage limits.
- Local **AVPlayer** playback + **Open in other apps** (share sheet).
- TLS-friendly defaults for Scripting's Python CA environment; optional platform login for Douyin / Xiaohongshu.
- Debug mode with structured, redacted logs.
## Author
- **Maintainer**: [IamNewHands](https://github.com/IamNewHands)
- **Home**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/Yoinks
- Inspired by [pablostanley/yoinks](https://github.com/pablostanley/yoinks) (not a full Node upstream port).
## Requirements
| Item | Notes |
|---|---|
| Scripting App | iOS TSX runtime |
| Network | Access to media host / CDN |
| Tools | `python3 -m yt_dlp`, `ffmpeg`, `ffprobe` (install yt-dlp from Settings) |
| Permissions | Photos / Files / Pasteboard as used |
## Code map
| Path | Role |
|---|---|
| `index.tsx` | Tabs: History / Download / Settings |
| `intent.tsx` | Share / Shortcuts URL or text |
| `services/media.ts` | Probe, download, merge, save |
| `services/history.ts` | Download history & storage prune |
| `services/logs.ts` | Structured logs (minimal + debug) |
| `services/platform-auth.ts` | Douyin / XHS cookie sessions |
| `services/preferences.ts` | Save mode, concurrency, limits |
| `pages/*` | About, logs, native player |
| `ytdlp_probe.py` / `ytdlp_runner.py` | yt-dlp wrappers |
## External domains / privacy
- Media hostnames from the user-supplied URL (e.g. YouTube, Douyin, Xiaohongshu).
- Optional platform login uses an in-app WebView; cookies are written only to temporary task files and removed after use.
- Logs redact cookie / token fields and URL queries when possible.
## Limits
- Not a full reproduction of the upstream Node Yoinks app.
- Some sites (especially YouTube) may require cookies / JS runtime under bot checks.
- Fragment resume is yt-dlp-level; there is no full “paused task list” UI yet.
- Auto-update expects the Release asset `Yoinks.zip` on this repo.
## License
See repository root [LICENSE](../LICENSE).
