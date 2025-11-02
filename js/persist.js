
// SIMPLEBOS LocalStorage persistence (tables + lists) — no IndexedDB
(function(){
  // ===== KEYS =====
  var LS = {
    rkas:  'SimpleBOS:RKAS:HTML:v1',
    saved: 'SimpleBOS:Saved:HTML:v1',
    peg:   'SimpleBOS:List:Pegawai:v1',
    bel:   'SimpleBOS:List:Belanja:v1',
    ts:    'SimpleBOS:TS:v1'
  };

  // ===== SELECTORS =====
  var RKAS_BODIES  = ['#excelDataTable tbody', '#rkasTable tbody', '#x-arkas tbody', '#xArkas tbody', '#x-arkas-table tbody', '#x-arkas-body', '#tXArkas tbody'];
  var SAVED_BODIES = ['#savedTable tbody', '#dataTersimpan tbody', '#data-tersimpan tbody', '#savedData tbody', '#tDataTersimpan tbody'];

  function qFirst(list){
    for (var i=0;i<list.length;i++){
      var el = document.querySelector(list[i]);
      if (el) return el;
    }
    return null;
  }
  function getBodies(){
    return { rkas: qFirst(RKAS_BODIES), saved: qFirst(SAVED_BODIES) };
  }

  // ===== LS Utils =====
  function lsGet(key, fallback){
    try { var v = localStorage.getItem(key); return v==null ? fallback : JSON.parse(v); }
    catch(e){ return fallback; }
  }
  function lsSet(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
  }
  function hasRows(html){ return typeof html === 'string' && /<tr[\s>]/i.test(html); }
  function shouldOverwrite(prev, nxt){ return hasRows(nxt) || !hasRows(prev); }
  function throttle(fn, ms){ var to=null; return function(){ clearTimeout(to); to=setTimeout(fn, ms); }; }

  // ===== Lists (Pegawai/Belanja) =====
  function readOptions(sel){
    if (!sel) return [];
    var out = [];
    for (var i=0;i<sel.options.length;i++){
      var v = sel.options[i].value;
      if (v){ var up=v.toUpperCase(); if (out.indexOf(up)===-1) out.push(up); }
    }
    return out;
  }
  function writeOptions(sel, list){
    if (!sel || !Array.isArray(list)) return;
    var place = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (place) sel.appendChild(place);
    list.forEach(function(v){
      var opt = document.createElement('option');
      opt.value=v; opt.textContent=v;
      sel.appendChild(opt);
    });
  }
  function saveLists(){
    var peg = Array.from(new Set([
      ...readOptions(document.getElementById('namaPegawai')),
      ...readOptions(document.getElementById('editNamaPegawai'))
    ]));
    var bel = Array.from(new Set([
      ...readOptions(document.getElementById('belanja')),
      ...readOptions(document.getElementById('editBelanja'))
    ]));
    if (peg.length) lsSet(LS.peg, peg);
    if (bel.length) lsSet(LS.bel, bel);
  }
  function restoreLists(){
    var peg = lsGet(LS.peg, []);
    var bel = lsGet(LS.bel, []);
    if (peg.length){
      writeOptions(document.getElementById('namaPegawai'), peg);
      writeOptions(document.getElementById('editNamaPegawai'), peg);
    }
    if (bel.length){
      writeOptions(document.getElementById('belanja'), bel);
      writeOptions(document.getElementById('editBelanja'), bel);
    }
  }

  // ===== Tables =====
  function saveTables(reason){
    var b = getBodies();
    var prevR = lsGet(LS.rkas, null);
    var prevS = lsGet(LS.saved, null);
    var newR = b.rkas ? b.rkas.innerHTML : null;
    var newS = b.saved ? b.saved.innerHTML : null;

    if (shouldOverwrite(prevR, newR)) lsSet(LS.rkas, newR);
    if (shouldOverwrite(prevS, newS)) lsSet(LS.saved, newS);
    saveLists();
    lsSet(LS.ts, {t:Date.now(), reason:reason||'auto'});
  }

  function restoreTables(){
    var b = getBodies();
    var savedR = lsGet(LS.rkas, null);
    var savedS = lsGet(LS.saved, null);
    if (b.rkas && savedR) b.rkas.innerHTML = savedR;
    if (b.saved && savedS) b.saved.innerHTML = savedS;
    restoreLists();
    document.dispatchEvent(new CustomEvent('SimpleBOS:Restored'));
  }

  // ===== Hooks =====
  function hookButtons(){
    var ids = ['simpanBtn','editSave','hapusBtn','deleteBtn','transferBtn','gabungkanBtn','exportExcelBtn','exportPdfBtn','subUraianSaveBtn'];
    document.addEventListener('click', function(e){
      var t = e.target; if (!t) return;
      var match = ids.some(function(id){ return t.id===id || (t.closest && t.closest('#'+id)); });
      if (!match) return;
      setTimeout(function(){ saveTables('btn:'+(t.id||'')); }, 50);
    }, true);
  }
  function attachObservers(){
    var b = getBodies();
    var cfg = { childList:true, subtree:true, attributes:true };
    var saveTh = throttle(function(){ saveTables('mutation'); }, 120);
    try{ if (b.rkas){ new MutationObserver(saveTh).observe(b.rkas, cfg); } }catch(e){}
    try{ if (b.saved){ new MutationObserver(saveTh).observe(b.saved, cfg); } }catch(e){}
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', function(){
    // Pulihkan beberapa kali untuk melampaui inisialisasi app
    restoreTables();
    setTimeout(restoreTables, 220);
    setTimeout(restoreTables, 600);
    hookButtons();
    attachObservers();
    // Simpan awal bila ada isi
    setTimeout(function(){ saveTables('onload'); }, 800);
    // Safety periodic save (tidak menimpa data lama dengan kosong)
    setInterval(function(){ saveTables('interval'); }, 2000);
  });
})();
