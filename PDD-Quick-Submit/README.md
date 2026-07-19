# PDD Quick Submit

Submit Pinduoduo team codes to multiple helper sites from [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文**：[README.zh-CN.md](./README.zh-CN.md)  
> Catalog：[../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D

---

## Features

- Accept **9-digit** team codes, or **9N concatenated** digits (split every 9).
- Submit **in parallel** to multiple third-party helper sites (publisher / token).
- **First success wins**: return as soon as any site succeeds (no waiting on the slowest).
- Per-code **5s deadline**; **3s** request timeout + native `timeout` dual guard.
- Result as **success/total**, e.g. `123456789 1/3`.
- **Shortcuts / Share text** via Intent.

## How to read results

| Example | Meaning |
|---|---|
| `123456789 1/3` | At least one site succeeded (others aborted) |
| `123456789 2/3` | Two sites succeeded |
| `123456789 0/3 timeout` | All failed; one failure reason appended |

## Author

- **Maintainer**: [IamNewHands](https://github.com/IamNewHands)
- **Home**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/PDD-Quick-Submit

## Requirements

| Item | Notes |
|---|---|
| Scripting App | iOS TSX runtime |
| Network | Configured helper-site domains |
| Input | 9-digit team codes |

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
└── README.zh-CN.md
```

## Domains / privacy

Default `SITES` (see source):

- `pdd.xxs666.cn`
- `pqpdd.t6k.cn`
- `pdd.dcvx.cn`

Payload is the team code plus site tokens/cookies. No Apple ID passwords.

## Limits

- If one site is up, you may still get `1/3` while others fail.
- Random digits may be accepted/rejected by helpers; trust the Pinduoduo app for invite status.
- Site list is hardcoded in source.

## Release

- ASCII dir: `PDD-Quick-Submit`
- Zip: `…/releases/latest/download/PDD-Quick-Submit.zip`
- `remoteResource.hash` = full zip MD5
- Version: **1.1.0**

