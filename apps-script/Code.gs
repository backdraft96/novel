/**
 * 소설 「댐」 홈페이지 — 방문자 수 + 방명록 백엔드 (Google Apps Script)
 *
 * 사용법
 *  1) 구글 시트의 [확장 프로그램] → [Apps Script]에서 열거나, script.google.com 에서 새 프로젝트를 만듭니다.
 *     (단독 프로젝트이면 setup 실행 시 '댐 홈페이지 데이터' 시트가 드라이브에 자동 생성됩니다)
 *  2) 기본 코드(Code.gs)를 모두 지우고 이 파일 내용을 붙여 넣은 뒤 저장합니다.
 *  3) 위쪽 함수 선택 상자에서 setup 을 고르고 [실행] → 권한 허용.
 *     (시트에 '방문자', '방명록' 탭이 자동으로 만들어집니다)
 *  4) [배포] → [새 배포] → 유형: 웹 앱
 *       - 다음 사용자 인증 정보로 실행: 나
 *       - 액세스 권한이 있는 사용자: 모든 사용자
 *     → [배포] 후 나오는 "웹 앱 URL"(…/exec)을 복사합니다.
 *  5) 저장소의 site-config.js 파일 API_URL 에 그 URL을 붙여 넣습니다.
 *
 * 방명록 관리
 *  - '방명록' 탭에서 행을 삭제하면 글이 지워집니다.
 *  - D열(숨김)에 Y 를 입력하면 홈페이지에서 보이지 않습니다.
 *
 * 코드를 수정한 경우: [배포] → [배포 관리] → 연필 아이콘 → 버전 "새 버전" → 배포
 * (URL은 그대로 유지됩니다)
 */

var TZ = 'Asia/Seoul';
var VISIT_SHEET = '방문자';
var BOOK_SHEET = '방명록';
var NAME_MAX = 20;
var MSG_MAX = 500;
var POSTS_PER_10MIN = 20; // 도배 방지: 10분 동안 전체 최대 글 수

function ss_() {
  // 시트에 붙어 있는 스크립트면 그 시트를, 단독 스크립트면 전용 시트를 만들어 사용
  var active = null;
  try { active = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (active) return active;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var created = SpreadsheetApp.create('댐 홈페이지 데이터 (방문자·방명록)');
  props.setProperty('SHEET_ID', created.getId());
  return created;
}

function setup() {
  var ss = ss_();
  var v = ss.getSheetByName(VISIT_SHEET) || ss.insertSheet(VISIT_SHEET);
  if (v.getLastRow() === 0) {
    v.appendRow(['날짜', '방문수']);
    v.setFrozenRows(1);
    v.getRange('A:A').setNumberFormat('@');
  }
  var b = ss.getSheetByName(BOOK_SHEET) || ss.insertSheet(BOOK_SHEET);
  if (b.getLastRow() === 0) {
    b.appendRow(['작성시각', '이름', '내용', '숨김(Y)']);
    b.setFrozenRows(1);
    b.setColumnWidth(3, 480);
  }
  var def = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 2 && def.getLastRow() === 0) ss.deleteSheet(def);
  Logger.log('데이터 시트 주소: ' + ss.getUrl());
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function visitSheet_() {
  var s = ss_().getSheetByName(VISIT_SHEET);
  if (!s) { setup(); s = ss_().getSheetByName(VISIT_SHEET); }
  return s;
}

function bookSheet_() {
  var s = ss_().getSheetByName(BOOK_SHEET);
  if (!s) { setup(); s = ss_().getSheetByName(BOOK_SHEET); }
  return s;
}

function stats_(increment) {
  var s = visitSheet_();
  var t = today_();
  var last = s.getLastRow();
  var rows = last > 1 ? s.getRange(2, 1, last - 1, 2).getValues() : [];
  var total = 0, todayCount = 0, todayRow = -1;
  for (var i = 0; i < rows.length; i++) {
    var n = Number(rows[i][1]) || 0;
    total += n;
    if (String(rows[i][0]) === t) { todayCount = n; todayRow = i + 2; }
  }
  if (increment) {
    todayCount += 1;
    total += 1;
    if (todayRow > 0) s.getRange(todayRow, 2).setValue(todayCount);
    else s.appendRow([t, todayCount]);
  }
  return { today: todayCount, total: total, date: t };
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'stats';
  try {
    if (action === 'hit') {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try { return json_({ ok: true, stats: stats_(true) }); }
      finally { lock.releaseLock(); }
    }
    if (action === 'stats') {
      return json_({ ok: true, stats: stats_(false) });
    }
    if (action === 'list') {
      var offset = Math.max(0, parseInt(p.offset, 10) || 0);
      var limit = Math.min(50, Math.max(1, parseInt(p.limit, 10) || 10));
      var s = bookSheet_();
      var last = s.getLastRow();
      var rows = last > 1 ? s.getRange(2, 1, last - 1, 4).getValues() : [];
      var visible = [];
      for (var i = rows.length - 1; i >= 0; i--) {
        if (String(rows[i][3]).trim().toUpperCase() === 'Y') continue;
        if (!rows[i][2]) continue;
        var d = rows[i][0] instanceof Date ? rows[i][0] : new Date(rows[i][0]);
        visible.push({
          name: String(rows[i][1]),
          message: String(rows[i][2]),
          time: isNaN(d) ? '' : Utilities.formatDate(d, TZ, 'yyyy.MM.dd HH:mm')
        });
      }
      return json_({ ok: true, total: visible.length, items: visible.slice(offset, offset + limit) });
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var data = {};
    try { data = JSON.parse(e.postData.contents || '{}'); } catch (x) { data = e.parameter || {}; }

    // 스팸봇 함정 필드(사람에게는 보이지 않음)가 채워져 있으면 무시
    if (data.website) return json_({ ok: true });

    var name = String(data.name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    var msg = String(data.message || '').replace(/\r\n/g, '\n').trim().slice(0, MSG_MAX);
    if (!name) return json_({ ok: false, error: '이름을 입력해 주세요.' });
    if (msg.length < 2) return json_({ ok: false, error: '내용을 두 글자 이상 입력해 주세요.' });

    // 시트 수식 주입 방지
    if (/^[=+\-@]/.test(name)) name = "'" + name;
    if (/^[=+\-@]/.test(msg)) msg = "'" + msg;

    var cache = CacheService.getScriptCache();
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var cnt = Number(cache.get('post_count') || 0);
      if (cnt >= POSTS_PER_10MIN) {
        return json_({ ok: false, error: '잠시 후 다시 시도해 주세요.' });
      }
      cache.put('post_count', String(cnt + 1), 600);
      bookSheet_().appendRow([new Date(), name, msg, '']);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
