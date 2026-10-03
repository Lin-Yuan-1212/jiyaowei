/* ============================================================
   js/products.js —— 产品目录页的搜索筛选 + 分类跳转
   职责很窄：只做"隐藏不匹配的卡片"和"滚到某个分类"，
   渐显、吸顶、主题那些仍然由 reveal.js / nav.js 负责，这里不碰。
   ============================================================ */
(function(){
  'use strict';

  var cards    = Array.prototype.slice.call(document.querySelectorAll('.pcard'));
  var cats     = Array.prototype.slice.call(document.querySelectorAll('section.cat'));
  var input    = document.getElementById('pc-q');
  var counter  = document.getElementById('pc-n');
  var none     = document.getElementById('pc-none');
  var noneQ    = document.getElementById('pc-none-q');
  var TOTAL    = cards.length;
  var bar      = document.querySelector('.pbar');
  var nav      = document.querySelector('.nav');

  /* 每张卡的可搜文本在生成时写进了 data-kw（型号/名称/品牌/分类/全部说明），
     这里只读一次缓存起来，避免每次按键都重新遍历 DOM 取文本。 */
  var KW = cards.map(function(el){ return (el.getAttribute('data-kw') || '').toLowerCase(); });

  function apply(q){
    var terms = q.split(/\s+/).filter(Boolean);        /* 支持"岛津 疲劳"这种多词收窄 */
    var shown = 0;
    for (var i = 0; i < cards.length; i++) {
      var hit = !terms.length || terms.every(function(t){ return KW[i].indexOf(t) > -1; });
      cards[i].classList.toggle('is-off', !hit);        /* display:none 由 CSS 的 .is-off 负责 */
      if (hit) shown++;
    }
    /* 整类都被筛空的分类区块一起隐藏，不然会留下一堆只有标题的空段 */
    cats.forEach(function(s){
      var left = s.querySelectorAll('.pcard:not(.is-off)').length;
      s.classList.toggle('is-off', left === 0);
    });
    if (counter) counter.textContent = terms.length ? '显示 ' + shown + ' / ' + TOTAL + ' 款' : '共 ' + TOTAL + ' 款';
    if (none) {
      none.hidden = shown !== 0;
      if (noneQ) noneQ.textContent = q;
    }
    current = null; onScroll();                         /* 筛完可见分类变了，跟随判定要重算一次 */
    if (window.__rvSweep) window.__rvSweep();          /* 刚显示出来的卡可能已经滚过头顶，补一次渐显 */
  }

  if (input) {
    var timer = null;
    input.addEventListener('input', function(){
      clearTimeout(timer);                              /* 200ms 防抖：中文输入法连打时不必每字都全量筛 */
      timer = setTimeout(function(){ apply(input.value.trim().toLowerCase()); }, 200);
    });
    input.addEventListener('keydown', function(e){ if (e.key === 'Escape') { input.value = ''; apply(''); } });
  }

  /* 吸顶区占掉的高度：导航 + 它下面那条筛选条 + 8px 余量。
     跳转落点和滚动判定共用这一个数（所以两边说的是同一条线）：
     点胶囊滚到位的位置，必须正好也算"已经进入了这一类"，否则高亮会停在上一类。 */
  function hold(){ return (nav ? nav.offsetHeight : 0) + (bar ? bar.offsetHeight : 0) + 8; }

  /* 分类跳转：不能用 nav.js 的通用锚点偏移，它不知道下面还压着一条吸顶筛选条。
     instant=true 用于"带 #cat-xxx 进这一页"的场景，见下面注释里的实测坑。 */
  function jumpTo(id, instant){
    var el = document.getElementById(id);
    if (!el) return;
    if (input && input.value) { input.value = ''; apply(''); }   /* 先清搜索，否则目标分类可能被筛成隐藏 */
    var to  = el.getBoundingClientRect().top + (window.pageYOffset || 0) - hold();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: to, left: 0, behavior: (instant || reduce) ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', '#' + id); } catch (err) {}
    /* 补扫渐显：平滑滚动要等滚完（700ms）再补，瞬移则立刻补 ——
       被跳过头顶的那一大段元素一次都没进过视口，不补扫就一直是透明的。 */
    if (window.__rvSweep) { if (instant) window.__rvSweep(); else setTimeout(window.__rvSweep, 700); }
  }

  /* 选中哪个分类，就把那条胶囊滚到可视区中间：16 个分类一屏放不下，
     不滚的话点了右边那几个，选中的东西还在屏幕外，下一步只能盲拖。
     键盘 Tab 聚焦走同一条路，所以用键盘选分类的人也看得到当前落在哪。 */
  var chips = document.querySelector('.chips');
  function centerChip(b, instant){
    if (!chips || !b) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var left = chips.scrollLeft + (b.getBoundingClientRect().left - chips.getBoundingClientRect().left)
             - (chips.clientWidth - b.offsetWidth) / 2;
    left = Math.max(0, left);
    if (chips.scrollTo) chips.scrollTo({ left: left, behavior: (instant || reduce) ? 'auto' : 'smooth' });
    else chips.scrollLeft = left;                       /* 老浏览器没有元素级 scrollTo(options) */
  }

  var chipEls = Array.prototype.slice.call(document.querySelectorAll('.chip[data-jump]'));
  var chipOf  = {};                                     /* cat-xxx -> 那颗胶囊 */
  chipEls.forEach(function(b){ chipOf[b.getAttribute('data-jump')] = b; });

  function markActive(id){
    chipEls.forEach(function(b){
      var on = b.getAttribute('data-jump') === id;
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'true');   /* 读屏也听得出"现在在这一类" */
      else b.removeAttribute('aria-current');
    });
  }

  /* ---- 手动翻页面时，胶囊条跟着亮、跟着居中 ----
     判定线用"哪个分类的顶边已经越过吸顶区下沿"，直接取 hold()，也就是 jumpTo 的落点线，
     所以点胶囊滚到位、和手动滚到位，点亮的是同一类。
     取"最后一个越线的分类"：文档流里各段顶边自上而下递增，越循环越靠后就是越新的。
     没用 nav.js 那种 IntersectionObserver 判定带：分类长短差得很大（16 款 vs 1 款），
     百分比 rootMargin 对短分类会同时命中好几段，高亮反而来回抖。 */
  var current   = null;
  var lockUntil = 0;                                    /* > now：这段时间内 spy 先别动 */
  var lockTail  = null;

  function spy(){
    /* +2 是给亚像素留的余量：缩放/滚动位置带小数时，落点可能差 0.4px 卡在判定线下面一点，
       没有这点余量就会把"上一类"当成当前类（实测滚到 cat-om 正位却亮 cat-em）。 */
    var line = hold() + 2;
    var id = null;
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].classList.contains('is-off')) continue;    /* 被筛空的分类整段隐藏，不参与判定 */
      if (cats[i].getBoundingClientRect().top - line <= 0) id = cats[i].id;
      else break;
    }
    /* 窗口很高时，最后一段的顶边可能一路都够不到判定线（它后面只剩一个短页脚），
       这时只要滚到了文档底部就直接认最后一段，不认的话高亮会永远停在倒数第二类。 */
    var y = window.scrollY || window.pageYOffset || 0;
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      for (var j = cats.length - 1; j >= 0; j--) {
        if (!cats[j].classList.contains('is-off')) { id = cats[j].id; break; }
      }
    }
    if (id === current) return;
    current = id;
    markActive(id);
    if (id) centerChip(chipOf[id]);
  }

  /* 点胶囊之后锁 900ms：平滑滚动要一路经过中间那几个分类，不锁的话胶囊条被它们拽着
     来回居中，落到目标还得再补一次，看着像抽风。解锁时补跑一次，防止"滚完就不再滚动"
     让高亮停在锁住之前的那一段。 */
  function lockSpy(ms){
    lockUntil = Date.now() + ms;
    clearTimeout(lockTail);
    lockTail = setTimeout(function(){ current = null; requestAnimationFrame(spy); }, ms);
  }

  var ticking = false;
  function onScroll(){
    if (ticking) return;                                /* rAF 节流：一帧最多量一次，滚动条拖到底也不卡 */
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      if (Date.now() < lockUntil) return;
      spy();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);          /* 吸顶条高度会变（窄屏换行），判定线要跟着重算 */

  chipEls.forEach(function(b){
    b.addEventListener('click', function(){
      var id = b.getAttribute('data-jump');
      jumpTo(id);
      centerChip(b);
      current = id; markActive(id); lockSpy(900);       /* 先按点击结果点亮，别让途中经过的分类插话 */
    });
    b.addEventListener('focus', function(){ centerChip(b); });
  });

  /* 顶部导航面板（和首页共用一份）里也有指向本页分类的普通链接，它们走 nav.js 的通用锚点滚动，
     那条路不知道搜索筛选还开着 —— 目标分类可能被筛成 display:none，滚过去的落点全错。
     这里在捕获阶段抢在 nav.js 之前把筛选清掉，让 nav.js 量到的是恢复后的真实位置。 */
  document.addEventListener('click', function(e){
    var a = (e.target && e.target.closest) ? e.target.closest('a[href^="#cat-"]') : null;
    if (a && input && input.value) { input.value = ''; apply(''); }
  }, true);

  /* 带 #cat-xxx 进来（从首页导航面板点分类、或刷新/分享链接）时自己滚过去。
     这里用"先瞬移、load 之后再瞬移校正一次"，不用平滑滚动：加载途中浏览器的滚动恢复
     会来抢，平滑动画的目标点还会被当时"最大可滚距离"夹住，走到中途就停住不再修正
     —— 实测落点比目标差 3000~8000px，而瞬移每次都精确落在吸顶条下面 8px。 */
  (function(){
    var h = (location.hash || '').replace('#', '');
    if (h.indexOf('cat-') !== 0) return;
    /* 关掉浏览器的"恢复上次滚动位置"，否则它会在 load 之后异步再滚一次，把校正顶掉。
       没有 #cat- 参数时不动它的默认行为，后退键照常还原位置。 */
    try { history.scrollRestoration = 'manual'; } catch (err) {}
    var chip = chipOf[h];                                 /* 胶囊条也跟着落到那一项 */
    current = h; markActive(h); lockSpy(1200);            /* 瞬移前后别让跟随判定插进来抢胶囊条 */
    setTimeout(function(){ jumpTo(h, true); centerChip(chip, true); }, 60);
    window.addEventListener('load', function(){ setTimeout(function(){ jumpTo(h, true); centerChip(chip, true); }, 30); });
  })();

  /* 开场先量一次：直接带滚动位置进这一页（刷新、后退还原）时不一定会有 scroll 事件，
     不等事件的话胶囊高亮会一直空着，直到用户手动滚第一格才亮。
     走 onScroll 而不是直接调 spy，让它服从上面那把锁，带 #cat-xxx 进来时才不被抢跑。 */
  current = null;
  onScroll();
  window.addEventListener('load', function(){ current = null; onScroll(); });
})();
