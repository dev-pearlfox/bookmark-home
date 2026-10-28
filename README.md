# Bookmark Home

A calm, curated start page for your links: bookmarks live in colour-coded
category columns that you can reorder, resize and extend. By **PearlFox** —
live at <https://bookmark-home.pearlfox.io>.

It is a pure client-side app: no backend, no accounts. Your data stays in
your browser (and, optionally, in a backup file on your own disk).

## Features

- Drag-and-drop bookmarks between and within categories; drag categories to reorder
- **Column View**: resizable columns, with named containers stacked under each column
- Custom category names, icons and colours
- "Open all" for a whole category (browsers only allow one new tab per click unless you
  allow pop-ups for this site; the app tells you if some were blocked)
- Auto-fetched titles and favicons when you paste a URL
- Optional **auto-backup** to a JSON file on disk (Chromium browsers), with manual restore

## Quick start

Requires **Node 22+** (see `.nvmrc`; `nvm use` picks it up).

```bash
npm ci          # install exactly what package-lock.json says
npm run dev     # local dev server with HMR
npm run build   # production build into dist/
npm run preview # serve the production build locally
npm run lint    # oxlint
npm test        # unit tests (Vitest); `npm run test:watch` while developing
```

Every pull request must pass lint, tests, build and `npm audit` (see
`.github/workflows/ci.yml`); a push to `main` only deploys if lint and tests pass.

## Project layout

```
src/
├─ App.jsx          state + mutations + drag-and-drop wiring
├─ reorder.js       pure drag-drop reordering logic (unit-tested)
├─ openAll.js       "Open all": opens tabs, counts what the browser blocked
├─ storage.js       the ONLY place that touches localStorage
├─ snapshot.js      validation + backup payload (state + layout sizes)
├─ backup.js        File System Access API + IndexedDB auto-backup
├─ metadata.js      URL helpers, favicon + title lookup, safety checks
├─ defaultData.js   seed categories/bookmarks, icon + colour lists
└─ components/      UI (columns, cards, modals, error boundary, hooks)
```

## Data, backup and privacy

- **Storage:** bookmarks and categories are kept in `localStorage`
  (`pf.bookmarkHome.v1`); per-column sizes use their own keys. Clearing site
  data deletes them.
- **Backup:** *Set up auto-backup* links a JSON file you choose. Every change
  is written to it. After a wipe or on a new machine, use *Restore from a
  backup file* (restore is manual — browsers clear the stored file handle
  together with site data). Unsupported in Firefox/Safari; the app then
  works with `localStorage` only.
- **Safety:** only `http(s)` links are accepted; anything else found in
  stored or restored data (e.g. `javascript:`) is dropped.
- **Third-party requests** (these are the only network calls the app makes):

  | Service | What it receives | Why |
  |---|---|---|
  | Google favicons (`google.com/s2/favicons`) | the bookmark's domain | icon |
  | Microlink (`api.microlink.io`) | the full URL you are adding | page title |

  Title lookup is skipped for private hosts (`localhost`, intranet names,
  `.local`/`.internal`, private IP ranges); the domain is used as the title.

  **Online lookups switch.** The "Online lookups" switch in the header turns both
  services off. It is on by default. When it is off, nothing is sent to Google or
  Microlink: titles come from the domain name and icons are letter tiles. The choice
  is saved in your browser (`pf.bookmarkHome.lookups.v1`), not in your bookmarks or
  backups.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml` (custom domain in `public/CNAME`).

## Protected code

Some code is owner-protected and must not be changed without explicit
approval — see [`PROTECTED.md`](./PROTECTED.md) before editing icons or
default categories.

## License

Proprietary — © 2026 PearlFox, all rights reserved. See [`LICENSE`](./LICENSE).

- **Anyone may use the hosted app** to keep their own bookmarks.
- **Nobody may copy, modify, fork-and-host or redistribute** the code or assets
  without written permission. Seeing the source does not grant those rights.

Changes to this repository are accepted only from people PearlFox has
authorised (see `.github/CODEOWNERS`).
