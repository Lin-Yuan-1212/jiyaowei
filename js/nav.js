/* ============================================================
   js/nav.js —— 吸顶导航状态 / 平滑锚点 / 当前分区高亮 / 明暗主题
   ============================================================ */
(function(){
  'use strict';

  var nav = document.querySelector('.nav');

  /* ---- 1. 滚过一点距离后导航变毛玻璃 ----
     注意：这里只加类，样式全在 effects.css 的 .nav.is-stuck 里。JS 不写样式值。 */
  function stuck(){ if (nav) nav.classList.toggle('is-stuck', (window.pageYOffset || document.documentElement.scrollTop) > 8); }
  window.addEventListener('scroll', function(){ requestAnimationFrame(stuck); }, { passive: true });
  stuck();

  /* ---- 2. 平滑锚点：自己写缓动，而不是 scroll-behavior:smooth ----
     好处：能精确控制时长、能处理"减少动态效果"、能在结束后补一次渐显扫描。 */
  var links = document.querySelectorAll('a[href^="#"]');
  Array.prototype.forEach.call(links, function(a){
    a.addEventListener('click', function(e){
      /* 带 data-menu 的栏目是下拉面板的触发器，滚动交给 js/menu.js + 面板里的链接，
         这里必须直接让开，否则两个脚本都会 preventDefault，点了打不开面板。 */
      if (a.hasAttribute('data-menu')) return;
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();

      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var navH = nav ? nav.offsetHeight : 0;
      /* 目标位置减去导航高度：否则锚点跳过去，标题正好被吸顶导航盖住 —— 最常见的锚点 bug。
         目标自己用 scroll-margin-top 声明的偏移也要算进来（产品目录页的分类标题下面还压着一条
         吸顶筛选条，那条的高度只有 CSS 知道），取两者里更大的，不叠加。 */
      var sm = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      var to = target.getBoundingClientRect().top + (window.pageYOffset || 0) - Math.max(navH + 10, sm);

      if (reduce) { window.scrollTo(0, to); }
      else {
        var from = window.pageYOffset || 0, dist = to - from, t0 = null, dur = Math.min(900, 320 + Math.abs(dist) * 0.28);
        /* 时长随距离微调：跨半页别拖一秒，滚全屏也别太急 */
        (function anim(ts){
          if (t0 === null) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur);
          var eased = k < 0.5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2; /* easeInOutCubic */
          window.scrollTo(0, from + dist * eased);
          if (k < 1) requestAnimationFrame(anim);
          else if (window.__rvSweep) window.__rvSweep();      /* 瞬移会跳过渐显回调，滚完补扫一次 */
        })(performance.now());
      }
      history.replaceState(null, '', '#' + id);               /* 地址栏留痕，但不新增历史记录（后退键不会卡在一串锚点上） */
      if (window.__rvSweep) setTimeout(window.__rvSweep, 60);
    });
  });

  /* ---- 3. 当前分区高亮 ----
     用 IntersectionObserver 盯 section，谁在屏幕中间就把对应链接点亮。 */
  var secs = document.querySelectorAll('section[id]');
  if ('IntersectionObserver' in window && secs.length) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var id = en.target.id;
        Array.prototype.forEach.call(links, function(a){
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px' }); /* 上下各砍 45%，只留中间 10% 这条"判定带"，高亮才不会来回跳 */
    Array.prototype.forEach.call(secs, function(s){ io.observe(s); });
  }

  /* ---- 4. 明暗主题切换 ----
     关键：只切 data-theme 属性，颜色由 base.css 的变量自动换一套，不重写任何规则。 */
  var btn = document.querySelector('.theme-btn');
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('demo-theme'); } catch (err) { saved = null; } /* 用 file:// 打开时部分浏览器禁写 localStorage，必须 try */
  if (saved) root.setAttribute('data-theme', saved);
  function syncBtn(){
    if (!btn) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☾' : '☀';
    btn.setAttribute('aria-label', dark ? '切换到亮色主题' : '切换到深色主题');
  }
  if (btn) btn.addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('demo-theme', next); } catch (err) {}
    syncBtn();
  });
  syncBtn();
})();
