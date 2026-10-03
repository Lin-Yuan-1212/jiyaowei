/* ============================================================
   js/hover.js —— 指针微交互
   1) 卡片柔光跟随鼠标（CSS 只读两个变量，见 effects.css 第 4 节）
   2) 横向画廊支持按住拖动，比只给一根细滚动条好发现
   ============================================================ */
(function(){
  'use strict';

  /* ---- 1. 柔光跟随 ---- */
  var cards = document.querySelectorAll('.card,.plan');
  function move(e, el){
    var r = el.getBoundingClientRect();
    /* 换算成百分比而不是像素：窗口缩放、卡片变形都不需要重新算 */
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
  }
  Array.prototype.forEach.call(cards, function(el){
    el.addEventListener('mousemove', function(e){ move(e, el); }, { passive: true });
    el.addEventListener('mouseleave', function(){
      el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '0%'); /* 复位到默认值，避免下次 hover 时光斑"跳"过来 */
    });
  });

  /* ---- 2. 画廊拖动 ---- */
  var rails = document.querySelectorAll('.rail');
  Array.prototype.forEach.call(rails, function(rail){
    var down = false, startX = 0, startLeft = 0, moved = 0;
    rail.addEventListener('pointerdown', function(e){
      down = true; moved = 0;
      startX = e.clientX; startLeft = rail.scrollLeft;
      rail.setPointerCapture(e.pointerId);
      rail.style.cursor = 'grabbing';
      rail.style.scrollSnapType = 'none';   /* 拖动时先关掉吸附，否则手会被"抢"回去 */
    });
    rail.addEventListener('pointermove', function(e){
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startLeft - dx;
    });
    function up(){
      if (!down) return;
      down = false;
      rail.style.cursor = '';
      rail.style.scrollSnapType = 'x mandatory'; /* 松手再恢复吸附，卡片自动对齐到最近一张 */
    }
    rail.addEventListener('pointerup', up);
    rail.addEventListener('pointercancel', up);
    rail.addEventListener('pointerleave', up);
    /* 拖动结束后浏览器还会补发一次 click，会把链接误点开，这里拦掉 */
    rail.addEventListener('click', function(e){ if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  });
})();
