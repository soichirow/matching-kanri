-- ============================================================
-- DB改善マイグレーション (2026-04-12)
-- Supabase Dashboard → SQL Editor で実行してください
-- ============================================================

-- 1. 不要な "anyone can update" RLSポリシーを削除
--    書き込みはSECURITY DEFINER RPCのみなので不要。
--    GRANTレベルで既にブロックされているが、多層防御として削除。
DROP POLICY IF EXISTS "anyone can update" ON tournaments;

-- 2. delete_tournament に認証チェック追加
--    admin_key不一致時にエラーを返すように（update_tournamentと同等に）
CREATE OR REPLACE FUNCTION delete_tournament(p_id text, p_admin_key text)
RETURNS void AS $$
BEGIN
  DELETE FROM tournaments WHERE id = p_id AND admin_key = p_admin_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized or not found'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. updated_at 自動更新トリガー
--    直接UPDATE（万一GRANTが変更された場合）でもupdated_atが更新されるように
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_updated_at ON tournaments;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. short_code生成をA-Z0-9に拡張
--    旧: 16進数(0-9,A-F) = 16^4 = 65,536通り
--    新: A-Z0-9 = 36^4 = 1,679,616通り（約26倍）
CREATE OR REPLACE FUNCTION create_tournament(p_data jsonb, p_admin_key text)
RETURNS jsonb AS $$
DECLARE new_id text; new_code text; attempts int := 0;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..4 LOOP
      new_code := new_code || substr(chars, floor(random() * 36 + 1)::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO tournaments (data, admin_key, short_code)
      VALUES (p_data, p_admin_key, new_code) RETURNING id INTO new_id;
      RETURN jsonb_build_object('id', new_id, 'short_code', new_code);
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        new_code := '';
        FOR i IN 1..6 LOOP
          new_code := new_code || substr(chars, floor(random() * 36 + 1)::int, 1);
        END LOOP;
        INSERT INTO tournaments (data, admin_key, short_code)
        VALUES (p_data, p_admin_key, new_code) RETURNING id INTO new_id;
        RETURN jsonb_build_object('id', new_id, 'short_code', new_code);
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
