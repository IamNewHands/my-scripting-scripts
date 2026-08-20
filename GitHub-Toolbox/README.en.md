# GitHub Toolbox

> 中文文档: [README.md](./README.md)

Three GitHub tools in one entry inside the [Scripting app](https://apps.apple.com/app/scripting/id6479691128): **Gist management, starred-repo browsing, and Actions workflow monitoring** (with a home-screen widget).

Original authors: [001](https://github.com/001ProMax) (Gist) · [瀬戸 明日葉](https://github.com/OkadaMei/Scripting) (Star) · Actions + integration maintained by [IamNewHands](https://github.com/IamNewHands).

![version](https://img.shields.io/badge/version-1.0.0-blue)
![platform](https://img.shields.io/badge/platform-iOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-green)

**One-click import**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGitHub-Toolbox%22%5D

---

## Features

### 🔧 Gist Manager (by 001)
- List your Gists with an expandable file tree
- Create public / private Gists with a description
- Inline code editor to edit file contents
- Add / rename / delete files within an existing Gist
- Copy the raw link of a file to the clipboard
- **Multi-account profiles**: multiple GitHub tokens, all stored in **iOS Keychain** (per-profile domain), never persisted in plain-text Storage

### ⭐ GitHub Star (by 瀬戸 明日葉)
- Browse your starred repositories, paging through all of them (100 per page)
- Ordered by **push activity** to surface recently active repos
- Pin repositories; switch presentation style (automatic / full screen) and bottom-tab layout — preferences are persisted
- Pinned repositories page: view your pinned repos

### ⚙️ GitHub Actions
- Browse workflows, run history, and status (queued / in progress / success / failure) per repository
- Trigger (dispatch) workflow runs, and cancel them
- Multi-account profile management (metadata in Storage, tokens in Keychain)
- Local TTL caching for fast status reuse; caches cleared after trigger / rerun / cancel
- **Home-screen widget**: shows workflow run status and next scheduled (cron) run for multiple repositories; tap buttons to trigger a run via `RunWorkflowIntent` with a local notification

## Token Management

Each tool keeps its own token, all stored in **iOS Keychain** (`unlocked_this_device`). Storage holds only profile metadata (id / name / login), never plaintext:

- Gist: `gist_token_<profileId>` (legacy `gist_token` auto-migrated)
- Star: `github-star.access-token`
- Actions: `gh_token_<profileId>` etc. in Keychain + `gh_profiles_v1` profile list

### How to create a PAT

- Gist: [Generate a PAT with `gist` scope](https://github.com/settings/tokens/new?scopes=gist&description=Scripting%20Gist) (classic `gist`, or Fine-grained Gist read/write)
- Star: needs `repo` (or `public_repo`) read access for the starred list
- Actions: needs `repo` and `workflow` scopes to view & trigger workflows

## External Domains

| Domain | Purpose |
|--------|---------|
| `api.github.com` | Gist CRUD, starred list, Actions workflows / runs / triggers |

All requests go directly to GitHub — no third-party backend.

## Project Layout

```
GitHub-Toolbox/
├── index.tsx                         Entry: menu of the three tools (NavigationStack)
├── widget.tsx                        Widget: Actions status + one-tap trigger
├── app_intents.tsx                   RunWorkflowIntent (widget tap triggers a workflow)
├── script.json                       Metadata
├── README.md / README.en.md          Docs
│
├── src/
│   ├── gist/                          Gist Manager (by 001)
│   │   ├── class/gist.ts              Gist API + profile / Keychain management
│   │   └── page/                      list / add / edit / update / setting
│   ├── star/                          Star browser (by 瀬戸 明日葉)
│   │   ├── types.ts                   GitHub repository types
│   │   ├── github-api.ts              Keychain token + starred API
│   │   ├── starred-page.tsx           Starred list page (sorted by push activity)
│   │   ├── pinned-repositories-page.tsx / pinned-repositories.ts   Pinned repos
│   │   └── glass-ui.tsx               Frosted-glass UI components
│   └── actions/                       Actions monitor (integrated here)
│       ├── github.ts                  GitHub requests / cache / multi-account profiles
│       └── index.tsx                  Console pages (repo / workflow / run / trigger)
```

## Privacy

- Tokens live only in the local **iOS Keychain**; requests go directly to `api.github.com` (Bearer auth) and are never sent elsewhere
- The script does **not** collect, upload, or share any personal information
- The only local persistence is Storage profile metadata and Actions caches (`gh_cache_v1_*`)
- No real tokens / cookies / private keys are present in this codebase

## Known Limitations

- Gist API returns only the first 30 by default (no paging in this version)
- Star is paged at `per_page=100`; extremely large collections may hit GitHub API rate limits
- Actions triggering only supports the `workflow_dispatch` entry (passes empty `inputs`)
- The widget depends on a logged-in Actions profile; otherwise it shows "Not logged in"

## Other Scripts in This Repo

- [Watchlist Valuation](../WatchlistValuation/README.en.md) — intraday fund valuation & multi-market watchlist
- [Gold Price Widget](../Gold-Price-Widget/README.en.md) — real-time bank gold price widget
- [Gist](../Gist/README.en.md) — standalone Gist manager

## License

MIT — see [`LICENSE`](../LICENSE) at the repo root.