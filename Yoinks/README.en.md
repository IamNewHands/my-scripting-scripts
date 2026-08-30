# Yoinks

An iOS media downloader for [Scripting](https://scripting.fun). Paste or share a public media link, probe the available formats, download, and save to Photos or Files.

Current version: **1.6.13**

Author: **vcncv**

> Inspired by [Pablo Stanley / Yoinks](https://github.com/pablostanley/yoinks), re-implemented for the Scripting runtime and adapted for iOS and the Scripting host.
>
> **中文文档**：[README.md](./README.md)  
> Repo index: [../README.md](../README.md) · [../README.en.md](../README.en.md)

---

## Features

- **Link input & batch queue**: paste from clipboard, type manually, or share via Share Sheet / Intent; add multiple links and download sequentially.
- **Format probing & download**: `yt-dlp` probes title, duration, resolution and audio/video streams. Auto-loads when only one video format exists, otherwise lets you pick. H.264 MP4 preferred; HEVC / AV1 / VP9 stream-copied to MKV (external player). Audio-only MP3 and one-tap best-quality included. Missing resolutions are backfilled from page metadata / file `moov` / TS-segment SPS. **m3u8 direct-link analysis uses a native fast path** (skips yt-dlp).
- **YouTube UMP official channel first**: integrates the yt-dlp-ytse plugin; downloads prefer the official UMP POST channel with automatic fallback to plain yt-dlp on per-stream failure; protocol (`ump`/`https`) is logged. UMP components ship with the repo and self-heal.
- **Online preview & save**: DASH dual-stream, H.264-first and muted/unmuted autoplay; HLS/m3u8 downloads natively over HTTP/2 with highest-resolution auto-pick, AES-128 native decryption, EXT-X-MAP/CMAF init segments, `#EXT-X-BYTERANGE` fragments, and DASH MPD native downloads. MSE playback uses a custom control bar. Save to Photos, Files, or a custom directory.
- **Recent candidates**: Safari active collection, discovery queue, manual and clipboard links unified for 24h; filter by recommendation / HLS / DASH / video / audio / page.
- **Safari candidate collection**: user-script **1.3.1** collects public media candidates only on active user action; draggable floating entry; multi-endpoint capture.
- **Public player fallback & link resolution**: limited static-source fallback and anonymous link-chain resolution with a 12s timeout; no script execution, no Cookie/authorization.
- **Sites & reliability**: Douyin via anonymous WebView details; Xiaohongshu, YouTube, Bilibili etc. via `yt-dlp`; HLS/native/direct links and Douyin work without yt-dlp. Login/Cookie retry and TLS-compat retry supported; duplicate detection and one-tap cache cleanup.
- **History & settings**: download history, recent links, storage cleanup, download cache cleanup, run logs, output directory, default save method, and `yt-dlp` updates.

---

## Install

### One-tap install (recommended)

Open in iOS Safari:

```text
https://scripting.fun/import_scripts?urls=%5B%22https:%5C/%5C/github.com%5C/ckldy%5C/Yoinks%22%5D
```

Or visit:

- GitHub: https://github.com/ckldy/Yoinks
- Releases: https://github.com/ckldy/Yoinks/releases

### Manual install

1. Install [Scripting](https://scripting.fun)
2. Clone or download this repo into Scripting's `scripts/Yoinks` directory
3. Open **Yoinks** in Scripting and run

---

## Usage

1. Open the **Download** page and paste (or import from clipboard) a public media link.
2. Wait for probing: one video format auto-loads; multiple formats let you pick, or use the "Best quality / MP3 only" shortcuts.
3. Start downloading; progress shows size, speed and stage.
4. Save to Photos or Files when done; manage history in **Records**.

You can share **URL / text** from other apps into Yoinks; Douyin / Xiaohongshu share text is parsed for short links or page links first.

---

## Structure

| Tab | Description |
|-----|-------------|
| Records | Download history, preview/share/delete, load-more on scroll |
| Download | Current link, recent candidates, format list, batch queue, task progress & results |
| Settings | Preferences, tool status, logs, about & update notes |

Runtime directories (not committed): `logs/` and `Yoinks/Downloads` under the app Documents.

---

## Privacy, Security & Limits

- For public content you are **authorized to keep** and personal backups; respect the target site's ToS and local law.
- Safari candidate collection reads public media candidates only on active user action; it never collects/imports/saves Cookie, Authorization or other request credentials.
- Public-player fallback and link resolution use anonymous `http(s)` requests only; limited to the current page and up to 3 same-registered-domain iframes; 12s timeout, 1.5 MB page cap, no recursion, no script execution.
- No support for cracking or bypassing DRM, licenses, paywalls, login walls, captchas, geo-restrictions, or unauthorized scraping.
- Site rules and extractors change; some content may require a user-provided authorized login Cookie, or may fail due to network/TLS.
- Some hardcoded codecs may render "audio but no video" on iOS; the format list prefers H.264. HEVC / AV1 / VP9 stream-copy to MKV — use an external player if needed.

---

## Development & Verification

```bash
scripting-ts project "Yoinks" --check
```

The repo includes `verify_*.ts` / `verify_*.py` regression scripts covering candidates, Safari candidates, sanitization, public-player sources, format selection, batch queue, discovery, output paths and preview.

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for details.

| Version | Highlights |
|---------|-----------|
| **1.6.12** | Download reliability: cancel fixes, background keep-alive, completion notification |
| **1.6.11** | YouTube UMP official channel download, DASH player stability, MSE custom control bar |
| **1.6.9** | HLS pipeline: AES-128 native decrypt, EXT-X-MAP/CMAF init, BYTERANGE, DASH MPD→m3u8 bridge; capture runtime proxy |
| **1.6.8** | Fix stale Safari candidates in recent-candidate library |
| **1.6.7** | Safari collector 1.2.9: same-origin iframe m3u8, public-player resolution |
| **1.6.6** | Safari collector 1.2.5: PH-site signed manifest endpoints, perf 37s → 2-5s |
| 1.6.0-1.6.5 | Candidate library, Safari collection, HLS native download, public-player fallback |
| 1.5.0-1.5.1 | HLS/DASH speed control, resolution pick, reliability fixes |

---

## Credits

- **vcncv** — Scripting adaptation, maintenance & release
- [Pablo Stanley / Yoinks](https://github.com/pablostanley/yoinks) — upstream product & interaction inspiration
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — media extraction
- [Scripting](https://scripting.fun) — iOS script runtime

## License

Unless stated otherwise, the repo-root license applies. Upstream Yoinks and dependencies such as `yt-dlp` follow their own licenses.
