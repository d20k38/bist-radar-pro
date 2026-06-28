/* BIST Radar Pro R10 Runtime
   Amaç: global fonksiyon kırılmalarını merkezi uyumluluk katmanı ile engellemek.
   Yeni veri üretmez; mevcut API ve gerçek veri akışını kullanır. */
(function(){
  const root = window;
  const R10 = root.BistRadar = root.BistRadar || {};
  R10.version = 'R10 Codebase Refactor';
  R10.modules = R10.modules || {};
  R10.state = R10.state || { errors: [], lastConfidence: null };
  R10.register = function(name, api){ R10.modules[name] = api || {}; return R10.modules[name]; };
  R10.safeText = function(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; };
  R10.safeHtml = function(id, value){ const el = document.getElementById(id); if(el) el.innerHTML = value; };
  R10.notify = function(message){
    try { if(typeof root.setStatus === 'function') root.setStatus(message); else console.log('[BIST R10]', message); }
    catch(e){ console.log('[BIST R10]', message); }
  };
  R10.fetchJson = async function(url, opts){
    opts = opts || {};
    const timeout = opts.timeout || 7000;
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), timeout);
    try{
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : {}; } catch(e){ throw new Error('API JSON döndürmedi: '+text.slice(0,160)); }
      if(!res.ok || json.error) throw new Error(json.error || ('HTTP '+res.status));
      return json;
    } finally { clearTimeout(timer); }
  };
  root.addEventListener('error', function(ev){
    R10.state.errors.push({ message: ev.message, source: ev.filename, line: ev.lineno, time: Date.now() });
    R10.notify('Uygulama hatası: '+ev.message);
  });
  root.addEventListener('unhandledrejection', function(ev){
    const msg = (ev.reason && ev.reason.message) ? ev.reason.message : String(ev.reason || 'Bilinmeyen promise hatası');
    R10.state.errors.push({ message: msg, type:'promise', time: Date.now() });
    R10.notify('İşlem hatası: '+msg);
  });

  root.runConfidence = root.runConfidence || async function(showMessage){
    const symbolBox = document.getElementById('search');
    const selectBox = document.getElementById('symbol');
    const symbol = ((symbolBox && symbolBox.value) || (selectBox && selectBox.value) || 'PAPIL').toString().toUpperCase().trim();
    try{
      const j = await R10.fetchJson('/api/confidence?symbol='+encodeURIComponent(symbol)+'&t='+Date.now(), { timeout: 6500 });
      R10.state.lastConfidence = j;
      const c = j.confidence || j.layers || j.analysis || j;
      const total = Number(c.total ?? c.score ?? c.confidence ?? 50);
      const risk = Number(c.risk ?? c.riskScore ?? 50);
      const quality = Number(c.quality ?? c.dataQuality ?? total);
      const html = '<div class="comment"><b>Güven Katmanları</b><br>'+
        '<b>Hisse:</b> '+symbol+'<br>'+
        '<b>Güven:</b> '+(isFinite(total)?total.toFixed(0):'-')+'/100<br>'+
        '<b>Risk:</b> '+(isFinite(risk)?risk.toFixed(0):'-')+'/100<br>'+
        '<b>Veri Kalitesi:</b> '+(isFinite(quality)?quality.toFixed(0):'-')+'/100<br>'+
        '<span class="mini">R10 compatibility layer üzerinden çalıştırıldı; random/demo veri üretilmedi.</span></div>';
      ['confidenceBox','confidenceResult','confidenceLayerBox','confidenceContent'].forEach(id=>R10.safeHtml(id, html));
      if(showMessage !== false) R10.notify('Güven katmanları güncellendi: '+symbol);
      return j;
    }catch(e){
      const html = '<div class="comment">Güven katmanları alınamadı: '+(e.message||e)+'<br><span class="mini">Bu hata uygulamanın açılışını durdurmaz.</span></div>';
      ['confidenceBox','confidenceResult','confidenceLayerBox','confidenceContent'].forEach(id=>R10.safeHtml(id, html));
      if(showMessage !== false) R10.notify('Güven katmanları uyarısı: '+(e.message||e));
      return { success:false, error:String(e.message||e), symbol };
    }
  };

  R10.register('compat', { runConfidence: root.runConfidence });
})();
