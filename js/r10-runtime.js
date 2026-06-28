(function(){
  window.addEventListener('error', function(e){
    try{ var el=document.getElementById('status'); if(el) el.textContent='Uygulama hatası: '+(e.message||e.error||e); }catch(_){}
  });
  window.addEventListener('unhandledrejection', function(e){
    try{ var el=document.getElementById('status'); if(el) el.textContent='İşlem hatası: '+((e.reason&&e.reason.message)||e.reason||e); }catch(_){}
  });
})();
