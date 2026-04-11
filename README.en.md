# Matching Manager

A matchmaking management app for card game meetups and events.
No server required. No installation needed. Runs entirely in the browser.

**[Open App](https://soichirow.github.io/matching-kanri/)**

---

## Features

- **Auto Matchmaking** — Avoids repeat pairings and prioritizes mixing different groups
- **Event Sharing** — Share table assignments with participants via 4-digit code or QR
- **Score Tracking** — Record VP (Victory Points), auto-generate standings, CSV export
- **Anyone Can Host** — Create and run events with just a URL

## Screens

| Screen | URL | Purpose |
|--------|-----|---------|
| Admin | `index.html` | Host manages players, tables, and matchmaking |
| Participant View | `view.html` | Participants check seating, standings, and match history on mobile |

---

## How to Use

### For Hosts

```
1. Add players (＋人 button / Excel bulk import)
2. Add tables (＋卓 button)
3. Press "マッチング" to auto-assign seats → preview → confirm
4. End match → next round
```

### Sharing an Event

1. Settings → "イベントを共有する"
2. A 4-digit participation code and URL are generated
3. Share the code or QR with participants
4. Admin actions sync to participant screens in real-time

### For Participants

1. Open the shared URL, or enter the participation code at `view.html`
2. Search your name → your seat and opponents are displayed
3. View table assignments, standings, and match history in real-time

---

## Feature List

### Matchmaking
- Score-based auto-matching (same group +5pts, repeat opponent +10pts/time)
- Bracket system (match only within the same bracket)
- Avoid consecutive short-handed tables
- VP-weighted matchmaking (when scores are enabled)
- Minimize seat movement (exhaustive search for ≤8 tables)
- Provisional match preview → confirm/cancel per table

### Player Management
- Groups (A-E + custom) — avoid same-group pairings
- Brackets — match only within the same bracket
- Status management (waiting / playing / excluded)
- Excel/CSV bulk import

### Table Management
- 2-8 player tables
- Drag-and-drop layout on canvas (grid snap)
- Room objects (walls, monitors, etc.)

### Scoring & Standings
- VP input fields on active tables
- Cumulative score standings
- CSV export

### Event Sharing (Supabase)
- 4-digit participation code + QR code
- Real-time sync via Supabase Realtime
- Secure updates via admin_key (RPC functions)
- Auto-deletion after 14 days (pg_cron)
- Daily backup to Google Sheets (GAS)

### Other
- Dark / Light theme
- Ctrl+Z undo (up to 30 actions)
- Auto-save to localStorage

---

## Tech Stack

```
Admin (index.html)      ← Served via GitHub Pages
    ↓ Supabase JS SDK
Supabase (PostgreSQL)   ← Data sharing & real-time sync
    ↑ REST API
Participant (view.html) ← Served via GitHub Pages
```

### File Structure

```
index.html              Admin screen (single file)
view.html               Participant view page
src/
  store.js              localStorage CRUD (test reference)
  matching.js           Matching algorithm
  layout.js             Drag & drop
tests/                  Unit tests (72 cases)
e2e/                    E2E tests (30 cases)
gas-backup/             GAS backup script
docs/                   Documentation
```

### External Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| GitHub Pages | Static hosting | Unlimited |
| Supabase | DB + real-time sync | 500MB / 200 concurrent |
| Google Sheets + GAS | Backup | Unlimited |
| Lucide Icons (CDN) | Icons | - |

---

## Development

```bash
npm install             # Install dependencies
npx vite                # Dev server
npx vitest run          # Unit tests (72 cases)
npx playwright test     # E2E tests (30 cases)
npx eslint . --ext .js  # Linter
```

---

## Disclaimer

- This app is provided **AS IS** with no warranties of any kind.
- The developer assumes **no liability** for any damages arising from use of this app, including but not limited to data loss, event management issues, or any direct or indirect damages.
- Data is stored in **browser localStorage** and **external services (Supabase)**. Data may be lost due to browser data clearing, service outages, or specification changes. Back up important data separately.
- The developer does not guarantee the availability or continued free tier of external services (Supabase, Google Sheets, CDN, etc.).
- Shared URLs and participation codes are accessible by **anyone who knows them**. Do not include personal or sensitive information in player names.
- This is a personal open-source project. Ongoing support and maintenance are not guaranteed.

---

## License

MIT - (c) Soichiro [@black777cat](https://x.com/black777cat)
