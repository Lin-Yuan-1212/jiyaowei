/* ============================================================
   js/reveal.js —— 滚动渐显
   要做的事：元素进入视口才淡入，同一批里按顺序错开几十毫秒。
   可调参数集中在文件开头三个常量，改完刷新就能看到差别。
   ============================================================ */
(function(){
  'use strict';

  /* ---- 三个可调参数 ---- */
  var STAGGER    = 70;    /* 同级元素间隔毫秒；0 = 同时出现，150 = 明显排队 */
  var MAX_DELAY  = 420;   /* 延迟上限，防止一屏 20 个元素排到 1.4 秒才出完 */
  var THRESHOLD  = 0.12;  /* 露出多少比例算"进入视口"，0.1~0.25 最自然 */

  /* 系统开了"减少动态效果"就整段不启用：与 effects.css 末尾的媒体查询是一对 */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* 打开总开关：CSS 里所有渐显规则都以 .js-ready 为前提，JS 挂了也不会有东西被藏起来 */
  document.documentElement.classList.add('js-ready');

  var nodes    = document.querySelectorAll('[data-rv]');
  var counters = {};   /* 记录每个父节点已排到第几个孩子 */
  var pending  = [];   /* 还没播过的元素，兜底扫描只遍历这个短列表 */
  var seqId    = 0;
  var io       = null;

  /* 第一步：给每个元素算好"排队延迟"，写进 CSS 变量 --rd */
  Array.prototype.forEach.call(nodes, function(el){
    var parent = el.parentNode || document.body;
    var key = parent.__g || (parent.__g = ++seqId);        /* 给父节点挂个内部编号，同一父节点的孩子共用 */
    var n = (counters[key] = (counters[key] || 0) + 1) - 1;
    el.style.setProperty('--rd', Math.min(n * STAGGER, MAX_DELAY) + 'ms');
    pending.push(el);
  });

  function show(el){
    el.classList.add('is-in');
    var i = pending.indexOf(el);
    if (i > -1) pending.splice(i, 1);
    if (io) io.unobserve(el);   /* 只播一次：来回滚动不再闪，这是"廉价感"和"质感"的分水岭 */
  }

  /* 第二步：观察进屏 */
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) show(en.target); });
    }, { threshold: THRESHOLD, rootMargin: '0px 0px -6% 0px' }); /* 底部再收 6%，元素完全露头才动，不会刚出现就闪 */
    Array.prototype.forEach.call(nodes, function(el){ io.observe(el); });
  } else {
    /* 老浏览器兜底：直接全显示 */
    Array.prototype.forEach.call(nodes, function(el){ el.classList.add('is-in'); });
    return;
  }

  /* ---- 兜底扫描 ----
     IntersectionObserver 按帧采样。用 js 瞬间 scrollTo（点锚点、回到顶部）时，
     中间一大段元素一帧都没进过视口 → 回调不触发 → 永远透明。
     所以每次滚动后，把"已完全滚过头顶"的元素补成可见。 */
  function sweep(){
    for (var i = pending.length - 1; i >= 0; i--) {        /* 倒着遍历：循环里会删元素 */
      var el = pending[i];
      if (!el.offsetParent) continue;                       /* 在隐藏容器里时矩形全是 0，不能误判 */
      if (el.getBoundingClientRect().bottom <= 0) show(el); /* 已在视口上方 = 用户已经滚过，直接可见 */
    }
  }

  var tick = false;
  window.addEventListener('scroll', function(){
    if (tick) return;                                     /* rAF 节流：一帧最多算一次 */
    tick = true;
    requestAnimationFrame(function(){ sweep(); tick = false; });
  }, { passive: true });                                  /* passive：声明不阻止默认滚动，浏览器可提前推进 */

  window.__rvSweep = sweep;   /* 暴露出去：nav.js 做瞬移锚点滚动后会调用一次 */
})();
