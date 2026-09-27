/*
 * 소설 「댐」 오디오북 플레이어
 * ------------------------------------------------------------
 * 각 장 제목 옆 🔊 버튼을 누르면 해당 장의 오디오북(구글 드라이브 '댐 오디오북' 폴더)을
 * 구글 드라이브 플레이어로 재생합니다.
 * 파일 번호(001~200)와 구글 드라이브 파일 ID의 대응표는 audiobook-map.js 에 있습니다.
 */
(function () {
  var MAP = window.DAM_AUDIO_MAP || {};

  function init() {
    var btn = document.querySelector('.ab-btn[data-ab]');
    if (!btn) return;
    var id = MAP[btn.getAttribute('data-ab')];
    if (!id) {
      btn.classList.add('ab-unavailable');
      btn.disabled = true;
      btn.title = '이 장의 오디오북은 준비 중입니다';
      return;
    }

    var h2 = btn.closest('h2');
    var title = h2.querySelector('span') ? h2.querySelector('span').textContent.trim() : '';
    var panel = document.createElement('div');
    panel.className = 'ab-panel font-sans';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="ab-head">' +
        '<span class="ab-title"></span>' +
        '<button type="button" class="ab-close" aria-label="오디오북 닫기">✕</button>' +
      '</div>' +
      '<div class="ab-frame-wrap"><div class="ab-cover"><span class="ab-spin"></span><span>플레이어 불러오는 중…</span></div></div>' +
      '<div class="ab-status" role="status" aria-live="polite">' +
        '<div class="ab-bar"><span></span></div>' +
        '<p class="ab-status-text"></p>' +
      '</div>' +
      '<p class="ab-msg">▶ 버튼을 누르면 재생됩니다. 재생하면서 아래로 내려 글을 함께 읽을 수 있습니다.</p>' +
      '<a class="ab-open" target="_blank" rel="noopener">📱 재생이 안 되면 여기를 눌러 구글 드라이브에서 듣기 ↗</a>';
    panel.querySelector('.ab-title').textContent = '🎧 ' + title;
    panel.querySelector('.ab-open').href = 'https://drive.google.com/file/d/' + id + '/view';
    h2.insertAdjacentElement('afterend', panel);

    var status = panel.querySelector('.ab-status');
    var statusText = panel.querySelector('.ab-status-text');
    var frame = null, timer = null, phase = '', t0 = 0, sawBlur = false;

    // 드라이브 플레이어는 다른 사이트(구글) 화면이라 내부 상태를 직접 알 수 없으므로
    // 불러오기 시작부터의 경과 시간과 사용자의 조작으로 준비 상태를 안내합니다.
    var LOAD_MSG = '⏳ 오디오 플레이어를 불러오는 중입니다… ';
    var PREP_MSG = '⏳ 오디오를 준비하는 중입니다. 잠시만 기다려 주세요… ';
    var READY_MSG = '✅ 준비되었습니다. ▶ 버튼을 눌러 재생하세요.';
    var PLAY_MSG = '🔊 재생을 시작하는 중입니다. 소리가 나기까지 몇 초 걸릴 수 있습니다… ';
    var PREP_SECONDS = 10;   // 휴대폰에서 드라이브 플레이어가 뜨는 데 걸리는 대략적인 시간
    var PLAY_SECONDS = 8;

    function setPhase(p) {
      phase = p; t0 = Date.now();
      status.hidden = false;
      status.className = 'ab-status ab-' + p;
      panel.classList.toggle('ab-busy', p === 'load');
      tick();
    }
    function tick() {
      var sec = Math.floor((Date.now() - t0) / 1000);
      if (phase === 'load') statusText.textContent = LOAD_MSG + '(' + sec + '초)';
      else if (phase === 'prep') {
        if (sec >= PREP_SECONDS) { setPhase('ready'); return; }
        statusText.textContent = PREP_MSG + '(' + (PREP_SECONDS - sec) + '초)';
      }
      else if (phase === 'ready') statusText.textContent = READY_MSG;
      else if (phase === 'play') {
        if (sec >= PLAY_SECONDS) { status.hidden = true; stopTimer(); return; }
        statusText.textContent = PLAY_MSG;
      }
    }
    function startTimer() { stopTimer(); timer = setInterval(tick, 500); }
    function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

    // 드라이브 서버에 미리 연결해 두어 첫 로딩 시간을 조금 줄입니다
    function preconnect() {
      ['https://drive.google.com', 'https://www.gstatic.com', 'https://drive.usercontent.google.com'].forEach(function (u) {
        if (document.querySelector('link[rel="preconnect"][href="' + u + '"]')) return;
        var l = document.createElement('link'); l.rel = 'preconnect'; l.href = u; l.crossOrigin = '';
        document.head.appendChild(l);
      });
    }

    function open() {
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'ab-frame';
        frame.src = 'https://drive.google.com/file/d/' + id + '/preview';
        frame.allow = 'autoplay; encrypted-media';
        frame.title = title + ' 오디오북';
        frame.addEventListener('load', function () { if (phase === 'load') setPhase('prep'); });
        panel.querySelector('.ab-frame-wrap').appendChild(frame);
        sawBlur = false;
        setPhase('load');
        startTimer();
      }
      panel.hidden = false;
      btn.classList.add('ab-on');
      btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('.ab-label').textContent = '오디오북 닫기';
    }
    function close() {
      // iframe을 제거해야 재생이 멈춥니다
      if (frame) { frame.remove(); frame = null; }
      stopTimer(); phase = '';
      panel.hidden = true;
      btn.classList.remove('ab-on');
      btn.setAttribute('aria-expanded', 'false');
      btn.querySelector('.ab-label').textContent = '오디오북';
    }

    // 플레이어(▶)를 누르면 포커스가 iframe으로 옮겨 가며 창의 blur 이벤트가 생깁니다
    window.addEventListener('blur', function () {
      setTimeout(function () {
        if (frame && document.activeElement === frame && !sawBlur) {
          sawBlur = true;
          setPhase('play');
          startTimer();
        }
      }, 0);
    });

    btn.addEventListener('pointerdown', preconnect, { once: true });
    btn.addEventListener('click', function () { panel.hidden ? open() : close(); });
    panel.querySelector('.ab-close').addEventListener('click', close);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
