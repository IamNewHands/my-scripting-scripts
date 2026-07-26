# IPA-Tool

Download older App Store IPA builds and install them inside [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文说明**：[README.zh-CN.md](./README.zh-CN.md)  
> Repo index：[../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D

---

## What it does

- Sign in with **your own Apple ID** to iTunes / App Store and request IPA download URLs via Apple Configurator-style protocols.
- You get an **Apple-signed** IPA. Locally the script only injects:
  - `iTunesMetadata.plist`
  - `SC_Info/*.sinf` (license data for **your** account)
- No re-sign, no dump, no `Info.plist` rewrite. Installed apps behave like App Store installs and **do not expire in 7 days**.
- Requirement: your Apple ID has previously obtained the app (free apps count).

## Account & password flow (source-level)

- Login goes **directly** to Apple:  
  `POST https://auth.itunes.apple.com/auth/v1/native/fast/`
- Request body is a plist; the `password` field is password + optional 2FA code.
- Cookies / `dsPersonId` / `storeFront` are stored **only on-device** (`Storage` key `AppleLogin`). Nothing is uploaded to third-party backends for login.
- Passwords are stored in **iOS Keychain** (`loginPassword:<account>`), not plain `Storage`.
- `localApi(...)` is an **in-process router**, not a network call.  
  `services/appleStore/api/localApi.ts` dispatches paths like `/auth/login` to `AuthService.login()`.

## External domains (transparency)

| Host | Purpose | Data sent |
|---|---|---|
| `auth.itunes.apple.com` | Apple login | Apple ID / password / 2FA |
| `buy.itunes.apple.com` / `p*-buy.itunes.apple.com` | Purchase & download | dsPersonId, Cookie, App ID |
| `itunes.apple.com` | Search / lookup | Keywords, App ID |
| `api.timbrd.com` / `apis.bilin.eu.org` | Historical version IDs | Numeric App ID only |
| `api.scripting.fun/ipa-plist` | Install manifest (cloud) | File name, Bundle ID, version |
| `xiaobai.app/install` | Install manifest (local proxy; needs Loon/Surge) | Same fields, **stays on device** |
| `https://your-domain/ipa-plist` | Your own plist service | Same fields, your server only |

## Plist service modes

iOS needs an HTTPS manifest.plist when installing. Privacy levels:

| Mode | Who builds plist | Leaves device? | Proxy needed | Self-host |
|---|---|---|---|---|
| **Scripting** | `api.scripting.fun` | App name + Bundle ID + version + IP | No | No |
| **Proxy module** | Local plugin | **No** | Yes (Loon/Surge) | No |
| **Custom** | Your server | Only to you | No | Yes |

None of these modes send Apple ID / password / Cookie. Those are handled only in the Apple login path.

## Self-hosted plist (Cloudflare Worker sketch)

Deploy a Worker that answers `GET /ipa-plist` and returns XML. IPA URL should point at `http://localhost:8000/<fileName>` (the in-app HTTP server). Then paste the Worker URL into Settings.

Minimal Worker idea:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== "/ipa-plist") {
      return new Response("not found", { status: 404 })
    }
    const name = url.searchParams.get("name") || "app"
    const bundleId = url.searchParams.get("bundleId") || ""
    const displayVersion = url.searchParams.get("displayVersion") || ""
    const fileName = url.searchParams.get("fileName") || ""
    // Build a standard itms-services manifest XML from the query params.
    // IPA asset URL: http://localhost:8000/<fileName>
    const plist = `<?xml version="1.0" encoding="UTF-8"?>...` // fill full manifest
    return new Response(plist, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache",
      },
    })
  },
}
```

## Install steps

1. **Download IPA**: log in with an Apple ID that owns the app → search → pick version → download.
2. **Tap install**: the script starts `http://localhost:8000` and opens `itms-services://`.
3. **Required**: Loon or Surge MitM + trusted CA for plist interception / local proxy.
   - Loon plugin: <https://kelee.one/Tool/Loon/Lpx/IPATool.lpx>  
     Import: `loon://import?plugin=https://kelee.one/Tool/Loon/Lpx/IPATool.lpx`
   - Surge: see <https://hub.kelee.one/> or `luestr/ProxyResource` for `IPATool.sgmodule`.
4. **App Store “update” noise**: after sideload-style install, App Store may show odd states. Turn off auto-updates and don’t tap Update for that app if you want to keep the older build.

## Security & privacy notes (this fork)

- Passwords: **Keychain only** (not `login_history` / not plain Storage blobs).
- Login session (Cookie / tokens): on-device Storage only.
- Debug logging for icon color extraction and download metadata has been stripped in recent builds to reduce log noise and accidental leakage.
- Local HTTP server serves IPA files from the app temp folder on port `8000` for install only.

## Known limits

- Only apps your Apple ID has obtained.
- Switching Apple ID can make older IPAs crash (sinf mismatch).
- Real device install depends on proxy MitM; Scripting alone is not enough for the install path.

## Import & auto-update

- **One-tap import (recommended)**  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D

- **Auto-update** via `script.json` → `remoteResource`:

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/IPA-Tool.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

`hash` is the **MD5 of the whole zip file**. Release zip root must contain `index.tsx` / `script.json` directly (no extra top-level folder).

### Publishing a new version

1. Zip the `IPA-Tool/` contents at zip root.
2. Create a GitHub Release (tag like `IPA-Tool-vX.Y.Z`) and upload `IPA-Tool.zip`.
3. Set `script.json` `remoteResource.hash` to the zip MD5; bump `version`.
4. Commit + push `main`.

## License

MIT — see repo root [`LICENSE`](../LICENSE).  
Original: [luestr](https://github.com/luestr) · Maintained by [IamNewHands](https://github.com/IamNewHands).
