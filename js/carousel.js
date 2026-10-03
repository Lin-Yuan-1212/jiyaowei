/* ============================================================
   js/carousel.js —— 两个自动左右轮播的进度层
   ------------------------------------------------------------
   职责边界（和 scrub.js 一样）：本文件只数数，不写样式。
   对外只产出两样东西：
     --i        当前翻到第几格（位移、圆点、页码全部由 CSS 从它算出来）
     类名       .is-run（脚本活着，可以开始藏格）/ .is-paused（悬停、聚焦、切到后台）
   一屏放几格写在 css/carousel.css 的 --view 里，这里只把它读回来用，
   所以改断点不用动本文件。
   不要轮播：删掉 index.html 里这一行 <script> 就退回静态版式。
   ============================================================ */
(function(){
  'use strict';

  /* 系统要求减少动态效果就整段不注册：CSS 里 [data-carousel]:not(.is-run) 那组回退会接管 */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var boxes = document.querySelectorAll('[data-carousel]');
  if (!boxes.length) return;

  function cellsOf(box){
    var a = box.querySelectorAll('.hcar__slide');
    return a.length ? a : box.querySelectorAll('.gcar__track .card');
  }

  Array.prototype.forEach.call(boxes, function(box){
    var cells = cellsOf(box);
    var n = cells.length;
    if (n < 2) return;                                  /* 只有一格没什么可轮 */

    var track = box.querySelector('.hcar__stage, .gcar__track');
    var dots  = box.querySelectorAll('.hcar__dots button');
    var stepEl = box.querySelector('[data-step]');

    box.classList.add('is-run');                        /* 告诉 CSS：可以开始藏出视口的格子了 */

    /* 末尾补上克隆格（补几格由 CSS 的 --car-clone 说了算 = 最宽时一屏放几格）。
       有了克隆，"最右再往右"是第一张从右边推进来，而不是把整条轨道倒带回去：
       位置 i = n 的画面和 i = 0 一模一样，脚本就在这个等价点上无动画归零，肉眼看不出来。 */
    var cloneN = parseInt(getComputedStyle(box).getPropertyValue('--car-clone'), 10);
    cloneN = (isFinite(cloneN) && cloneN > 0) ? Math.min(cloneN, n - 1) : 1;
    for (var c = 0; c < cloneN; c++) {
      var cl = cells[c].cloneNode(true);
      cl.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(cl.querySelectorAll('a,button'), function(el){ el.setAttribute('tabindex', '-1'); });
      var hd = cl.querySelector('h1');                  /* 克隆里不能冒出第二个 h1 */
      if (hd) {
        var hd2 = document.createElement('div');
        hd2.className = hd.className;
        hd2.innerHTML = hd.innerHTML;
        hd.parentNode.replaceChild(hd2, hd);
      }
      track.appendChild(cl);
    }

    var i = 0, timer = null;
    var interval = parseInt(box.getAttribute('data-interval'), 10) || 5000;

    /* --view 是 CSS 令牌，这里只读不写：媒体查询改了一屏几格，脚本跟着变 */
    function view(){
      var v = parseFloat(getComputedStyle(box).getPropertyValue('--view'));
      return (isFinite(v) && v > 0) ? Math.round(v) : 1;
    }

    function paint(){
      if (i > n) i = 0;                                 /* 窗口变窄、拖过头时收回来 */
      track.style.setProperty('--i', i);
      var cur = i % n;                                  /* i === n 那个位置读起来就是第 1 格 */
      for (var j = 0; j < dots.length; j++) dots[j].setAttribute('aria-selected', j === cur ? 'true' : 'false');
      if (stepEl) stepEl.textContent = (cur + 1) + ' / ' + n;
    }

    /* 无动画挪到等价位置：因为画面一模一样，这一跳看不出来 */
    function jump(k){
      track.style.transition = 'none';
      i = k; paint();
      void track.offsetWidth;                           /* 强制一次布局，让归零先生效；同一帧里连着改会被合并成一次动画 */
      track.style.transition = '';
    }

    /* 永远只往一个方向走：越过两端就先借等价位置跳一下，再接着走 */
    function step(dir){
      if (dir > 0 && i >= n) jump(0);
      if (dir < 0 && i <= 0) jump(n);
      i += dir;
      paint();
    }

    function go(k){ i = k; paint(); restart(); }
    function stop(){ if (timer) { clearInterval(timer); timer = null; } }
    function restart(){ stop(); if (!box.classList.contains('is-paused')) timer = setInterval(next, interval); }
    function next(){ step(1); }

    /* 悬停 / 键盘焦点落在轮播里就暂停：读屏或点链接时画面不能自己跑掉 */
    function pause(on){
      box.classList.toggle('is-paused', on);
      if (on) stop(); else restart();
    }
    box.addEventListener('mouseenter', function(){ pause(true); });
    box.addEventListener('mouseleave', function(){ pause(false); });
    box.addEventListener('focusin',  function(){ pause(true); });
    box.addEventListener('focusout', function(){ pause(!box.matches(':hover')); });

    /* 切到别的标签页就停：回来时不会发现已经偷偷翻过去好几屏 */
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stop(); else restart();
    });

    /* 圆点：跳到指定一屏 */
    Array.prototype.forEach.call(dots, function(d, k){
      d.addEventListener('click', function(){ go(k); });
    });

    /* 左右按钮：手动翻，翻完重新计时，不然点了马上又被自动推走 */
    Array.prototype.forEach.call(box.querySelectorAll('.gcar__arrow'), function(b){
      b.addEventListener('click', function(){
        step(parseInt(b.getAttribute('data-dir'), 10) < 0 ? -1 : 1);
        restart();
      });
    });

    /* 触摸横向拖：位移直接跟着手指走（写 --i 的小数），CSS 的过渡公式天然支持。
       一格的像素宽 = 轨道宽 / 一屏格数，所以拖满一屏正好翻 view 格。
       先判方向：竖向为主就不接管，手机上滑动页面不能被轮播抢走。 */
    var x0 = null, y0 = null, locked = false;
    function unit(){ return (track.clientWidth || 1) / view(); }
    function clamp(v){ return v < 0 ? 0 : (v > n ? n : v); }
    track.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; locked = false;
    }, { passive: true });
    track.addEventListener('touchmove', function(e){
      if (x0 === null) return;
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!locked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;   /* 还没看出意图 */
        if (Math.abs(dy) > Math.abs(dx)) { x0 = null; return; } /* 竖滑：交还给浏览器 */
        locked = true;
        track.style.transition = 'none';
        pause(true);
        /* 在两端起手拖的时候先跳到等价位置，这样往任何一个方向拖都不会拖出空白 */
        if (dx < 0 && i >= n) jump(0);
        else if (dx > 0 && i <= 0) jump(n);
      }
      track.style.setProperty('--i', clamp(i - dx / unit()).toFixed(3));
    }, { passive: true });
    function endDrag(e){
      if (x0 === null) return;
      var t = e.changedTouches[0];
      var dx = (t && locked) ? (t.clientX - x0) : 0;
      x0 = null; locked = false;
      track.style.transition = '';
      i = Math.round(clamp(i - dx / unit()));
      paint();
      if (box.classList.contains('is-paused')) pause(false);
    }
    track.addEventListener('touchend', endDrag);
    track.addEventListener('touchcancel', endDrag);

    var ticking = false;
    window.addEventListener('resize', function(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ paint(); ticking = false; });
    }, { passive: true });

    paint();
    restart();
  });
})();
