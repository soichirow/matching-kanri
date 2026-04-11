# Event Organizer Guide

A guide for managing card game event matchmaking.

---

## Getting Started

1. **Open the app** — https://soichirow.github.io/matching-kanri/
2. **Add tables** — Press "＋テーブル" button → Select count and player size in dialog
3. **Add players** — Press "＋プレイヤー" button → Select count in dialog, or bulk-import from Excel
4. **Match** — Just press the "マッチング" button at the bottom of the screen

---

## Event Flow

### Preparation

- **Add tables**: Press "＋テーブル" → In the dialog, select the number of tables (1-10) and player count per table (2-8). Default is 4-player tables.
- **Add players**: Press "＋プレイヤー" → In the dialog, select the count. For a single player, a name/group input dialog appears. Use "追加して続ける" (Add & Continue) for consecutive entries.
- **Excel bulk import**: Click the clipboard icon. Paste columns directly from Excel (Column A: name, Column B: group, Column C: bracket).

### Matching

1. Press the "マッチング" button — A tentative seating arrangement appears on the tables (yellow border)
2. Review and press "全確定" (Confirm All) — The round begins
3. If you're not satisfied, press the regenerate button (loop icon) to try again
4. You can also cancel the assignment for specific tables only

### During a Round

- Players currently in a match are shown with a green border on the table card
- If score tracking is enabled, input fields appear inside the table card
- End a round using the "対戦終了" (End Match) button on the table card, or the "全終了" (End All) button at the bottom of the screen

### Next Round

After ending a round, press "マッチング" again to generate a new set of pairings that takes past matchups into account.

---

## Sharing with Participants

1. Click the settings button in the top-right corner
2. Click "イベントを共有する" (Share Event) in the "イベント共有" section
3. A **join code** (4-character alphanumeric) will be generated
4. Ways to share with participants:
   - Tell them verbally: "Enter code XXXX"
   - Press the QR code button and show your screen
   - Send the URL via a LINE group or other messaging app

Once shared, any actions you take on the admin screen are automatically reflected on participants' phones.

---

## Groups and Brackets

### Groups
Players in the same group are **less likely to be placed at the same table**.
- Use cases: team separation, keeping friends at different tables, distributing by skill level
- Presets A through E are available, plus custom group names

### Brackets
Only players in the **same bracket** are matched together.
- Use cases: preliminary leagues, skill-level leagues
- Enable by turning on "ブラケット機能" (Bracket Feature) in Settings

> Groups = "keep them apart", Brackets = "only within this pool"

---

## Score Tracking

1. Turn on "点数を記録する" (Track Scores) in Settings
2. A +/- input field appears on each active table card
3. Scores are automatically added to the cumulative total when a round ends
4. View the overall standings using the leaderboard button in the header
5. Export results via copy or CSV download

---

## Settings Reference

| Setting | Description |
|---------|-------------|
| イベント名 (Event Name) | Name displayed in the header and participant view |
| テーマ (Theme) | Toggle between dark and light mode |
| ラウンド数を表示 (Show Round Number) | Display the current round number in the status bar |
| ブラケット機能 (Bracket Feature) | Match only within the same bracket |
| 少人数卓の連続を避ける (Avoid Consecutive Short Tables) | Prevent players who were at a short table last round from being placed at a short table again |
| 点数を記録する (Track Scores) | Enable VP input fields and the leaderboard |
| 点数をマッチングに反映 (Use Scores in Matching) | Place players with similar cumulative scores at the same table |
| 最低人数 (Minimum Players) | Minimum players to seat at a table even if below the table size (0 = same as table size) |

---

## Table Operations

- **Drag**: On PC, drag table cards to rearrange them freely (snaps to grid)
- **Settings button** (gear icon): Change player count, rename the table, manually edit members, delete the table
- **Disband**: Cancel the match and return players to the waiting list (also removes the match from history)
- **Fixtures**: Go to Settings > "配置物" (Fixtures) to place objects like walls and monitors

---

## Shortcuts

| Action | Effect |
|--------|--------|
| Ctrl+Z | Undo |
| Shift+Click | Select a range of players |
| Tap a player's name | Open the edit dialog |

---

## Starting a New Event

Go to Settings > "新しいイベントを始める" (Start a New Event) to reset players and match history while keeping the table layout. This is convenient when hosting at the same venue every week.

---

## About Data Storage

- Data is stored in the browser's **localStorage**
- Your data persists as long as you use the same browser and the same URL
- **Data is not visible in a different browser or in incognito mode**
- It is recommended to back up important data using the "CSV Download" option in the leaderboard
