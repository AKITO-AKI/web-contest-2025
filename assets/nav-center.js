/* nav-center.js
 * ナビゲーションの .nav-link.active を中央付近にスムーズスクロールする共通スクリプト
 * スクロール位置をlocalStorageで保存・復元
 * 他ページでも <script src="assets/nav-center.js"></script> を追加するだけで動作
 */
(function(){
  if(window.__NAV_CENTER_INIT__) return; // 二重初期化防止
  window.__NAV_CENTER_INIT__ = true;

  const STORAGE_KEY = 'nav_scroll_position';

  function saveScrollPosition(){
    const nav = document.querySelector('.navigation');
    if(nav){
      try {
        sessionStorage.setItem(STORAGE_KEY, nav.scrollLeft);
      } catch(e) {
        // storage無効時はスキップ
      }
    }
  }

  function restoreScrollPosition(){
    const nav = document.querySelector('.navigation');
    if(nav){
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if(saved !== null){
          nav.scrollLeft = parseInt(saved, 10);
        }
      } catch(e) {
        // storage無効時はスキップ
      }
    }
  }

  function centerActive(link){
    const nav = document.querySelector('.navigation');
    if(!nav || !link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const current = nav.scrollLeft;
    const offsetWithin = (linkRect.left - navRect.left);
    const targetLeft = current + offsetWithin - (nav.clientWidth - linkRect.width)/2;
    nav.scrollTo({ left: Math.max(targetLeft, 0), behavior: 'smooth' });
  }

  function initCenter(){
    const nav = document.querySelector('.navigation');
    const active = document.querySelector('.navigation .nav-link.active');
    
    // まず保存位置を復元
    restoreScrollPosition();
    
    if(active){
      // activeがあればレイアウト計算後に中央寄せ（保存位置を上書き）
      requestAnimationFrame(()=>centerActive(active));
    }
    
    // スクロール位置を定期保存
    if(nav){
      nav.addEventListener('scroll', saveScrollPosition, { passive: true });
    }
  }

  function observeActive(){
    const nav = document.querySelector('.navigation');
    if(!nav) return;
    const links = nav.querySelectorAll('.nav-link');
    const observer = new MutationObserver(mutations => {
      for(const m of mutations){
        if(m.type === 'attributes' && m.attributeName === 'class'){
          const el = m.target;
          if(el.classList.contains('nav-link') && el.classList.contains('active')){
            centerActive(el);
          }
        }
      }
    });
    links.forEach(l=>observer.observe(l,{ attributes:true, attributeFilter:['class'] }));
  }

  function ready(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(()=>{
    initCenter();
    observeActive();
    
    // ページ離脱時に位置を保存
    window.addEventListener('beforeunload', saveScrollPosition);
  });
})();
