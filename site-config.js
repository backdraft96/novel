/*
 * 소설 「댐」 홈페이지 공통 설정
 * ------------------------------------------------------------
 * 방문자 수·방명록 데이터는 구글 시트(Apps Script 웹 앱)에 저장됩니다.
 * Apps Script를 배포한 뒤 받은 "웹 앱 URL"을 아래 따옴표 안에 붙여 넣으세요.
 * 예) 'https://script.google.com/macros/s/AKfy..../exec'
 */
window.DAM_SITE = {
  API_URL: ''
};

/* 방문자 집계: 한 브라우저당 하루 1회만 집계 (어느 페이지로 들어와도 동일) */
(function () {
  var api = window.DAM_SITE.API_URL;
  if (!api) return;
  var DAY_KEY = 'dam_visit_day';

  function todayKST() {
    var d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var today = todayKST();
  var isNewToday = safeGet(DAY_KEY) !== today;

  // index.html은 숫자를 직접 표시하므로 자체적으로 호출함 (중복 집계 방지)
  if (window.DAM_SKIP_AUTO_PING) {
    window.DAM_SITE.isNewToday = isNewToday;
    window.DAM_SITE.markVisited = function () { safeSet(DAY_KEY, today); };
    return;
  }

  if (!isNewToday) return;
  fetch(api + '?action=hit', { method: 'GET', mode: 'cors' })
    .then(function () { safeSet(DAY_KEY, today); })
    .catch(function () {});
})();
