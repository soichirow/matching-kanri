/**
 * マッチング管理 — イベントデータバックアップ
 *
 * Supabase上の全イベントデータを3枚の構造化シートにバックアップ。
 *   - 「イベント」シート: 1行=1イベント
 *   - 「プレイヤー」シート: 1行=1プレイヤー
 *   - 「対戦履歴」シート: 1行=1対戦
 * 毎日AM3:30(JST)に自動実行（pg_cronの削除がAM4:00なのでその前）。
 * 毎回全データを上書きするため、シートが増え続けることはない。
 */

const SUPABASE_URL = 'https://ufmjvdytyldpqlhgxzfm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BR3vLJ4Vlfm1QmGqa-kY6Q_Q7jkXcS1';

/**
 * Supabaseから全イベントデータを取得
 */
function fetchAllTournaments() {
  const url = SUPABASE_URL + '/rest/v1/tournaments?select=id,data,created_at,updated_at&order=created_at.desc';
  const res = UrlFetchApp.fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    Logger.log('Fetch error: ' + res.getContentText());
    return [];
  }

  return JSON.parse(res.getContentText());
}

/**
 * シートを取得または作成し、ヘッダー行を設定してデータ領域をクリアする
 */
function prepareSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  sheet.clear();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8eaf6');
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * メイン: 全イベントデータを構造化シートにバックアップ
 */
function backupTournaments() {
  const tournaments = fetchAllTournaments();
  if (!tournaments.length) {
    Logger.log('バックアップ対象のイベントがありません');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();

  // ── 3枚のシートを準備 ──
  const eventSheet = prepareSheet(ss, 'イベント', [
    'イベントID', '作成日時', '最終更新', 'プレイヤー数', 'テーブル数', '対戦数', 'イベント名', 'バックアップ日時', '生データ(JSON)',
  ]);
  const playerSheet = prepareSheet(ss, 'プレイヤー', [
    'イベントID', '名前', 'グループ', 'ブラケット', 'ステータス', '累計VP',
  ]);
  const matchSheet = prepareSheet(ss, '対戦履歴', [
    'イベントID', 'テーブル', 'プレイヤー', 'スコア', '日時',
  ]);

  // ── データ収集 ──
  const eventRows = [];
  const playerRows = [];
  const matchRows = [];

  tournaments.forEach(function(t) {
    const data = t.data || {};
    const players = data.players || [];
    const tables = data.tables || [];
    const matches = data.matches || [];
    const settings = data.settings || {};
    const eid = t.id.substring(0, 8);

    // VP累計を計算
    const vpMap = {};
    matches.forEach(function(m) {
      if (!m.scores) return;
      Object.entries(m.scores).forEach(function(e) {
        vpMap[e[0]] = (vpMap[e[0]] || 0) + (e[1] || 0);
      });
    });

    // イベント行
    eventRows.push([
      eid,
      t.created_at,
      t.updated_at,
      players.length,
      tables.length,
      matches.length,
      settings.eventName || '',
      now,
      JSON.stringify(data),
    ]);

    // プレイヤー行
    players.forEach(function(p) {
      playerRows.push([
        eid,
        p.name || '',
        p.group || '',
        p.bracket || '',
        p.status || '',
        vpMap[p.id] != null ? vpMap[p.id] : '',
      ]);
    });

    // 対戦履歴行
    matches.forEach(function(m) {
      var tbl = tables.find(function(x) { return x.id === m.tableId; });
      var playerNames = (m.playerIds || []).map(function(pid) {
        var p = players.find(function(x) { return x.id === pid; });
        return p ? p.name : '?';
      }).join(', ');
      var scores = m.scores
        ? Object.entries(m.scores).map(function(e) {
            var p = players.find(function(x) { return x.id === e[0]; });
            return (p ? p.name : '?') + ':' + e[1] + 'pt';
          }).join(', ')
        : '';
      matchRows.push([
        eid,
        tbl ? tbl.label : '?',
        playerNames,
        scores,
        m.timestamp ? new Date(m.timestamp).toLocaleString('ja-JP') : '',
      ]);
    });
  });

  // ── 一括書き込み（setValuesで高速化） ──
  if (eventRows.length) {
    eventSheet.getRange(2, 1, eventRows.length, eventRows[0].length).setValues(eventRows);
  }
  if (playerRows.length) {
    playerSheet.getRange(2, 1, playerRows.length, playerRows[0].length).setValues(playerRows);
  }
  if (matchRows.length) {
    matchSheet.getRange(2, 1, matchRows.length, matchRows[0].length).setValues(matchRows);
  }

  // ── ログシート ──
  let logSheet = ss.getSheetByName('バックアップログ');
  if (!logSheet) {
    logSheet = ss.insertSheet('バックアップログ');
    logSheet.appendRow(['バックアップ日時', 'イベント数', 'プレイヤー数', '対戦数', 'ステータス']);
    logSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  logSheet.appendRow([now, eventRows.length, playerRows.length, matchRows.length, '成功']);

  Logger.log(eventRows.length + '件のイベント / ' + playerRows.length + '人 / ' + matchRows.length + '対戦をバックアップしました');
}


/**
 * 初回セットアップ: 毎日AM3:30(JST)にバックアップ実行するトリガーを設定
 */
function setupDailyTrigger() {
  // 既存トリガーを削除
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'backupTournaments') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 毎日AM3:30に実行（pg_cronの削除がAM4:00なのでその前）
  ScriptApp.newTrigger('backupTournaments')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .nearMinute(30)
    .create();

  Logger.log('毎日AM3:30のバックアップトリガーを設定しました');
}
