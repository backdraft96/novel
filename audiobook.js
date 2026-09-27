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
      '<div class="ab-frame-wrap"><p class="ab-loading">플레이어를 불러오는 중…</p></div>' +
      '<p class="ab-msg">▶ 버튼을 누르면 재생됩니다. 재생하면서 아래로 내려 글을 함께 읽을 수 있습니다.</p>';
    panel.querySelector('.ab-title').textContent = '🎧 ' + title;
    h2.insertAdjacentElement('afterend', panel);

    var frame = null;
    function open() {
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'ab-frame';
        frame.src = 'https://drive.google.com/file/d/' + id + '/preview';
        frame.allow = 'autoplay; encrypted-media';
        frame.title = title + ' 오디오북';
        frame.addEventListener('load', function () {
          var l = panel.querySelector('.ab-loading');
          if (l) l.remove();
        });
        panel.querySelector('.ab-frame-wrap').appendChild(frame);
      }
      panel.hidden = false;
      btn.classList.add('ab-on');
      btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('.ab-label').textContent = '오디오북 닫기';
    }
    function close() {
      // iframe을 제거해야 재생이 멈춥니다
      if (frame) { frame.remove(); frame = null; }
      var wrap = panel.querySelector('.ab-frame-wrap');
      if (!wrap.querySelector('.ab-loading')) {
        var l = document.createElement('p');
        l.className = 'ab-loading';
        l.textContent = '플레이어를 불러오는 중…';
        wrap.appendChild(l);
      }
      panel.hidden = true;
      btn.classList.remove('ab-on');
      btn.setAttribute('aria-expanded', 'false');
      btn.querySelector('.ab-label').textContent = '오디오북';
    }

    btn.addEventListener('click', function () { panel.hidden ? open() : close(); });
    panel.querySelector('.ab-close').addEventListener('click', close);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
