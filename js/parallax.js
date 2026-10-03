/* ============================================================
   js/parallax.js —— 吸顶视差带
   配合 layout.css 第 6 节看：外层 .band 高 200vh，内层 .band__stage 用 sticky 钉住。
   本脚本只算一个数：这个带子滚过了百分之几（0 → 1），写进 CSS 变量 --p。
   所有位移、透明度都交给 CSS 去换算 —— JS 不算样式，改效果只需改 CSS。
   ============================================================ */
(function(){
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var bands = document.querySelectorAll('.band');
  if (!bands.length) return;

  function update(){
    Array.prototype.forEach.call(bands, function(band){
      var r = band.getBoundingClientRect();
      /* 进度定义：带子顶端进入视口顶 = 0，带子底端到达视口底 = 1
         分子 = 已滚过的距离，分母 = 可滚过的总距离（带子高 - 视口高） */
      var total = r.height - window.innerHeight;
      var p = total > 0 ? (-r.top) / total : 0;
      p = Math.max(0, Math.min(1, p));                    /* 夹到 0~1，超出区间时不要出现负位移 */
      band.style.setProperty('--p', p.toFixed(4));
    });
  }

  var ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){ update(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);            /* 视口变了，总高度也要重算 */
  update();
})();
