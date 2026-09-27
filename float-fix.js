/*
 * 핀치 줌(두 손가락 확대)을 해도 하단 메뉴·좌우 넘김 버튼이
 * 화면의 같은 자리에 같은 크기로 보이도록 고정합니다.
 * (visualViewport API 사용 — 아이폰 사파리·크롬, 안드로이드 크롬 지원)
 */
(function () {
  var vv = window.visualViewport;
  if (!vv) return;

  var layer = document.createElement('div');
  layer.id = 'vv-layer';
  layer.setAttribute('aria-hidden', 'false');
  var st = document.createElement('style');
  st.textContent =
    '#vv-layer{position:fixed;top:0;left:0;z-index:45;pointer-events:none;transform-origin:0 0;will-change:transform}' +
    '#vv-layer>*{pointer-events:auto}';
  document.head.appendChild(st);

  function move() {
    var sel = ['#dock-bottom-wrapper', '.page-turn', '#toast-notify'];
    sel.forEach(function (s) {
      document.querySelectorAll(s).forEach(function (el) { layer.appendChild(el); });
    });
    document.body.appendChild(layer);
  }

  var raf = 0;
  function update() {
    raf = 0;
    var s = vv.scale || 1;
    layer.style.width = (vv.width * s) + 'px';
    layer.style.height = (vv.height * s) + 'px';
    if (Math.abs(s - 1) < 0.01 && Math.abs(vv.offsetLeft) < 1 && Math.abs(vv.offsetTop) < 1) {
      layer.style.transform = 'none';
    } else {
      layer.style.transform = 'translate(' + vv.offsetLeft + 'px,' + vv.offsetTop + 'px) scale(' + (1 / s) + ')';
    }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }

  function init() {
    move();
    update();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('orientationchange', function () { setTimeout(update, 300); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
