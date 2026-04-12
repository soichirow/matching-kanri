-- ============================================================
-- 対戦終了報告 RPC (2026-04-12)
-- 参加者がview.htmlから「対戦終了」を報告
-- マッチのfinishedReports配列にプレイヤーIDを追加
-- ============================================================

CREATE OR REPLACE FUNCTION report_finished(
  p_tournament_id text,
  p_match_id text,
  p_player_id text
)
RETURNS jsonb AS $$
DECLARE
  t_data jsonb;
  matches jsonb;
  match_idx int;
  match_obj jsonb;
  player_ids jsonb;
  reports jsonb;
  total int;
  reported int;
BEGIN
  SELECT data INTO t_data FROM tournaments WHERE id = p_tournament_id;
  IF t_data IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;

  matches := t_data->'matches';
  IF matches IS NULL THEN RAISE EXCEPTION 'No matches'; END IF;

  FOR match_idx IN 0..jsonb_array_length(matches) - 1 LOOP
    match_obj := matches->match_idx;
    IF match_obj->>'id' = p_match_id THEN
      player_ids := match_obj->'playerIds';
      IF NOT player_ids @> to_jsonb(p_player_id) THEN
        RAISE EXCEPTION 'Player not in this match';
      END IF;

      -- finishedReports配列を取得または初期化
      reports := COALESCE(match_obj->'finishedReports', '[]'::jsonb);
      -- まだ報告していなければ追加
      IF NOT reports @> to_jsonb(p_player_id) THEN
        reports := reports || to_jsonb(p_player_id);
      END IF;

      match_obj := jsonb_set(match_obj, '{finishedReports}', reports);
      matches := jsonb_set(matches, ARRAY[match_idx::text], match_obj);
      t_data := jsonb_set(t_data, '{matches}', matches);

      UPDATE tournaments SET data = t_data, updated_at = now()
      WHERE id = p_tournament_id;

      total := jsonb_array_length(player_ids);
      reported := jsonb_array_length(reports);
      RETURN jsonb_build_object('reported', reported, 'total', total);
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Match not found';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
