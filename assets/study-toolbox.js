(function(){
  try {
    const fileName = location.pathname.split('/').pop() || '';
    if(['index.html','spark.html'].includes(fileName)) return; // 除外ページ

    const main = document.getElementById('article-content') || document.querySelector('.main-content');
    const toolbox = document.querySelector('.study-toolbox');
    const drawer = document.getElementById('studyMemoDrawer');
    if(!main || !toolbox || !drawer) return;

    const highlightBtn = toolbox.querySelector('.tool-highlight');
    const memoBtn = toolbox.querySelector('.tool-memo');
    const scrollBtn = toolbox.querySelector('.scroll-top');
    const memoTextarea = drawer.querySelector('textarea');
    const memoAdd = drawer.querySelector('.memo-add');
    const memoClearAll = drawer.querySelector('.memo-clear-all');
    const savedAtEl = drawer.querySelector('.saved-at');
    const pageKey = (fileName || 'page').replace(/\.html$/,'');

    let highlightMode = false;

    /* ===== Restore highlights ===== */
    (function restoreHighlights(){
      try{
        const stored = localStorage.getItem('studyHighlights_'+pageKey);
        if(stored){
          main.innerHTML = stored;
        }
      }catch(e){ console.warn('Highlight restore failed', e); }
      attachRemovalHandlers();
    })();

    function persistHighlights(){
      try{ localStorage.setItem('studyHighlights_'+pageKey, main.innerHTML); }catch(e){ console.warn('Persist highlights failed', e); }
    }

    /* ===== Highlight Mode Toggle ===== */
    highlightBtn.addEventListener('click', () => {
      highlightMode = !highlightMode;
      highlightBtn.setAttribute('aria-pressed', String(highlightMode));
      toolbox.classList.toggle('highlight-active', highlightMode);
    });

    /* ===== Memo Drawer Toggle ===== */
    memoBtn.addEventListener('click', () => {
      const expanded = memoBtn.getAttribute('aria-expanded') === 'true';
      memoBtn.setAttribute('aria-expanded', String(!expanded));
      drawer.setAttribute('aria-hidden', String(expanded));
    });

    /* ===== Sticky Notes System ===== */
    const notesKey = 'studySticky_'+pageKey;
    let placingNote = null; // pending note text waiting for placement
    const existingNotes = [];

    function createNoteElement(note){
      const el = document.createElement('div');
      el.className = 'study-sticky-note';
      el.dataset.id = note.id;
      el.style.left = note.x + 'px';
      el.style.top = note.y + 'px';
      const textDiv = document.createElement('div');
      textDiv.className = 'note-text';
      textDiv.textContent = note.text;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'note-close';
      closeBtn.setAttribute('aria-label','付箋を削除');
      closeBtn.textContent = '×';
      const dragHandle = document.createElement('div');
      dragHandle.className = 'note-drag';
      dragHandle.setAttribute('aria-label','付箋をドラッグ');
      dragHandle.textContent = '↕';
      el.appendChild(textDiv);
      el.appendChild(closeBtn);
      el.appendChild(dragHandle);
      document.body.appendChild(el);
      addNoteInteractions(el);
      return el;
    }

    function persistNotes(){
      try{ localStorage.setItem(notesKey, JSON.stringify(existingNotes)); }catch(e){ console.warn('Persist notes failed', e); }
    }

    function restoreNotes(){
      try{
        const raw = localStorage.getItem(notesKey);
        if(raw){
          const arr = JSON.parse(raw);
          arr.forEach(n => { existingNotes.push(n); createNoteElement(n); });
        }
      }catch(e){ console.warn('Restore notes failed', e); }
    }
    restoreNotes();

    memoAdd.addEventListener('click', () => {
      const text = memoTextarea.value.trim();
      if(!text){ return; }
      placingNote = { id: 'n'+Date.now(), text, x: 0, y: 0 };
      memoTextarea.value='';
      showPlacementIndicator();
    });

    memoClearAll.addEventListener('click', () => {
      if(!confirm('全ての付箋を削除しますか？')) return;
      document.querySelectorAll('.study-sticky-note').forEach(n => n.remove());
      existingNotes.splice(0, existingNotes.length);
      persistNotes();
    });

    function showPlacementIndicator(){
      if(document.querySelector('.placing-note-indicator')) return;
      const ind = document.createElement('div');
      ind.className = 'placing-note-indicator';
      ind.textContent = '配置したい場所をクリック';
      document.body.appendChild(ind);
    }
    function removePlacementIndicator(){
      const ind = document.querySelector('.placing-note-indicator');
      if(ind) ind.remove();
    }

    document.addEventListener('click', (e) => {
      if(!placingNote) return;
      // Avoid placing on toolbox/drawer itself
      if(toolbox.contains(e.target) || drawer.contains(e.target)) return;
      placingNote.x = e.pageX - 80; // offset for width
      placingNote.y = e.pageY - 40; // offset for height
      existingNotes.push({ ...placingNote });
      createNoteElement(placingNote);
      persistNotes();
      placingNote = null;
      removePlacementIndicator();
    });

    function addNoteInteractions(el){
      const closeBtn = el.querySelector('.note-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        const idx = existingNotes.findIndex(n => n.id === id);
        if(idx !== -1){ existingNotes.splice(idx,1); persistNotes(); }
        el.remove();
      });
      // Dragging
      let dragging = false; let startX=0; let startY=0; let origX=0; let origY=0;
      function startDrag(ev){
        dragging = true;
        startX = ev.clientX; startY = ev.clientY;
        origX = parseFloat(el.style.left)||0; origY = parseFloat(el.style.top)||0;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
      }
      function onDrag(ev){
        if(!dragging) return;
        const dx = ev.clientX - startX; const dy = ev.clientY - startY;
        const newX = origX + dx; const newY = origY + dy;
        el.style.left = newX + 'px'; el.style.top = newY + 'px';
      }
      function endDrag(){
        if(!dragging) return;
        dragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        const id = el.dataset.id;
        const note = existingNotes.find(n => n.id === id);
        if(note){ note.x = parseFloat(el.style.left)||0; note.y = parseFloat(el.style.top)||0; persistNotes(); }
      }
      el.addEventListener('mousedown', (ev) => {
        if(ev.target.classList.contains('note-close')) return;
        startDrag(ev);
      });
    }

    /* ===== Selection to Highlight ===== */
    document.addEventListener('mouseup', () => {
      if(!highlightMode) return;
      const sel = window.getSelection();
      if(!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if(!main.contains(range.commonAncestorContainer)) return; // メイン外は無視
      // 正規化: 大きすぎる選択は拒否
      const textContent = sel.toString();
      if(textContent.length < 1 || textContent.length > 800) { sel.removeAllRanges(); return; }

      // 既存ハイライト内なら無視
      let node = range.commonAncestorContainer;
      while(node){
        if(node.classList && node.classList.contains('study-highlight')){ sel.removeAllRanges(); return; }
        node = node.parentNode;
      }

      const span = document.createElement('span');
      span.className = 'study-highlight';
      span.dataset.temp = 'true';

      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-highlight';
      removeBtn.setAttribute('role','button');
      removeBtn.setAttribute('aria-label','ハイライトを削除');
      removeBtn.textContent = '×';
      span.appendChild(removeBtn);

      try{
        const contents = range.extractContents();
        span.insertBefore(contents, removeBtn); // テキストを前に
        range.insertNode(span);
        sel.removeAllRanges();
        span.dataset.temp = 'false';
        persistHighlights();
      }catch(e){ console.warn('Highlight insert failed', e); }
    });

    /* ===== Remove highlight ===== */
    function attachRemovalHandlers(){
      main.querySelectorAll('.study-highlight .remove-highlight').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wrap = btn.parentElement;
          if(!wrap) return;
          const textNodes = Array.from(wrap.childNodes).filter(n => n !== btn);
          const frag = document.createDocumentFragment();
          textNodes.forEach(n => frag.appendChild(n));
          wrap.replaceWith(frag);
          persistHighlights();
        });
      });
    }
    attachRemovalHandlers();

    /* ===== Scroll Top Button ===== */
    function handleScrollBtn(){
      const y = window.scrollY || document.documentElement.scrollTop;
      if(y > 400){
        scrollBtn.classList.remove('hidden');
      }else{
        scrollBtn.classList.add('hidden');
      }
    }
    window.addEventListener('scroll', handleScrollBtn, { passive:true });
    handleScrollBtn();
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top:0, behavior:'smooth' });
    });

    /* ===== Keyboard Shortcuts ===== */
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){
        if(highlightMode){ highlightMode = false; highlightBtn.setAttribute('aria-pressed','false'); toolbox.classList.remove('highlight-active'); }
        if(drawer.getAttribute('aria-hidden') === 'false'){ memoBtn.click(); }
      }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h'){ e.preventDefault(); highlightBtn.click(); }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm'){ e.preventDefault(); memoBtn.click(); }
    });

    /* ===== Reduced Motion Consideration ===== */
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      toolbox.querySelectorAll('button').forEach(b=> b.style.transition='none');
    }

    // Mutation observer (optional) to rebind removal if innerHTML changed externally
    const mo = new MutationObserver((muts) => {
      let need = false;
      for(const m of muts){ if(m.addedNodes && m.addedNodes.length) { need = true; break; } }
      if(need){ attachRemovalHandlers(); }
    });
    mo.observe(main, { childList:true, subtree:true });

  } catch(err){
    console.warn('Study toolbox init failed', err);
  }
})();
