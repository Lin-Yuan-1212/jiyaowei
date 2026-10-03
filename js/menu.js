/* ============================================================
   js/menu.js —— 苹果式磨砂下拉面板的开关逻辑
   ------------------------------------------------------------
   职责划分：所有视觉与过渡都在 css/menu.css，这里只负责切类。
   触发方式有两种，缺一不可：
     鼠标（宽屏 + 真鼠标设备）：悬停 140ms 自动展开，移开自动收起
     点击 / 触屏 / 键盘：点栏目展开，点外面、Esc、再点同一个栏目收起
   命名约定：
     触发器  <a data-menu="products" aria-controls="menu-products">
     面板    <div class="menu" id="menu-products">
   即"面板 id = menu- + data-menu 的值"，改哪边都要改两边。
   ============================================================ */
(function(){
  'use strict';

  var nav = document.querySelector('.nav');
  var scrim = document.querySelector('.menu-scrim');
  var burger = document.querySelector('.nav__burger');

  var openEl = null;    /* 当前打开的面板 */
  var openTrig = null;  /* 当前点亮的那个触发器 */
  var lastFocus = null; /* 打开前的焦点，关闭后还回去，键盘用户才不会掉回页顶 */
  var byHover = false;  /* 这次是鼠标飘开的吗？只有飘开的才允许"鼠标移走就收" */
  var inTimer = null, outTimer = null;

  /* 两个延时（这是行为参数，不是样式数值，所以放 JS 而不是 CSS）：
     IN  —— 鼠标划过导航时不会每个栏目都炸开一次面板，得"停一下"才算有意图；
     OUT —— 从导航移进面板要跨过一条边界线，中间有 1~2 帧谁都不被悬停，
            延时太短会出现"面板自己抖一下收起"的毛病。 */
  var HOVER_IN = 140, HOVER_OUT = 260;

  /* 只有"真有鼠标"的设备才启用 hover 开面板：
     触屏上 pointerenter 也会在点按时派发，不关掉的话手机用户点一下就被迫开面板。
     窄屏同样跳过：那时横向栏目是 display:none 的，只剩汉堡按钮。 */
  function canHover(){
    if (window.innerWidth <= 760) return false;
    if (window.matchMedia) {
      if (!window.matchMedia('(hover: hover)').matches) return false;
      if (!window.matchMedia('(pointer: fine)').matches) return false;
    }
    return true;
  }

  /* 往上找带某属性的祖先。不用 el.closest，逻辑更直白，也不用担心老浏览器 */
  function upTo(node, attr){
    while (node && node !== document) {
      if (node.getAttribute && node.getAttribute(attr) !== null) return node;
      node = node.parentNode;
    }
    return null;
  }

  /* syncFocus 传 false 的场景：点了面板里的链接，紧接着要平滑滚到锚点，
     这时候把焦点还给导航按钮会打断滚动，所以只关不收焦点。 */
  function close(syncFocus){
    if (!openEl) return;
    var back = lastFocus;
    clearTimeout(inTimer); clearTimeout(outTimer);
    inTimer = outTimer = null;
    byHover = false;
    openEl.classList.remove('is-open');
    openEl.setAttribute('aria-hidden', 'true');
    if (openTrig) { openTrig.classList.remove('is-open'); openTrig.setAttribute('aria-expanded', 'false'); }
    if (scrim) scrim.classList.remove('is-on');
    if (nav) nav.classList.remove('has-menu');
    if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    document.body.classList.remove('menu-open');
    openEl = null; openTrig = null; lastFocus = null;
    if (syncFocus !== false && back && back.focus && document.contains(back)) back.focus();
  }

  function open(id, trig, viaHover){
    var el = document.getElementById('menu-' + id);
    if (!el) return;
    if (openEl === el) { close(); return; }   /* 再点同一个栏目 = 收起 */
    close(false);

    openEl = el; openTrig = trig || null;
    lastFocus = (trig && trig.focus) ? trig : document.activeElement;

    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    if (openTrig) { openTrig.classList.add('is-open'); openTrig.setAttribute('aria-expanded', 'true'); }
    if (scrim) scrim.classList.add('is-on');
    if (nav) nav.classList.add('has-menu');
    if (burger && id === 'all') { burger.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); }
    document.body.classList.add('menu-open');
    byHover = !!viaHover;
  }

  /* ---- 1. 一个委托监听管全站点击 ----
     顺序很重要：先认触发器（接管并 preventDefault，别让它当普通锚点跳走），
     剩下的点击只要不在已打开的面板里，就一律当成"点外面"收起。
     遮罩、导航右侧空白、正文都是这一条覆盖掉的，不需要各写一个监听。 */
  document.addEventListener('click', function(e){
    var trig = upTo(e.target, 'data-menu');
    if (trig) {
      e.preventDefault();
      open(trig.getAttribute('data-menu'), trig);
      return;
    }
    if (openEl && !openEl.contains(e.target)) close(false);
  });

  /* ---- 2. 面板里的链接：先收起，再让 js/nav.js 去做平滑滚动 ----
     这里不 preventDefault 也不 stopPropagation，两个脚本各干各的，互不抢事件。 */
  Array.prototype.forEach.call(document.querySelectorAll('.menu'), function(el){
    el.addEventListener('click', function(e){
      if (upTo(e.target, 'href')) close(false);
    });
  });

  /* ---- 3. Esc 收起并把焦点还给触发器 ----
     注意这里不处理 Tab：打开后焦点仍留在导航栏目上（苹果就是这个行为），
     如果 Tab 就关面板，键盘用户反而进不去面板。 */
  document.addEventListener('keydown', function(e){
    if (openEl && (e.key === 'Escape' || e.key === 'Esc')) close();
  });

  /* ---- 4. 鼠标悬停自动展开（苹果全站导航就是这个行为，不需要点） ----
     三层保护，少一层手感就变糟：
       a) 进栏目要停 140ms 才开 —— 否则鼠标斜着划过导航会连着闪四五个面板；
       b) 已经有面板开着时，换栏目立刻切换，不再等 —— 因为此时意图很明确；
       c) 只有"飘开的"面板才随鼠标移走自动收起，点开的仍然要显式关闭 ——
          触屏没有 hover，走的是点击那条路，不会被这套定时器等无故关掉。 */
  function cancelPendingIn(){ clearTimeout(inTimer); inTimer = null; }

  Array.prototype.forEach.call(document.querySelectorAll('[data-menu]'), function(trig){
    trig.addEventListener('mouseenter', function(){
      if (!canHover()) return;
      cancelPendingIn();
      var id = trig.getAttribute('data-menu');
      if (openEl) {
        if (openEl.id !== 'menu-' + id) open(id, trig, true);   /* b) 已开 → 立刻换 */
        return;
      }
      inTimer = setTimeout(function(){ open(id, trig, true); }, HOVER_IN);
    });
    /* 还没到 140ms 就走了：说明只是路过，取消这次展开 */
    trig.addEventListener('mouseleave', function(){ if (inTimer) cancelPendingIn(); });
  });

  /* ---- 5. 鼠标离开"导航 + 面板"这块区域才收起 ----
     导航和面板是兄弟节点，指针从导航移进面板的瞬间会先派发 nav 的 mouseleave、
     再派发 panel 的 mouseenter，中间空那一两帧。所以这里必须用延时而不是直接 close，
     并且在两边的 enter 上都把计时器取消掉，否则面板会自己抖一下收起。 */
  function scheduleAutoClose(){
    if (!openEl || !byHover) return;         /* 点开的不由 hover 负责关 */
    clearTimeout(outTimer);
    outTimer = setTimeout(function(){ close(false); }, HOVER_OUT);
  }
  function cancelAutoClose(){ clearTimeout(outTimer); outTimer = null; }

  function bindZone(el){
    if (!el) return;
    /* 注意用的是 mouseenter/mouseleave（不冒泡，只在进出整块区域时各触发一次），
       不是 mouseover/mouseout —— 后者在区域内部从一个字移到另一个字都会触发，面板根本没法保持打开。 */
    el.addEventListener('mouseenter', cancelAutoClose);
    el.addEventListener('mouseleave', scheduleAutoClose);
  }
  bindZone(nav);
  Array.prototype.forEach.call(document.querySelectorAll('.menu'), bindZone);

  /* ---- 6. 拉宽窗口时收起，避免整屏菜单带着 body 的锁滚动状态残留下来 ---- */
  var narrow = window.innerWidth <= 760;
  window.addEventListener('resize', function(){
    var now = window.innerWidth <= 760;
    if (now !== narrow) close(false);
    narrow = now;
  }, { passive: true });
})();
