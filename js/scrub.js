/* ============================================================
   js/scrub.js —— 滚动帧动画带的进度计算
   ------------------------------------------------------------
   职责边界（很重要）：本文件只算数，不写样式。
   每帧只输出两个 0~1 的无量纲数：
     --o  这一帧此刻的不透明度（交叉淡化用）
     --k  这一帧在自己时间窗里走到第几步（推近/位移用）
   整段进度 --p 也写在容器上，供进度条等装饰元素直接消费。
   想改视觉（放大多少、模糊多少、文案延迟多久），全部去 css/scrub.css 改。
   ============================================================ */
(function(){
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;   /* 减少动态效果：CSS 已把整段降级成静态卡片，这里连监听都不注册 */

  var sections = document.querySelectorAll('[data-scrub]');
  if (!sections.length) return;

  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
  /* smoothstep：两端慢中间快。数学上 s(t) + s(1-t) = 1，
     所以相邻两帧交叉淡化时亮度总和恒为 1 —— 不会在切换瞬间出现"整体发暗"的凹陷 */
  function smooth(t){ t = clamp01(t); return t * t * (3 - 2 * t); }

  Array.prototype.forEach.call(sections, function(sec){
    var items = sec.querySelectorAll('.scrub__item');
    var n = items.length;
    if (!n) return;

    sec.classList.add('js-scrub');                     /* 告诉 CSS：脚本活着，可以开始藏帧（否则第一帧会静态显示） */
    sec.style.setProperty('--n', n);                   /* 帧数交给 CSS 算总高度，加一帧不用改样式 */

    var stepEl = sec.querySelector('[data-step]');
    var last = -1;

    function update(){
      var r = sec.getBoundingClientRect();
      var total = r.height - window.innerHeight;       /* 可推进的总路程 = 带子高 - 视口高 */
      var p = total > 0 ? clamp01((-r.top) / total) : 1;
      sec.style.setProperty('--p', p.toFixed(4));

      var x = p * (n - 1);                             /* 把进度映射成"帧坐标"：0 → n-1 */
      var best = -1, bestO = -1;

      for (var i = 0; i < n; i++) {
        var d = x - i;                                 /* 与第 i 帧中心的距离：-1 ~ 1 是它的可见窗口 */
        var k = clamp01((d + 1) / 2);                  /* 归一化到 0~1：0 = 刚进场，1 = 即将退场 */
        var o = smooth(1 - Math.abs(2 * k - 1));       /* 三角形 + 缓动 = 交叉淡化曲线 */
        var el = items[i];
        el.style.setProperty('--o', o.toFixed(4));
        el.style.setProperty('--k', k.toFixed(4));
        if (o > bestO) { bestO = o; best = i; }
      }

      if (best !== last) {                             /* 只在翻页瞬间改类名和文字，避免每帧触发样式重算 */
        last = best;
        for (var j = 0; j < n; j++) items[j].classList.toggle('is-active', j === best);
        if (stepEl) stepEl.textContent = ('0' + (best + 1)).slice(-2) + ' / ' + ('0' + n).slice(-2);
      }
    }

    var ticking = false;
    function onScroll(){
      if (ticking) return;                             /* rAF 节流：一帧最多算一次 */
      ticking = true;
      requestAnimationFrame(function(){ update(); ticking = false; });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', update);           /* 图片解码完成后高度可能变化，补算一次 */
    update();
  });
})();
