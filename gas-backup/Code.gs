/**
 * マッチング管理 — イベントデータバックアップ
 *
 * Supabase上の全イベントデータをこのスプレッドシートにバックアップします。
 * 毎日AM3:30(JST)に自動実行（pg_cronの削除がAM4:00なので、その前に実行）。
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
 * メイン: 全イベントデータをシートにバックアップ
 */
function backupTournaments() {
  const tournaments = fetchAllTournaments();
  if (!tournaments.length) {
    Logger.log('バックアップ対象のイベントがありません');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('バックアップログ');
  if (!sheet) {
    sheet = ss.insertSheet('バックアップログ');
    sheet.appendRow(['バックアップ日時', 'イベント数', 'ステータス']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }

  let backedUp = 0;

  tournaments.forEach(function(t) {
    const data = t.data || {};
    const players = data.players || [];
    const tables = data.tables || [];
    const matches = data.matches || [];
    const sheetName = 'T_' + t.id.substring(0, 8);

    // イベントごとのシートを作成/更新
    let tSheet = ss.getSheetByName(sheetName);
    if (!tSheet) {
      tSheet = ss.insertSheet(sheetName);
    } else {
      tSheet.clear();
    }

    // ヘッダー情報
    tSheet.getRange('A1').setValue('イベントID');
    tSheet.getRange('B1').setValue(t.id);
    tSheet.getRange('A2').setValue('作成日時');
    tSheet.getRange('B2').setValue(t.created_at);
    tSheet.getRange('A3').setValue('最終更新');
    tSheet.getRange('B3').setValue(t.updated_at);
    tSheet.getRange('A4').setValue('バックアップ日時');
    tSheet.getRange('B4').setValue(new Date().toISOString());
    tSheet.getRange('A5').setValue('プレイヤー数');
    tSheet.getRange('B5').setValue(players.length);
    tSheet.getRange('A6').setValue('テーブル数');
    tSheet.getRange('B6').setValue(tables.length);
    tSheet.getRange('A7').setValue('対戦数');
    tSheet.getRange('B7').setValue(matches.length);

    tSheet.getRange('A1:A7').setFontWeight('bold');

    // プレイヤー一覧
    var row = 9;
    tSheet.getRange(row, 1).setValue('【プレイヤー一覧】');
    tSheet.getRange(row, 1).setFontWeight('bold');
    row++;
    tSheet.getRange(row, 1).setValue('名前');
    tSheet.getRange(row, 2).setValue('グループ');
    tSheet.getRange(row, 3).setValue('ブラケット');
    tSheet.getRange(row, 4).setValue('ステータス');
    tSheet.getRange(row, 1, 1, 4).setFontWeight('bold');
    row++;

    players.forEach(function(p) {
      tSheet.getRange(row, 1).setValue(p.name || '');
      tSheet.getRange(row, 2).setValue(p.group || '');
      tSheet.getRange(row, 3).setValue(p.bracket || '');
      tSheet.getRange(row, 4).setValue(p.status || '');
      row++;
    });

    // 対戦履歴
    row += 2;
    tSheet.getRange(row, 1).setValue('【対戦履歴】');
    tSheet.getRange(row, 1).setFontWeight('bold');
    row++;
    tSheet.getRange(row, 1).setValue('テーブル');
    tSheet.getRange(row, 2).setValue('プレイヤー');
    tSheet.getRange(row, 3).setValue('スコア');
    tSheet.getRange(row, 4).setValue('日時');
    tSheet.getRange(row, 1, 1, 4).setFontWeight('bold');
    row++;

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
      tSheet.getRange(row, 1).setValue(tbl ? tbl.label : '?');
      tSheet.getRange(row, 2).setValue(playerNames);
      tSheet.getRange(row, 3).setValue(scores);
      tSheet.getRange(row, 4).setValue(m.timestamp ? new Date(m.timestamp).toLocaleString('ja-JP') : '');
      row++;
    });

    // 生データ（JSON）
    row += 2;
    tSheet.getRange(row, 1).setValue('【生データ(JSON)】');
    tSheet.getRange(row, 1).setFontWeight('bold');
    row++;
    tSheet.getRange(row, 1).setValue(JSON.stringify(t.data));

    backedUp++;
  });

  // ログ記録
  sheet.appendRow([new Date().toISOString(), backedUp, '成功']);
  Logger.log(backedUp + '件のイベントをバックアップしました');
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
