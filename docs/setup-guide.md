# 開発者向けセットアップガイド

このアプリをフォーク/コピーして自分で運用する場合のセットアップ手順です。

---

## 前提条件

- Node.js 18+
- GitHubアカウント
- Supabaseアカウント（無料）
- Googleアカウント（バックアップ機能を使う場合）

---

## 1. リポジトリのセットアップ

```bash
git clone https://github.com/soichirow/matching-kanri.git
cd matching-kanri
npm install
```

## 2. GitHub Pages の有効化

1. GitHubリポジトリの Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `master` / `/ (root)`
4. Save

数分後に `https://<username>.github.io/matching-kanri/` で公開されます。

## 3. Supabase プロジェクトの作成

### 3.1 プロジェクト作成

1. https://supabase.com でプロジェクト作成
2. Region: `Northeast Asia (Tokyo)` 推奨
3. 作成後、Settings → API から以下をメモ:
   - **Project URL** (例: `https://xxxxx.supabase.co`)
   - **anon public key** (例: `eyJhbGci...` または `sb_publishable_...`)

### 3.2 テーブル・関数の作成

SQL Editor で以下を実行:

```sql
-- テーブル作成
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
-- UPDATE/DELETEポリシーなし（anonからの直接変更禁止。変更はRPC経由のみ）

-- カラムレベルセキュリティ（admin_keyを非公開に）
revoke all on tournaments from anon, authenticated;
grant select (id, data, short_code, created_at, updated_at) on tournaments to anon;
grant insert (data, admin_key) on tournaments to anon;

-- RPC関数: イベント作成
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

-- RPC関数: イベント更新（admin_key認証）
create or replace function update_tournament(p_id text, p_admin_key text, p_data jsonb)
returns void as $$
begin
  update tournaments set data = p_data, updated_at = now()
  where id = p_id and admin_key = p_admin_key;
  if not found then raise exception 'Unauthorized'; end if;
end;
$$ language plpgsql security definer;

-- RPC関数: イベント削除（admin_key認証）
create or replace function delete_tournament(p_id text, p_admin_key text)
returns void as $$
begin
  delete from tournaments where id = p_id and admin_key = p_admin_key;
  if not found then raise exception 'Unauthorized or not found'; end if;
end;
$$ language plpgsql security definer;

-- RPC関数: 参加コードからID検索
create or replace function find_tournament_by_code(p_code text)
returns text as $$
declare found_id text;
begin
  select id into found_id from tournaments where upper(short_code) = upper(p_code);
  return found_id;
end;
$$ language plpgsql security definer;

-- 自動クリーンアップ（14日後に削除）
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

-- updated_at 自動更新トリガー
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_updated_at before update on tournaments
for each row execute function update_updated_at();

-- 毎日AM4:00(JST) = UTC 19:00 に実行
select cron.schedule('cleanup-old-tournaments', '0 19 * * *', 'SELECT cleanup_old_tournaments()');
```

### 3.3 Realtime の有効化

1. Supabase Dashboard → Database → Replication
2. `supabase_realtime` の Source で `tournaments` を有効化

### 3.4 コード内の設定を変更

`admin.html` と `view.html` 内の以下の値を自分のプロジェクトの値に変更:

```javascript
const SUPABASE_URL = 'https://あなたのプロジェクト.supabase.co'
const SUPABASE_KEY = 'あなたのanon key'
```

## 4. バックアップ設定（任意）

Google Apps Script で日次バックアップを設定できます。

### 4.1 clasp のインストール

```bash
npm install -g @google/clasp
clasp login
```

### 4.2 GASプロジェクト作成

```bash
cd gas-backup
clasp create --type sheets --title "マッチング管理バックアップ"
clasp push --force
```

### 4.3 トリガー設定

1. https://script.google.com で作成したプロジェクトを開く
2. 関数セレクタで `setupDailyTrigger` を選択 → 実行
3. 権限を承認

毎日AM3:30(JST)に全イベントデータがスプレッドシートにバックアップされます。

## 5. 開発・テスト

```bash
npx vite                # 開発サーバー起動
npx vitest run          # 単体テスト (106件)
npx playwright test     # E2Eテスト (30件)
npx eslint .            # リンター
```

---

## セキュリティモデル

| データ | 保護方式 |
|--------|----------|
| `admin_key` | カラムレベル権限でanon読み取り不可 |
| イベント更新 | RPC関数でadmin_key照合（SECURITY DEFINER） |
| イベント削除 | 同上 |
| イベント閲覧 | RLS で誰でも読み取り可（data, short_code のみ） |

`admin_key` はイベント作成時にブラウザ側で生成され、主催者の localStorage にのみ保存されます。
ソースコードにもAPIレスポンスにも含まれません。

---

## 注意事項

- Supabase の無料枠: 500MB ストレージ / 200 同時接続
- pg_cron による自動削除は14日後（変更する場合はSQL内の `interval '14 days'` を修正）
- admin.html は単一ファイルで全機能を含みます（フレームワーク不使用）
- view.html は ES Module (`<script type="module">`) で Supabase SDK を CDN から読み込みます
