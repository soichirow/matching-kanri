# Developer Setup Guide

Instructions for forking or copying this app and running it yourself.

---

## Prerequisites

- Node.js 18+
- A GitHub account
- A Supabase account (free tier)
- A Google account (if using the backup feature)

---

## 1. Repository Setup

```bash
git clone https://github.com/soichirow/matching-kanri.git
cd matching-kanri
npm install
```

## 2. Enable GitHub Pages

1. Go to your GitHub repository's Settings > Pages
2. Source: `Deploy from a branch`
3. Branch: `master` / `/ (root)`
4. Save

After a few minutes, the app will be live at `https://<username>.github.io/matching-kanri/`.

## 3. Create a Supabase Project

### 3.1 Create the Project

1. Create a project at https://supabase.com
2. Region: `Northeast Asia (Tokyo)` recommended
3. After creation, go to Settings > API and note the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (e.g., `eyJhbGci...` or `sb_publishable_...`)

### 3.2 Create Tables and Functions

Run the following in the SQL Editor:

```sql
-- Create table
create table tournaments (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null default '{}',
  admin_key text not null default gen_random_uuid()::text,
  short_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table tournaments enable row level security;
create policy "anyone can read" on tournaments for select using (true);
create policy "anyone can insert" on tournaments for insert with check (true);
-- No UPDATE/DELETE policy (changes only via SECURITY DEFINER RPCs)

-- Column-level security (hide admin_key from public)
revoke all on tournaments from anon, authenticated;
grant select (id, data, short_code, created_at, updated_at) on tournaments to anon;
grant insert (data, admin_key) on tournaments to anon;

-- RPC function: create event (short_code uses A-Z0-9, 36^4 = 1.68M combinations)
create or replace function create_tournament(p_data jsonb, p_admin_key text)
returns jsonb as $$
declare new_id text; new_code text; attempts int := 0;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
begin
  loop
    new_code := '';
    for i in 1..4 loop
      new_code := new_code || substr(chars, floor(random() * 36 + 1)::int, 1);
    end loop;
    begin
      insert into tournaments (data, admin_key, short_code)
      values (p_data, p_admin_key, new_code) returning id into new_id;
      return jsonb_build_object('id', new_id, 'short_code', new_code);
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 10 then
        new_code := '';
        for i in 1..6 loop
          new_code := new_code || substr(chars, floor(random() * 36 + 1)::int, 1);
        end loop;
        insert into tournaments (data, admin_key, short_code)
        values (p_data, p_admin_key, new_code) returning id into new_id;
        return jsonb_build_object('id', new_id, 'short_code', new_code);
      end if;
    end;
  end loop;
end;
$$ language plpgsql security definer;

-- RPC function: update event (authenticated with admin_key)
create or replace function update_tournament(p_id text, p_admin_key text, p_data jsonb)
returns void as $$
begin
  update tournaments set data = p_data, updated_at = now()
  where id = p_id and admin_key = p_admin_key;
  if not found then raise exception 'Unauthorized'; end if;
end;
$$ language plpgsql security definer;

-- RPC function: delete event (authenticated with admin_key)
create or replace function delete_tournament(p_id text, p_admin_key text)
returns void as $$
begin
  delete from tournaments where id = p_id and admin_key = p_admin_key;
  if not found then raise exception 'Unauthorized or not found'; end if;
end;
$$ language plpgsql security definer;

-- RPC function: look up event ID by join code
create or replace function find_tournament_by_code(p_code text)
returns text as $$
declare found_id text;
begin
  select id into found_id from tournaments where upper(short_code) = upper(p_code);
  return found_id;
end;
$$ language plpgsql security definer;

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_updated_at before update on tournaments
for each row execute function update_updated_at();

-- Auto-cleanup (delete after 14 days)
create extension if not exists pg_cron with schema pg_catalog;

create or replace function cleanup_old_tournaments()
returns integer as $$
declare deleted_count integer;
begin
  delete from tournaments where updated_at < now() - interval '14 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;

-- Runs daily at 4:00 AM JST = 19:00 UTC
select cron.schedule('cleanup-old-tournaments', '0 19 * * *', 'SELECT cleanup_old_tournaments()');
```

### 3.3 Enable Realtime

1. Go to Supabase Dashboard > Database > Replication
2. Under `supabase_realtime` Source, enable the `tournaments` table

### 3.4 Update Configuration in Code

Replace the following values in `admin.html` and `view.html` with your own project's values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_KEY = 'your-anon-key'
```

## 4. Backup Setup (Optional)

You can set up daily backups using Google Apps Script.

### 4.1 Install clasp

```bash
npm install -g @google/clasp
clasp login
```

### 4.2 Create a GAS Project

```bash
cd gas-backup
clasp create --type sheets --title "Matching Manager Backup"
clasp push --force
```

### 4.3 Set Up a Trigger

1. Open the project at https://script.google.com
2. Select `setupDailyTrigger` in the function selector and run it
3. Authorize the required permissions

All event data will be backed up to a Google Spreadsheet daily at 3:30 AM JST.

## 5. Development and Testing

```bash
npx vite                # Start the dev server
npx vitest run          # Unit tests (106 tests)
npx playwright test     # E2E tests (30 tests)
npx eslint .            # Linter
```

---

## Security Model

| Data | Protection |
|------|------------|
| `admin_key` | Column-level permissions prevent anon read access |
| Event update | RPC function verifies admin_key (SECURITY DEFINER) |
| Event delete | Same as above |
| Event read | RLS allows anyone to read (only `data` and `short_code`) |

The `admin_key` is generated in the browser when an event is created and stored only in the organizer's localStorage.
It is never included in source code or API responses.

---

## Notes

- Supabase free tier: 500 MB storage / 200 concurrent connections
- Auto-cleanup via pg_cron deletes events after 14 days (modify `interval '14 days'` in the SQL to change this)
- admin.html is a single file containing all functionality (no framework used)
- view.html uses ES Modules (`<script type="module">`) and loads the Supabase SDK from a CDN
