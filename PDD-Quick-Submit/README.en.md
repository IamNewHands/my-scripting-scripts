# PDD Quick Submit

Submit Pinduoduo team codes to multiple helper sites from [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文**：[README.md](./README.md)  
> Catalog：[../README.md](../README.md) · [../README.en.md](../README.en.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D

---

## Features

- Codes up to **10 digits** are sent as one; longer input is auto-split into 8/9-digit chunks (multiple codes).
- Submit **in parallel** to multiple third-party helper sites (publisher / simple).
- **First success wins**: return as soon as any site succeeds (no waiting on the slowest).
- Per-code **5s deadline**; **3s** request timeout + native `timeout` dual guard.
- Result as **success/total**, e.g. `123456789 1/2`.
- **Shortcuts / Share text** via Intent.

## How to read results

| Example | Meaning |
|---|---|
| `123456789 1/2` | At least one site succeeded (others aborted) |
| `123456789 2/2` | Two sites succeeded |
| `123456789 0/2 already exists` | All failed; one failure reason appended |

## Author

- **Maintainer**: [IamNewHands](https://github.com/IamNewHands)
- **Home**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/PDD-Quick-Submit

## Requirements

| Item | Notes |
|---|---|
| Scripting App | iOS TSX runtime |
| Network | Configured helper-site domains |
| Input | 8/9-digit team codes |

Codes are posted to **third-party** helpers — **not** the official Pinduoduo API. Availability depends on those services.

## Usage

1. **Import**:  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D
2. Run in Scripting and paste codes, or pass text via Shortcuts.
3. Read notification / exit text as `ok/total`.

## Layout

```
PDD-Quick-Submit/
├── index.tsx
├── intent.tsx
├── script.json
├── README.md
└── README.en.md
```

## Domains / privacy

Default `SITES` (see source):

- `pdd.xxs666.cn` (`POST /api/codes`, local `publisher_token`)
- `pdd.dcvx.cn` (`POST /api/codes`, body `{ code }`)

> `pqpdd.t6k.cn` started requiring WeChat authorization in 2026-09 and cannot be driven by the script; removed in 1.3.1.

Payload is the team code plus site tokens/cookies. No Apple ID passwords.

## Limits

- If one site is up, you may still get `1/2` while others fail.
- Random digits may be accepted/rejected by helpers; trust the Pinduoduo app for invite status.
- Site list is hardcoded in source.

## Release

- ASCII dir: `PDD-Quick-Submit`
- Zip: `…/releases/latest/download/PDD-Quick-Submit.zip`
- `remoteResource.hash` = full zip MD5
- Version: **1.3.1**

### Changelog

- **1.3.1**: Removed `pqpdd.t6k.cn` (now requires WeChat authorization); `pdd.dcvx.cn` switched to the new `POST /api/codes`; dropped the home-page preflight and the redundant code-rules request in single-code mode (end-to-end ~3.5s → ~0.2s); `403` business errors now surface the JSON message (e.g. "already exists"); default prefixes updated to `1/8/9`.
- **1.3.0**: Codes up to 10 digits sent as one; 9-digit support.
- **1.2.0**: First-success return + per-code deadline + numeric result.

