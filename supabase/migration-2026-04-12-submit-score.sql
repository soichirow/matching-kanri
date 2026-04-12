-- ============================================================
-- セルフスコア入力 RPC (2026-04-12)
-- 参加者が自分のスコアをview.htmlから送信可能にする
-- Supabase Dashboard → SQL Editor で実行
-- ============================================================

CREATE OR REPLACE FUNCTION submit_score(
  p_tournament_id text,
  p_match_id text,
  p_player_id text,
  p_score numeric
)
RETURNS void AS $$
DECLARE
  t_data jsonb;
  matches jsonb;
  match_idx int;
  match_obj jsonb;
  player_ids jsonb;
BEGIN
  -- イベントデータを取得
  SELECT data INTO t_data FROM tournaments WHERE id = p_tournament_id;
  IF t_data IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;

  -- マッチ配列を取得
  matches := t_data->'matches';
  IF matches IS NULL THEN RAISE EXCEPTION 'No matches'; END IF;

  -- 該当マッチを検索
  FOR match_idx IN 0..jsonb_array_length(matches) - 1 LOOP
    match_obj := matches->match_idx;
    IF match_obj->>'id' = p_match_id THEN
      -- プレイヤーがこのマッチに参加しているか検証
      player_ids := match_obj->'playerIds';
      IF NOT player_ids @> to_jsonb(p_player_id) THEN
        RAISE EXCEPTION 'Player not in this match';
      END IF;

      -- スコアを更新
      IF match_obj->'scores' IS NULL OR match_obj->'scores' = 'null'::jsonb THEN
        match_obj := jsonb_set(match_obj, '{scores}', jsonb_build_object(p_player_id, p_score));
      ELSE
        match_obj := jsonb_set(match_obj, ARRAY['scores', p_player_id], to_jsonb(p_score));
      END IF;

      -- マッチ配列を更新
      matches := jsonb_set(matches, ARRAY[match_idx::text], match_obj);

      -- イベントデータを更新
      t_data := jsonb_set(t_data, '{matches}', matches);
      UPDATE tournaments SET data = t_data, updated_at = now()
      WHERE id = p_tournament_id;
      RETURN;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Match not found';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
