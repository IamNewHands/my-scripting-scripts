# Gist

Manage GitHub Gists on your iPhone/iPad inside [Scripting App](https://apps.apple.com/app/scripting/id6479691128).

> **中文说明**：[README.zh-CN.md](./README.zh-CN.md)  
> Repo index：[../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**One-tap import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGist%22%5D

---

## What it does

- List your own GitHub Gists with expandable file tree
- Create new Gists (public or private) with **description** support
- Edit file content inline with a code editor
- Add / rename / delete files within an existing Gist
- Copy raw file URL to clipboard
- Switch between multiple GitHub accounts via **named profiles**
- Tokens stored in **iOS Keychain** (per-script scoped), not in plain Storage

## Token & profiles

1. Open **Settings** → tap **+** to add a profile.
2. Give it a **name** (e.g. "Work", "Personal") and paste a **GitHub PAT** with `gist` scope.
3. The script will try to fetch your `@login` from GitHub `/user` for display.
4. Use the **picker** to switch between profiles — the list reloads automatically.
5. Delete a profile by entering `DELETE` to confirm.

### How to create a PAT

- **One‑click**: [Generate PAT with `gist` scope](https://github.com/settings/tokens/new?scopes=gist&description=Scripting%20Gist)
- Classic PAT with `gist` scope is sufficient; fine‑grained tokens with Gist R/W also work.

## External domains

| Host | Purpose | Data sent |
|------|---------|-----------|
| `api.github.com` | Gist CRUD + user info | Token (Bearer auth) |

No data is sent to any third‑party backend.

## Known limits

- Gist API returns only the first 30 gists (no pagination in this version).
- Deleting the last file of a Gist via the UI is not supported — delete the whole Gist instead.
- The `script.json` `remoteResource` is set up for future auto‑update; a release zip has not been published yet.

## Import & auto-update

- **One-tap import**  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGist%22%5D

- **Auto-update** via `script.json` → `remoteResource`:

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/Gist.zip",
  "autoUpdateInterval": 86400,
  "hash": "<md5-of-zip>"
}
```

`hash` is the **MD5 of the whole zip file**. Release zip root must contain `index.tsx` / `script.json` directly (no extra top-level folder).

## License

MIT — see repo root [`LICENSE`](../LICENSE).  
Original author: [001](https://github.com/001ProMax) · Maintained in this repo by [IamNewHands](https://github.com/IamNewHands).