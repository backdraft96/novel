/*
 * 스마트폰 두 손가락 확대/축소(핀치) → 화면 대신 "글자 크기"를 키우고 줄입니다.
 * 화면 전체가 확대되지 않으므로 하단 메뉴·좌우 넘김 버튼이 항상 제자리에 보이고,
 * 글이 화면 폭에 맞게 다시 줄바꿈되어 좌우로 밀어 볼 필요가 없습니다.
 * 바뀐 글자 크기는 저장되어 다른 장으로 넘어가도 유지됩니다.
 */
(function () {
  var MIN = 13, MAX = 32;
  var st = document.createElement('style');
  // 브라우저 기본 화면 확대(핀치 줌)를 끄고 세로·가로 스크롤만 허용
  st.textContent = 'html,body{touch-action:pan-x pan-y;}' +
    // 글자가 크면 양쪽 정렬 때문에 단어 사이가 크게 벌어지므로 왼쪽 정렬로 전환
    'html.dam-big-text .novel-text p{text-align:left !important;}';
  document.head.appendChild(st);

  function syncAlign() {
    document.documentElement.classList.toggle('dam-big-text', current() >= 21);
  }
  syncAlign();
  new MutationObserver(syncAlign).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  function current() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-size'));
    return isFinite(v) ? v : 17;
  }
  function apply(px) {
    if (typeof window.damSetFontSize === 'function') window.damSetFontSize(px);
    else {
      document.documentElement.style.setProperty('--font-size', px + 'px');
      try { localStorage.setItem('dam_font_size', String(px)); } catch (e) {}
    }
  }
  function dist(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function inUi(el) {
    return el && el.closest && el.closest('#vv-layer, #dock-bottom-wrapper, .page-turn, #sidebar-toc, #settings-dropdown, .ab-panel, header');
  }

  var pinch = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 2) { pinch = null; return; }
    if (inUi(e.target)) { pinch = null; return; }
    var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    // 손가락 사이에 있는 문단을 기준으로 읽던 위치를 유지
    var anchor = document.elementFromPoint(mx, my);
    while (anchor && anchor !== document.body && !/^(P|H2|DIV)$/.test(anchor.tagName)) anchor = anchor.parentElement;
    var rect = anchor && anchor.getBoundingClientRect();
    pinch = {
      d0: dist(e.touches),
      size0: current(),
      last: current(),
      anchor: anchor,
      ratioInAnchor: rect && rect.height ? (my - rect.top) / rect.height : 0,
      y: my
    };
  }, { passive: false });

  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    var size = Math.round(Math.min(MAX, Math.max(MIN, pinch.size0 * dist(e.touches) / pinch.d0)));
    if (size === pinch.last) return;
    pinch.last = size;
    apply(size);
    if (pinch.anchor && pinch.anchor.isConnected) {
      var r = pinch.anchor.getBoundingClientRect();
      var target = r.top + r.height * pinch.ratioInAnchor;
      window.scrollBy(0, target - pinch.y);
    }
  }, { passive: false });

  document.addEventListener('touchend', function (e) {
    if (pinch && e.touches.length < 2) pinch = null;
  });

  // 아이폰 사파리 전용: 기본 확대 제스처 차단
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
})();
