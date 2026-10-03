/* ============================================================
   js/counter.js —— 数字滚动
   配合 layout.css 的 .stat__num（记得保留 font-variant-numeric:tabular-nums，
   否则数字位数变化时整块宽度会左右抖）。
   用法：<span class="stat__num" data-to="98.6" data-dec="1" data-suffix="%">0</span>
   ============================================================ */
(function(){
  'use strict';

  var els = document.querySelectorAll('[data-to]');
  if (!els.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(v, dec){
    /* toFixed 会丢千分位；这里补上逗号，大数字才有气势 */
    var s = v.toFixed(dec);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function run(el){
    var to  = parseFloat(el.getAttribute('data-to')) || 0;   /* 目标值 */
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10); /* 小数位数 */
    var suf = el.getAttribute('data-suffix') || '';             /* 后缀，如 % 万 */
    var dur = parseInt(el.getAttribute('data-dur') || '1400', 10); /* 时长 ms */

    if (reduce) { el.textContent = fmt(to, dec) + suf; return; } /* 减少动效：直接给终值 */

    var t0 = null;
    function step(ts){
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);                     /* 线性进度 0~1 */
      var eased = 1 - Math.pow(1 - k, 3);                       /* easeOutCubic：先快后慢，像物体减速停下 */
      el.textContent = fmt(to * eased, dec) + suf;
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to, dec) + suf;                 /* 收尾对齐终值，避免浮点留下 97.9 这种 */
    }
    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, run);                     /* 不支持就直接出终值 */
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } /* 只跑一次 */
    });
  }, { threshold: 0.4 });                                       /* 数字要露出大半才开跑，跳得太早会看见"从 0 起步"的假动作 */

  Array.prototype.forEach.call(els, function(el){ io.observe(el); });
})();
