
/*
BIST Radar Pro v17.0 Modular Stable
Bu dosya, v16.17'deki çalışan davranışı koruyacak şekilde ana uygulama katmanıdır.
Sonraki sürümlerde modüller aşağıdaki dosyalara taşınacaktır:
- router.js
- dashboard.js
- stock-analysis.js
- portfolio.js
- backtest.js
- learning.js
- kap-news.js
- confidence.js
- committee.js
*/
(function(){
  window.BRP_VERSION = 'v17.0 Modular Stable';
  function patchTitle(){
    document.title = 'BIST Radar Pro v17.0 Modular Stable';
    document.querySelectorAll('h1,h2,.title,.brand,header *').forEach(function(el){
      if((el.textContent||'').includes('BIST Radar Pro v16.17')){
        el.textContent = el.textContent.replace('BIST Radar Pro v16.17','BIST Radar Pro v17.0 Modular Stable');
      }
    });
  }
  document.addEventListener('DOMContentLoaded', patchTitle);
  setTimeout(patchTitle,300);
})();


/* v16.17 çalışan gömülü script yedeği */
let chart, candleChart, candleSeries, lineSeries=[], lastRows=[], syms=[], scanCache=[], lastStock=null;
const defaultPortfolio=[{symbol:'MRSHL',lot:286,cost:2470},{symbol:'PAPIL',lot:7000,cost:27.50},{symbol:'TEZOL',lot:6156,cost:20.96},{symbol:'USAK',lot:29222,cost:3.05},{symbol:'VKING',lot:1000,cost:55}];
let portfolio=loadPortfolioLocal();
const $=id=>document.getElementById(id);const fmt=(x,d=2)=>Number.isFinite(Number(x))?Number(x).toLocaleString('tr-TR',{maximumFractionDigits:d,minimumFractionDigits:d}):'-';const tl=x=>fmt(x)+' TL';
function setStatus(t){$('status').textContent=t}
function showPage(id,btn){['dashboard','analysis','leaders','safe','opportunity','risky','patterns','backtestPage','learningPage','portfolio','portfolioAdvice','dailyReport','kapPage','confidencePage','committeePage'].forEach(x=>$(x).classList.add('hidden'));$(id).classList.remove('hidden');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));if(btn)btn.classList.add('active')}
function badgeClass(score,risk=false){score=Number(score)||0;if(risk)return score<35?'bgreen':score<60?'byellow':'bred';return score>=65?'bgreen':score>=50?'byellow':'bred'}
function decisionClass(d){return d==='GÜÇLÜ AL'||d==='AL'?'bgreen':d==='İZLE'?'byellow':d==='BEKLE'?'bblue':'bred'}
async function init(){wire();await loadSymbols();renderPortfolio();renderSignalJournal();await loadStock(false);await scanAll(true);renderKapNews()}
function wire(){document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page,b)));$('analyzeBtn').addEventListener('click',()=>{showPage('analysis',document.querySelector('[data-page="analysis"]'));loadStock(true)});$('backtestBtn').addEventListener('click',()=>{showPage('backtestPage',document.querySelector('[data-page=\"backtestPage\"]'));runBacktest()});$('scanBtn1').addEventListener('click',()=>scanAll(false)); setTimeout(()=>{const b=$('runBtBtn'); if(b)b.addEventListener('click',runBacktest); const p=$('runPortfolioBtBtn'); if(p)p.addEventListener('click',runPortfolioBacktest); const pa=$('pfAddBtn'); if(pa)pa.addEventListener('click',addOrUpdatePortfolio); const ps=$('pfSaveBtn'); if(ps)ps.addEventListener('click',()=>{savePortfolio();setStatus('Portföy kaydedildi.')}); const dr=$('dailyReportBtn'); if(dr)dr.addEventListener('click',renderDailyReport); const kr=$('kapRefreshBtn'); if(kr)kr.addEventListener('click',renderKapNews); const la=$('runLearningBtn'); if(la)la.addEventListener('click',runLearning); const ss=$('saveSignalBtn'); if(ss)ss.addEventListener('click',saveCurrentSignal); const cs=$('clearSignalsBtn'); if(cs)cs.addEventListener('click',clearSignalJournal); const ks=$('kapSymbolBtn'); if(ks)ks.addEventListener('click',()=>renderKapNews(($('search').value||'PAPIL').toUpperCase().trim())); const ka=$('kapAllBtn'); if(ka)ka.addEventListener('click',()=>renderKapNews('')); const rc=$('refreshConfidenceBtn'); if(rc)rc.addEventListener('click',runConfidence); const cb=$('committeeBtn'); if(cb)cb.addEventListener('click',runCommittee); const pav=$('portfolioAdviceBtn'); if(pav)pav.addEventListener('click',renderPortfolioAdvice); const pas=$('portfolioAdviceScanBtn'); if(pas)pas.addEventListener('click',async()=>{await scanAll(false);showPage('portfolioAdvice',document.querySelector('[data-page="portfolioAdvice"]'));renderPortfolioAdvice();});},0);$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){$('analyzeBtn').click()}});['showEma20','showEma50','showEma200','showBB','showVWAP'].forEach(id=>{setTimeout(()=>{const el=$(id); if(el) el.addEventListener('change',()=>draw(lastRows));},0)})}
async function loadSymbols(){try{const j=await (await fetch('/api/symbols')).json();syms=j.symbols||[]}catch(e){syms=[]}if(!syms.length)syms=['PAPIL','MRSHL','TEZOL','USAK','VKING','THYAO','AKBNK','GARAN'];$('symbol').innerHTML=syms.map(s=>`<option>${s}</option>`).join('');$('symbol').onchange=e=>{$('search').value=e.target.value;loadStock(true)}}
async function loadStock(verbose=true){const s=$('search').value.toUpperCase().trim()||'PAPIL';$('search').value=s;if(verbose)setStatus(s+' verisi alınıyor...');try{const j=await (await fetch('/api/stock?symbol='+encodeURIComponent(s))).json();if(!j.success)throw new Error(j.error||'Veri yok');renderStock(j);if(verbose)setStatus(s+' Yahoo Finance son verisi ile analiz edildi.')}catch(e){setStatus('Veri alınamadı: '+e.message)}}
function renderStock(j){lastStock=j; const a=j.analysis||{},c=j.comments||{};const cards=[['Karar',a.decision,a.finalScore>=65?'ok':a.finalScore>=50?'warn':'bad'],['Güven','%'+fmt(a.confidence,0),'ok'],['Risk','%'+fmt(a.risk,0),a.risk<50?'ok':'bad'],['Hedef','%'+fmt(((a.target1-a.close)/a.close)*100,1),'ok'],['Son Fiyat',tl(a.close),a.change>=0?'ok':'bad']];$('cards').innerHTML=cards.map(x=>`<div class="card metric"><div class="body"><div class="muted">${x[0]}</div><div class="v ${x[2]}">${x[1]}</div><small>Değişim: ${fmt(a.change)}%</small></div></div>`).join('');$('engine').innerHTML=['trend','money','momentum','pattern','confidence','risk'].map(k=>{const v=a[k]||0;return `<b>${label(k)}: ${fmt(v,0)}/100</b><div class="barw"><div class="bar" style="width:${Math.max(0,Math.min(100,v))}%;background:${k==='risk'?(v<50?'#16a34a':'#dc2626'):(v>65?'#16a34a':v>50?'#f59e0b':'#dc2626')}"></div></div><br>`}).join('')+`<div class="comment"><b>Formasyon:</b> ${a.formation?.name||'-'}<br><b>ADX:</b> ${fmt(a.adx)} | <b>SuperTrend:</b> ${a.superTrendDir===1?'AL':'SAT'}<br><b>Stop:</b> ${tl(a.stop)} | <b>Hedef:</b> ${tl(a.target1)}</div>`;$('expert').textContent=c.expert||aiExpert(a);$('ai').textContent=c.ai||aiComment(a);renderAIEngine(a);renderMultiLayer(a.multiLayer||null,a);draw(a.ohlcv||j.ohlcv||[]);setTimeout(()=>runConfidence(false),80)}
function label(k){return {trend:'Trend',money:'Para Girişi',momentum:'Momentum',pattern:'Formasyon',confidence:'Güven',risk:'Risk'}[k]||k}

function nval(x,d=0){x=Number(x);return Number.isFinite(x)?x:d}
function aiDecisionPack(a){
  a=a||{};
  const trend=nval(a.trend), money=nval(a.money), momentum=nval(a.momentum), pattern=nval(a.pattern), risk=nval(a.risk,60), conf=nval(a.confidence), rr=nval(a.riskReward,50), final=nval(a.finalScore);
  const score=Math.round(final*0.45 + conf*0.20 + trend*0.12 + money*0.10 + momentum*0.08 + pattern*0.05 - Math.max(0,risk-45)*0.25);
  let decision='BEKLE', cls='byellow', tone='Teyit beklenmeli';
  if(score>=82 && risk<55){decision='GÜÇLÜ AL';cls='bgreen';tone='Pozitif görünüm güçlü';}
  else if(score>=68 && risk<65){decision='AL';cls='bgreen';tone='Kademeli alım düşünülebilir';}
  else if(score>=52){decision='İZLE';cls='byellow';tone='Yakın takip / teyit arayışı';}
  else if(score>=38){decision='BEKLE';cls='byellow';tone='Kararsız görünüm';}
  else {decision='RİSKLİ';cls='bred';tone='Uzak dur / risk azalt';}
  return {score:Math.max(0,Math.min(100,score)),decision,cls,tone};
}
function reasonLine(ok,text){return `<div class="kpi"><span>${ok?'✅':'❌'} ${text}</span></div>`}
function renderAIEngine(a){
  a=a||{}; const p=aiDecisionPack(a); const close=nval(a.close), stop=nval(a.stop), t1=nval(a.target1), t2=nval(a.target2);
  const risk=nval(a.risk,60), conf=nval(a.confidence), final=nval(a.finalScore), potential=nval(a.potential);
  const probability=Math.max(5,Math.min(95,Math.round(final*.45+conf*.30+(100-risk)*.15+potential*.10)));
  const expectedReturn=close&&t1?((t1-close)/close)*100:0;
  const rr = (close&&stop&&t1&&close>stop) ? ((t1-close)/(close-stop)) : 0;
  const stopPct = close&&stop ? ((close-stop)/close)*100 : 0;
  const target2Pct = close&&t2 ? ((t2-close)/close)*100 : 0;
  $('aiDecision').innerHTML=`
    <div class="grid g2">
      <div style="text-align:center"><span class="badge ${p.cls}" style="font-size:18px;padding:10px 14px">${p.decision}</span><div class="metric"><div class="v ${p.score>=68?'ok':p.score>=52?'warn':'bad'}">${fmt(p.score,0)}/100</div><div class="muted">AI güven skoru</div></div></div>
      <div class="comment">
        <b>Olasılık:</b> %${fmt(probability,0)}<br>
        <b>Risk puanı:</b> ${fmt(risk,0)}/100<br>
        <b>Beklenen getiri:</b> %${fmt(expectedReturn,1)}<br>
        <b>Risk/Getiri:</b> 1 : ${fmt(rr,2)}
      </div>
    </div>
    <div class="comment"><b>Açıklamalı yorum:</b> ${aiDetailedComment(a,p,probability,expectedReturn,rr)}</div>`;
  const reasons=[];
  reasons.push(reasonLine(nval(a.trend)>=65,`Trend gücü: ${fmt(a.trend,0)}/100`));
  reasons.push(reasonLine(nval(a.money)>=55,`Para girişi: ${fmt(a.money,0)}/100`));
  reasons.push(reasonLine(nval(a.momentum)>=55,`Momentum: ${fmt(a.momentum,0)}/100`));
  reasons.push(reasonLine(nval(a.pattern)>=50,`Formasyon desteği: ${fmt(a.pattern,0)}/100`));
  reasons.push(reasonLine(nval(a.adx)>=25,`ADX trend teyidi: ${fmt(a.adx)}`));
  reasons.push(reasonLine(a.superTrendDir===1,`SuperTrend: ${a.superTrendDir===1?'AL':'SAT'}`));
  reasons.push(reasonLine(nval(a.risk)<=45,`Risk kabul edilebilir: ${fmt(a.risk,0)}/100`));
  reasons.push(reasonLine(rr>=1.5,`Risk/getiri oranı: 1 : ${fmt(rr,2)}`));
  $('aiReasons').innerHTML=reasons.join('')+`<div class="comment"><b>Karar şeffaflığı:</b> Bu karar; güven puanı, risk puanı, olasılık, beklenen getiri, stop/hedef ve teknik teyitlerin birlikte okunmasıyla üretilmiştir.</div>`;
  renderPatternBox(a);
  $('aiRiskPlan').innerHTML=`
    <div class="kpi"><b>Son fiyat</b><span>${tl(close)}</span></div>
    <div class="kpi"><b>Stop</b><span>${tl(stop)} <small>(-%${fmt(stopPct,1)})</small></span></div>
    <div class="kpi"><b>Hedef 1</b><span>${tl(t1)} <small>(+%${fmt(expectedReturn,1)})</small></span></div>
    <div class="kpi"><b>Hedef 2</b><span>${tl(t2)} <small>(+%${fmt(target2Pct,1)})</small></span></div>
    <div class="kpi"><b>Risk/Getiri</b><span>1 : ${fmt(rr,2)}</span></div>
    <div class="comment"><b>İşlem planı:</b> Olasılık ve güven yüksek olsa bile stop seviyesi korunmadan işlem yapılmamalı. Bu ekran yatırım tavsiyesi değil, karar destek aracıdır.</div>`;
}
function aiDetailedComment(a,p,probability,expectedReturn,rr){
  const parts=[];
  parts.push(`Sistem ${p.decision} sonucunu üretiyor; güven ${fmt(p.score,0)}/100, olasılık %${fmt(probability,0)}.`);
  parts.push(nval(a.trend)>=65?'Trend tarafı kararı destekliyor.':'Trend tarafında yeterli güç yok.');
  parts.push(nval(a.money)>=55?'Para girişi/likidite olumlu.':'Para girişi sınırlı; hacim teyidi izlenmeli.');
  parts.push(nval(a.momentum)>=55?'Momentum pozitif.':'Momentum zayıf veya kararsız.');
  parts.push(nval(a.pattern)>=60?`Formasyon tarafı destek veriyor: ${a.formation?.name||'aday yapı'}.`:'Formasyon teyidi zayıf.');
  parts.push(rr>=1.5?'Risk/getiri dengesi kabul edilebilir.':'Risk/getiri dengesi zayıf; hedef-stop oranı iyileşmeli.');
  parts.push(`Beklenen getiri yaklaşık %${fmt(expectedReturn,1)}.`);
  return parts.join(' ');
}

function renderPatternBox(a){
  a=a||{}; const f=a.formation||{}; const rows=(f.detected||[]).length?f.detected:[{name:f.name||'Belirgin formasyon yok',score:nval(a.pattern||f.score||0),confidence:f.confidence||40,targetPct:f.targetPct||0,stopHint:'Teknik stop takip edilmeli',status:'Teyit bekleniyor'}];
  $('patternBox').innerHTML=`<div class="grid g3">${rows.slice(0,3).map(x=>`<div class="comment"><b>${x.name}</b><br>Güven: ${fmt(x.confidence||x.score,0)}/100<br>Formasyon puanı: ${fmt(x.score,0)}/100<br>Hedef potansiyeli: %${fmt(x.targetPct||0,1)}<br><span class="mini">${x.status||''}</span></div>`).join('')}</div><br><div class="sectionTitle">Formasyon Notları</div>${(f.notes||[]).map(n=>`<div class="kpi"><b>•</b><span>${n}</span></div>`).join('')||'<div class="comment">Yeterli formasyon teyidi yok. Kırılım ve hacim teyidi beklenmeli.</div>'}`;
}
function patternList(){return [...scanCache].filter(x=>(x.pattern||0)>=50).sort((a,b)=>(b.pattern||0)-(a.pattern||0)).slice(0,30)}

function aiExpert(a){a=a||{};return `Teknik tablo: trend ${fmt(a.trend,0)}/100, para girişi ${fmt(a.money,0)}/100, momentum ${fmt(a.momentum,0)}/100, risk ${fmt(a.risk,0)}/100. ADX ${fmt(a.adx)} ve SuperTrend ${a.superTrendDir===1?'AL':'SAT'} tarafında görünüyor.`}
function aiComment(a){const p=aiDecisionPack(a||{});return `AI karar motoru bu hisse için ${p.decision} sonucunu üretiyor. AI güven skoru ${fmt(p.score,0)}/100. ${p.tone}. Kapanış teyidi, hedef/stop ve pozisyon büyüklüğü birlikte değerlendirilmelidir.`}

function draw(rows){
  lastRows=(rows||[]).filter(r=>r&&Number.isFinite(Number(r.close))).slice(-220);
  const el=$('candleChart');
  if(!el || !lastRows.length || !window.LightweightCharts){ return drawFallback(lastRows); }
  el.innerHTML='';
  candleChart=LightweightCharts.createChart(el,{height:el.clientHeight||460,layout:{background:{color:'#ffffff'},textColor:'#172033'},grid:{vertLines:{color:'#eef2f7'},horzLines:{color:'#eef2f7'}},rightPriceScale:{borderColor:'#dbe5f3'},timeScale:{borderColor:'#dbe5f3',timeVisible:false,secondsVisible:false}});
  candleSeries=candleChart.addCandlestickSeries({upColor:'#16a34a',downColor:'#dc2626',borderVisible:false,wickUpColor:'#16a34a',wickDownColor:'#dc2626'});
  const ohlc=lastRows.map(r=>({time:r.date,open:+r.open,high:+r.high,low:+r.low,close:+r.close}));
  candleSeries.setData(ohlc);
  lineSeries=[];
  const closes=lastRows.map(r=>+r.close), highs=lastRows.map(r=>+r.high), lows=lastRows.map(r=>+r.low), vols=lastRows.map(r=>+r.volume||0);
  const addLine=(name,arr,color,width=1)=>{const ser=candleChart.addLineSeries({title:name,color,lineWidth:width,priceLineVisible:false,lastValueVisible:true});ser.setData(arr.map((v,i)=>Number.isFinite(v)?{time:lastRows[i].date,value:v}:null).filter(Boolean));lineSeries.push(ser)};
  if($('showEma20')?.checked)addLine('EMA20',calcEma(closes,20),'#145bf5',2);
  if($('showEma50')?.checked)addLine('EMA50',calcEma(closes,50),'#f59e0b',2);
  if($('showEma200')?.checked)addLine('EMA200',calcEma(closes,200),'#7c3aed',2);
  if($('showBB')?.checked){const bb=calcBollinger(closes,20,2);addLine('BB Üst',bb.upper,'#64748b',1);addLine('BB Orta',bb.mid,'#94a3b8',1);addLine('BB Alt',bb.lower,'#64748b',1)}
  if($('showVWAP')?.checked)addLine('VWAP',calcVwap(highs,lows,closes,vols),'#06b6d4',2);
  candleChart.timeScale().fitContent();
  setTimeout(()=>{try{candleChart.applyOptions({height:el.clientHeight||460});candleChart.timeScale().fitContent()}catch(e){}},80);
}
function drawFallback(rows){
  // Lightweight Charts yüklenmezse basit Chart.js fiyat çizgisi çalışır.
  const holder=$('candleChart'); if(!holder)return; holder.innerHTML='<canvas id="chart"></canvas>';
  if(chart)chart.destroy(); const ctx=$('chart'); rows=(rows||[]).slice(-160); if(!rows.length)return;
  chart=new Chart(ctx,{type:'line',data:{labels:rows.map(r=>r.date),datasets:[{label:'Fiyat',data:rows.map(r=>r.close),borderWidth:2,pointRadius:0},{label:'EMA20',data:calcEma(rows.map(r=>r.close),20),borderWidth:1,pointRadius:0},{label:'EMA50',data:calcEma(rows.map(r=>r.close),50),borderWidth:1,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:'Fiyat Grafiği ve Teknik Göstergeler'}}}});
}
function smaArr(a,n){return a.map((_,i)=>i<n-1?NaN:a.slice(i-n+1,i+1).reduce((s,x)=>s+x,0)/n)}
function stdArr(a,n){return a.map((_,i)=>{if(i<n-1)return NaN; const part=a.slice(i-n+1,i+1),m=part.reduce((s,x)=>s+x,0)/n; return Math.sqrt(part.reduce((s,x)=>s+(x-m)*(x-m),0)/n)})}
function calcBollinger(c,n=20,k=2){const mid=smaArr(c,n),sd=stdArr(c,n);return{mid,upper:mid.map((m,i)=>Number.isFinite(m)?m+k*sd[i]:NaN),lower:mid.map((m,i)=>Number.isFinite(m)?m-k*sd[i]:NaN)}}
function calcVwap(h,l,c,v){let pv=0,vol=0;return c.map((x,i)=>{const typical=(h[i]+l[i]+c[i])/3;pv+=typical*(v[i]||0);vol+=(v[i]||0);return vol?pv/vol:NaN})}
function calcEma(a,n){let k=2/(n+1),o=[];a.forEach((v,i)=>o[i]=i?v*k+o[i-1]*(1-k):v);return o}
async function fetchJsonSafe(url){
  const res=await fetch(url,{cache:'no-store'});
  const text=await res.text();
  try{return JSON.parse(text)}catch(e){
    const msg=text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,160)||res.statusText||'Boş yanıt';
    throw new Error('API JSON döndürmedi: '+msg);
  }
}
function setProgress(done,total){
  const pct=total?Math.round((done/total)*100):0;
  const b=$('scanProgressBar'), t=$('scanProgressText');
  if(b)b.style.width=Math.max(0,Math.min(100,pct))+'%';
  if(t)t.textContent=total?`${done}/${total} hisse tarandı (%${pct})`:'Tarama bekleniyor.';
}
async function scanAll(silent=false){
  setStatus('BIST listesi parçalı olarak taranıyor...');
  document.body.classList.add('loading');
  scanCache=[];
  setProgress(0,0);
  try{
    let offset=0,total=null,chunk=4,guard=0;
    while(true){
      const j=await fetchJsonSafe(`/api/scan?limit=${chunk}&offset=${offset}&t=${Date.now()}`);
      if(!j.success) throw new Error(j.error||'API başarısız yanıt verdi');
      total=Number(j.total||0);
      const part=Array.isArray(j.data)?j.data.filter(x=>x&&x.symbol):[];
      scanCache=scanCache.concat(part);
      offset=Number(j.nextOffset ?? (offset+chunk));
      setProgress(Math.min(offset,total||offset), total||offset);
      renderDashboard();
      renderTables();
      if(j.done || !total || offset>=total) break;
      guard++; if(guard>250) throw new Error('Tarama güvenlik sınırına takıldı. Liste çok büyükse tekrar deneyin.');
      await new Promise(r=>setTimeout(r,120));
    }
    scanCache.sort((a,b)=>(Number(b.finalScore)||0)-(Number(a.finalScore)||0));
    renderDashboard();renderTables();
    setStatus(`${scanCache.length} hisse tarandı. En güçlü, güvenli kazanç ve fırsat listeleri güncellendi.`);
  }catch(e){
    setStatus('Tarama hatası: '+e.message);
  }finally{
    document.body.classList.remove('loading');
  }
}
function renderDashboard(){const n=scanCache.length,avg=n?scanCache.reduce((s,x)=>s+(x.finalScore||0),0)/n:0;const safe=safeList(),opp=oppList();$('mCount').textContent=n;$('mAvg').textContent=fmt(avg,0);$('mSafe').textContent=safe.length;$('mOpp').textContent=opp.length;renderMini('dashLeaders',leaderList().slice(0,6));renderMini('dashSafe',safe.slice(0,6));renderMini('dashOpp',opp.slice(0,6));renderMini('dashRisk',riskList().slice(0,6));}
function renderMini(id,rows){$(id).innerHTML=rows.length?rows.map((r,i)=>`<div class="dashItem" onclick="openSymbol('${r.symbol}')"><div class="rank">#${i+1}</div><div><div class="symbol">${r.symbol}</div><div class="mini">${r.decision||'-'} • Risk ${fmt(r.risk,0)}</div></div><div class="score">${fmt(r.finalScore,0)}</div></div>`).join(''):'<div class="comment">Veri bekleniyor.</div>'}
function tableRows(rows){return '<tr><th>#</th><th>Hisse</th><th>Karar</th><th>Skor</th><th>Güven</th><th>Risk</th><th>Trend</th><th>Para</th><th>Momentum</th></tr>'+rows.map((r,i)=>`<tr onclick="openSymbol('${r.symbol}')" style="cursor:pointer"><td>${i+1}</td><td><b>${r.symbol}</b></td><td><span class="badge ${decisionClass(r.decision)}">${r.decision||'-'}</span></td><td>${fmt(r.finalScore,0)}</td><td>${fmt(r.confidence,0)}</td><td><span class="badge ${badgeClass(r.risk,true)}">${fmt(r.risk,0)}</span></td><td>${fmt(r.trend,0)}</td><td>${fmt(r.money,0)}</td><td>${fmt(r.momentum,0)}</td></tr>`).join('')}
function renderTables(){$('leaderTable').innerHTML=tableRows(leaderList());$('safeTable').innerHTML=tableRows(safeList());$('oppTable').innerHTML=tableRows(oppList());$('riskTable').innerHTML=tableRows(riskList());$('patternTable').innerHTML=tableRows(patternList());renderPortfolio();renderPortfolioAdvice();renderDailyReport()}
function leaderList(){return [...scanCache].sort((a,b)=>(b.finalScore||0)-(a.finalScore||0)).slice(0,20)}
function safeList(){return [...scanCache].filter(x=>(x.risk||100)<45&&(x.confidence||0)>=55&&(x.finalScore||0)>=50).sort((a,b)=>(b.confidence-b.risk)-(a.confidence-a.risk)).slice(0,20)}
function oppList(){return [...scanCache].filter(x=>(x.finalScore||0)>=45&&((x.money||0)>=45||(x.momentum||0)>=50||(x.pattern||0)>=55)).sort((a,b)=>((b.finalScore||0)+(b.money||0)+(b.momentum||0))-((a.finalScore||0)+(a.money||0)+(a.momentum||0))).slice(0,20)}
function riskList(){return [...scanCache].filter(x=>(x.risk||0)>=55||(x.finalScore||0)<35).sort((a,b)=>(b.risk||0)-(a.risk||0)).slice(0,20)}
function openSymbol(s){$('search').value=s;showPage('analysis',document.querySelector('[data-page="analysis"]'));loadStock(true)}

function loadPortfolioLocal(){try{const raw=localStorage.getItem('bistRadarPortfolio');const arr=raw?JSON.parse(raw):null;return Array.isArray(arr)&&arr.length?arr:defaultPortfolio}catch(e){return defaultPortfolio}}
function savePortfolio(){localStorage.setItem('bistRadarPortfolio',JSON.stringify(portfolio))}
function addOrUpdatePortfolio(){const sym=($('pfSymbol').value||'').toUpperCase().trim();if(!sym){setStatus('Hisse kodu girin.');return;}const lot=Number($('pfLot').value||0), cost=Number($('pfCost').value||0);const i=portfolio.findIndex(p=>p.symbol===sym);const item={symbol:sym,lot:lot||0,cost:cost||0};if(i>=0)portfolio[i]=item;else portfolio.push(item);savePortfolio();renderPortfolio();setStatus(sym+' portföye eklendi/güncellendi.')}
function removePortfolio(sym){portfolio=portfolio.filter(p=>p.symbol!==sym);savePortfolio();renderPortfolio();setStatus(sym+' portföyden çıkarıldı.')}
function renderPortfolio(){const rows=portfolio.map(p=>{const live=scanCache.find(x=>x.symbol===p.symbol)||{};return {...p,...live}});const health=rows.length?rows.reduce((s,x)=>s+(x.finalScore||45),0)/rows.length:0;const best=[...rows].sort((a,b)=>(b.finalScore||0)-(a.finalScore||0))[0]||{};const weakest=[...rows].sort((a,b)=>(a.finalScore||0)-(b.finalScore||0))[0]||{};$('portfolioBox').innerHTML=`<b>Portföy Sağlık Skoru:</b> ${fmt(health,0)}/100<br><b>En güçlü:</b> ${best.symbol||'-'} (${fmt(best.finalScore,0)})<br><b>En zayıf halka:</b> ${weakest.symbol||'-'} (${fmt(weakest.finalScore,0)})<br><span class="mini">Veriler tarama yapıldıkça güncellenir. Portföy tarayıcı hafızasına kaydedilir.</span>`;$('portfolioTable').innerHTML='<tr><th>Hisse</th><th>Lot</th><th>Maliyet</th><th>Karar</th><th>Skor</th><th>Risk</th><th>İşlem</th></tr>'+rows.map(r=>`<tr><td onclick="openSymbol('${r.symbol}')" style="cursor:pointer"><b>${r.symbol}</b></td><td>${fmt(r.lot,0)}</td><td>${tl(r.cost)}</td><td>${r.decision||'Taranmadı'}</td><td>${fmt(r.finalScore,0)}</td><td>${fmt(r.risk,0)}</td><td><button class="btn red" onclick="removePortfolio('${r.symbol}')">Sil</button></td></tr>`).join('');$('portfolioAi').innerHTML=`${health>=70?'Portföy genel görünümü güçlü.':'Portföy için seçici davranmak gerekir.'} ${weakest.symbol?`Zayıf halka ${weakest.symbol}; risk/karar teyidi izlenmeli.`:''} ${best.symbol?`En güçlü aday ${best.symbol}.`:''}`;}
async function renderKapNews(symbol=''){
  const target = symbol || (($('search')?.value||'').toUpperCase().trim());
  const url = '/api/kap?limit=10' + (symbol ? '&symbol='+encodeURIComponent(symbol) : '');
  const loading = `<b>KAP/Haber verisi alınıyor...</b><br>${target?target:'Genel piyasa'} için haber etki analizi hazırlanıyor.`;
  if($('kapNewsBox')) $('kapNewsBox').innerHTML = loading;
  if($('dashKapBox')) $('dashKapBox').innerHTML = loading;
  try{
    const j = await fetchJsonSafe(url+'&t='+Date.now());
    const items = Array.isArray(j.items)?j.items:[];
    const sentimentText = `${j.positive||0} olumlu / ${j.negative||0} olumsuz / ${j.neutral||0} nötr`;
    const htmlRows = items.length ? items.map(x=>`<tr><td><b>${x.date||'-'}</b></td><td>${x.symbol||'-'}</td><td>${x.title||'-'}<br><span class="mini">${x.summary||''}</span></td><td><span class="badge ${x.sentiment==='Pozitif'?'bgreen':x.sentiment==='Negatif'?'bred':'byellow'}">${x.sentiment||'Nötr'}</span></td><td>${fmt(x.impactScore||50,0)}</td></tr>`).join('') : '<tr><td colspan="5">Kayıt yok.</td></tr>';
    const summary = `<b>Kaynak:</b> ${j.source||'KAP/Haber'}<br><b>AI Etki Skoru:</b> ${fmt(j.avgImpact||50,0)}/100<br><b>Duyarlılık:</b> ${sentimentText}<br><b>AI Yorumu:</b> ${j.summary||'-'}<br><span class="mini">${j.note||''}</span>`;
    if($('kapCount')) $('kapCount').textContent = fmt(j.count||0,0);
    if($('kapImpact')) $('kapImpact').textContent = fmt(j.avgImpact||50,0);
    if($('kapSentiment')) $('kapSentiment').textContent = (j.avgImpact||50)>=62?'Olumlu':(j.avgImpact||50)<=42?'Olumsuz':'Nötr';
    if($('kapSummaryBox')) $('kapSummaryBox').innerHTML = summary;
    if($('kapAiBox')) $('kapAiBox').innerHTML = `<b>Haber/KAP etkisi:</b><br>${j.summary||'-'}<br><br><b>Karar desteği:</b> Pozitif haberler teknik skoru destekler; negatif haberler stop ve pozisyon büyüklüğü konusunda uyarı üretir.`;
    if($('kapTable')) $('kapTable').innerHTML = '<tr><th>Tarih</th><th>Hisse</th><th>Bildirim / Haber</th><th>Duyarlılık</th><th>Etki</th></tr>'+htmlRows;
    if($('kapNewsBox')) $('kapNewsBox').innerHTML = summary;
    if($('dashKapBox')) $('dashKapBox').innerHTML = summary;
  }catch(e){
    const msg='KAP/Haber hatası: '+e.message;
    if($('kapNewsBox')) $('kapNewsBox').textContent = msg;
    if($('dashKapBox')) $('dashKapBox').textContent = msg;
    if($('kapSummaryBox')) $('kapSummaryBox').textContent = msg;
  }
}

function layerClass(v){v=nval(v,0);return v>=70?'ok':v>=50?'warn':'bad'}
function renderMultiLayer(ml,a={}){
  if(!ml){
    const fallback={layers:[
      {name:'Trend',score:nval(a.trend),comment:'Teknik trend puanı'},
      {name:'Momentum',score:nval(a.momentum),comment:'RSI/MACD/ROC bileşimi'},
      {name:'Para Girişi',score:nval(a.money),comment:'Hacim ve OBV bileşimi'},
      {name:'Formasyon',score:nval(a.pattern),comment:a.formation?.name||'Formasyon puanı'},
      {name:'Haber/KAP',score:50,comment:'Güncelleme bekleniyor'},
      {name:'Backtest',score:50,comment:'Güncelleme bekleniyor'},
      {name:'AI Genel',score:nval(a.finalScore),comment:'Teknik motor skoru'}
    ], aiGeneral:nval(a.finalScore), decision:a.decision||'-', risk:nval(a.risk,0), summary:'Çok katmanlı güven puanı güncelleniyor.'};
    ml=fallback;
  }
  const rows=(ml.layers||[]).map(x=>`<div class="layerRow"><b>${x.name}</b><div><div class="barw"><div class="bar" style="width:${Math.max(0,Math.min(100,nval(x.score)))}%;background:${nval(x.score)>=70?'#16a34a':nval(x.score)>=50?'#f59e0b':'#dc2626'}"></div></div><div class="layerSmall">${x.comment||''}${x.weight?` • Ağırlık: %${x.weight}`:''}</div></div><div class="layerScore ${layerClass(x.score)}">${fmt(x.score,0)}</div></div>`).join('');
  const html=`<div class="comment"><b>${ml.summary||''}</b></div><br>${rows}<br><div class="grid g2"><div class="comment"><b>Güçlü katmanlar</b><br>${(ml.positives||[]).length?(ml.positives||[]).map(x=>'✅ '+x).join('<br>'):'Belirgin güçlü katman yok.'}</div><div class="comment"><b>Zayıf / dikkat katmanları</b><br>${(ml.warnings||[]).length?(ml.warnings||[]).map(x=>'⚠️ '+x).join('<br>'):'Kritik zayıflık yok.'}</div></div>`;
  if($('multiLayerBox'))$('multiLayerBox').innerHTML=html;
  if($('mlTableBox'))$('mlTableBox').innerHTML=html;
  if($('mlGeneral'))$('mlGeneral').textContent=fmt(ml.aiGeneral,0);
  if($('mlDecision'))$('mlDecision').textContent=ml.decision||'-';
  if($('mlRisk'))$('mlRisk').textContent=fmt(ml.risk,0);
  if($('mlComment'))$('mlComment').innerHTML=`<b>Karar Şeffaflığı:</b><br>${ml.summary||'-'}<br><br><b>Yorum:</b> Tek başına AL/SAT yerine, hangi katmanın kararı güçlendirdiği ve hangi katmanın zayıflattığı açıkça gösterilir. Haber/KAP ve Backtest puanı güncellendikçe AI Genel skoru da değişir.`;
}
async function runConfidence(show=true){
  const s=($('search')?.value||'PAPIL').toUpperCase().trim();
  if(show)showPage('confidencePage',document.querySelector('[data-page="confidencePage"]'));
  try{
    if(show)setStatus(s+' için çok katmanlı güven puanı hesaplanıyor...');
    const j=await fetchJsonSafe('/api/confidence?symbol='+encodeURIComponent(s)+'&t='+Date.now());
    if(!j.success)throw new Error(j.error||'Güven puanı alınamadı');
    renderMultiLayer(j.multiLayer||null,{});
    if(show)setStatus(s+' çok katmanlı güven puanı güncellendi.');
  }catch(e){
    if($('mlComment'))$('mlComment').textContent='Çok katmanlı güven hatası: '+e.message;
    if(show)setStatus('Çok katmanlı güven hatası: '+e.message);
  }
}


function rrScore(x){x=x||{};const target=Number(x.target1&&x.close?((x.target1-x.close)/x.close)*100:0);const stop=Number(x.stop&&x.close?((x.close-x.stop)/x.close)*100:5);return Math.max(0,Math.min(100,(target*12)/(Math.max(stop,1))))}
function dailyTradeList(){return [...scanCache].filter(x=>(x.money||0)>=45&&(x.momentum||0)>=45&&(x.risk||100)<=60&&(x.finalScore||0)>=45).sort((a,b)=>((b.money||0)+(b.momentum||0)+rrScore(b))-((a.money||0)+(a.momentum||0)+rrScore(a))).slice(0,8)}
function weeklyPortfolioList(){return [...scanCache].filter(x=>(x.finalScore||0)>=55&&(x.confidence||0)>=55&&(x.risk||100)<=55).sort((a,b)=>((b.finalScore||0)+(b.trend||0)+(b.confidence||0)-(b.risk||0))-((a.finalScore||0)+(a.trend||0)+(a.confidence||0)-(a.risk||0))).slice(0,7)}
function monthlyPortfolioList(){return [...scanCache].filter(x=>(x.trend||0)>=55&&(x.confidence||0)>=55&&(x.risk||100)<=50).sort((a,b)=>((b.trend||0)*1.2+(b.confidence||0)+(b.finalScore||0)-(b.risk||0)*1.1)-((a.trend||0)*1.2+(a.confidence||0)+(a.finalScore||0)-(a.risk||0)*1.1)).slice(0,8)}
function recTable(rows,mode){if(!rows.length)return '<tr><td>Öneri üretmek için önce tüm hisse taraması yapın.</td></tr>';return '<tr><th>#</th><th>Hisse</th><th>Karar</th><th>Güven</th><th>Risk</th><th>Bek. Getiri</th><th>Stop</th><th>Ağırlık</th></tr>'+rows.map((r,i)=>{const exp=r.close&&r.target1?((r.target1-r.close)/r.close)*100:(r.potential||0)/4;const stop=r.close&&r.stop?((r.close-r.stop)/r.close)*100:Math.max(2,(r.risk||40)/12);const w=mode==='daily'?Math.max(5,Math.round(100/Math.max(rows.length,1))):Math.max(6,Math.round((r.confidence||50)/(rows.reduce((s,x)=>s+(x.confidence||50),0)||1)*90));return `<tr onclick="openSymbol('${r.symbol}')" style="cursor:pointer"><td>${i+1}</td><td><b>${r.symbol}</b></td><td><span class="badge ${decisionClass(r.decision)}">${r.decision||'-'}</span></td><td>${fmt(r.confidence,0)}</td><td>${fmt(r.risk,0)}</td><td>%${fmt(exp,1)}</td><td>-%${fmt(stop,1)}</td><td>%${w}</td></tr>`}).join('')}
function portfolioRevisionRows(){const rows=portfolio.map(p=>{const live=scanCache.find(x=>x.symbol===p.symbol)||{};const action=(live.finalScore||0)>=65?'Tut / Güçlü':(live.finalScore||0)>=50?'İzle / Kademeli':(live.risk||0)>60?'Azalt / Stop izle':'Bekle';const note=(live.risk||0)>65?'Risk yüksek':(live.confidence||0)>=65?'Güven iyi':'Teyit beklenmeli';return {...p,...live,action,note}});return rows.length?'<tr><th>Hisse</th><th>Mevcut Karar</th><th>Öneri</th><th>Risk</th><th>Not</th></tr>'+rows.map(r=>`<tr><td><b>${r.symbol}</b></td><td>${r.decision||'Taranmadı'}</td><td>${r.action}</td><td>${fmt(r.risk,0)}</td><td>${r.note}</td></tr>`).join(''):'<tr><td>Portföy boş.</td></tr>'}
function renderAllocation(daily,weekly,monthly){const health=portfolio.length?portfolio.map(p=>scanCache.find(x=>x.symbol===p.symbol)||{}).reduce((s,x)=>s+(x.finalScore||45),0)/portfolio.length:55;const avgRisk=scanCache.length?scanCache.reduce((s,x)=>s+(x.risk||50),0)/scanCache.length:50;const cash=avgRisk>60?30:health<50?25:15;const buckets=[['Günlük Trade',Math.max(10,Math.min(25,100-cash-55))],['Haftalık Portföy',35],['Aylık Portföy',100-cash-35-Math.max(10,Math.min(25,100-cash-55))],['Nakit',cash]];$('allocationBox').innerHTML=`<b>AI Dağılım Yorumu:</b><br>Piyasa ortalama riski ${fmt(avgRisk,0)}/100. Portföy sağlık skoru ${fmt(health,0)}/100. Bu nedenle nakit tamponu yaklaşık <b>%${cash}</b> önerilir. Günlük trade sepeti kısa vadeli fırsat, haftalık sepet ana taşıma, aylık sepet daha sakin denge bölümü olarak düşünülmelidir.`;$('allocationTable').innerHTML='<tr><th>Bölüm</th><th>Önerilen Ağırlık</th><th>Açıklama</th></tr>'+buckets.map(b=>`<tr><td><b>${b[0]}</b></td><td>%${b[1]}</td><td>${b[0]==='Nakit'?'Risk tamponu':b[0]==='Günlük Trade'?'Kısa vadeli fırsat':'Taşıma portföyü'}</td></tr>`).join('')}
function renderPortfolioAdvice(){const daily=dailyTradeList(), weekly=weeklyPortfolioList(), monthly=monthlyPortfolioList();if($('paDailyCount')){$('paDailyCount').textContent=daily.length;$('paWeeklyCount').textContent=weekly.length;$('paMonthlyCount').textContent=monthly.length;}const avgRisk=scanCache.length?scanCache.reduce((s,x)=>s+(x.risk||50),0)/scanCache.length:50;const cash=avgRisk>60?30:avgRisk>50?20:15;if($('paCash'))$('paCash').textContent='%'+cash;if($('dailyTradeTable'))$('dailyTradeTable').innerHTML=recTable(daily,'daily');if($('weeklyPortfolioTable'))$('weeklyPortfolioTable').innerHTML=recTable(weekly,'weekly');if($('monthlyPortfolioTable'))$('monthlyPortfolioTable').innerHTML=recTable(monthly,'monthly');if($('portfolioRevisionTable'))$('portfolioRevisionTable').innerHTML=portfolioRevisionRows();renderAllocation(daily,weekly,monthly);const d=daily.slice(0,3).map(x=>x.symbol).join(', ')||'-',w=weekly.slice(0,3).map(x=>x.symbol).join(', ')||'-',m=monthly.slice(0,3).map(x=>x.symbol).join(', ')||'-';if($('portfolioCoach'))$('portfolioCoach').innerHTML=`<b>AI Portföy Koçu:</b><br>Günlük trade için öne çıkanlar: <b>${d}</b>.<br>Haftalık taşıma için öne çıkanlar: <b>${w}</b>.<br>Aylık daha dengeli sepet için öne çıkanlar: <b>${m}</b>.<br><br><b>Uyarı:</b> Bu ekran yatırım tavsiyesi değil, teknik göstergelere dayalı karar destek/simülasyon ekranıdır. Her hisse için stop ve pozisyon büyüklüğü ayrıca kontrol edilmelidir.`}

function renderDailyReport(){if(!scanCache.length){$('dailyReportBox').innerHTML='Önce tarama yapın. Ana kontrol panelindeki tarama tamamlanınca rapor otomatik oluşur.';return;}const strong=leaderList().slice(0,10), risk=riskList().slice(0,10), pats=patternList().slice(0,10), money=[...scanCache].sort((a,b)=>(b.money||0)-(a.money||0)).slice(0,10);const mini=rows=>rows.length?rows.map((r,i)=>`<div class="dashItem" onclick="openSymbol('${r.symbol}')"><div class="rank">#${i+1}</div><div><div class="symbol">${r.symbol}</div><div class="mini">${r.decision||'-'} • Skor ${fmt(r.finalScore,0)} • Risk ${fmt(r.risk,0)}</div></div><div class="score">${fmt(r.confidence||r.money||0,0)}</div></div>`).join(''):'<div class="comment">Veri yok.</div>';$('reportStrong').innerHTML=mini(strong);$('reportRisk').innerHTML=mini(risk);$('reportPatterns').innerHTML=mini(pats);$('reportMoney').innerHTML=mini(money);const avg=scanCache.reduce((s,x)=>s+(x.finalScore||0),0)/scanCache.length;$('dailyReportBox').innerHTML=`<b>Bugünün AI Özeti:</b><br>${scanCache.length} hisse tarandı. Ortalama piyasa skoru ${fmt(avg,0)}/100. En güçlü adaylar ${strong.slice(0,3).map(x=>x.symbol).join(', ')||'-'}. Riskli tarafta ${risk.slice(0,3).map(x=>x.symbol).join(', ')||'-'} öne çıkıyor.<br><br><b>Yorum:</b> Güvenli kazanç için risk düşük, trend ve güven skoru yüksek hisseler; fırsat avcısı için para girişi ve formasyon skoru yüksek hisseler izlenmeli.`;renderKapNews();}


function renderBacktest(j){
  if(!j||!j.success){$('btSummary').textContent='Backtest hatası: '+(j&&j.error?j.error:'Veri alınamadı');return;}
  const s=j.summary||{}, by=j.byDecision||{}, yy=j.byYear||{};
  $('btSignals').textContent=fmt(s.totalSignals||0,0);
  $('btSuccess').textContent='%'+fmt(s.successRate||0,1);
  $('btAvg').textContent='%'+fmt(s.avgReturn||0,2);
  if($('btHold'))$('btHold').textContent=fmt(s.avgHoldingDays||0,1);
  if($('btRR'))$('btRR').textContent=fmt(s.riskReward||0,2);
  $('btSummary').innerHTML=`<b>${j.symbol}</b> için ${j.period} günlük ileri test.<br>
  Test aralığı: <b>${s.startDate||'-'} / ${s.endDate||'-'}</b><br>
  Toplam sinyal: <b>${fmt(s.totalSignals,0)}</b><br>
  Başarılı: <b>${fmt(s.successCount,0)}</b><br>
  Başarı oranı: <b>%${fmt(s.successRate,1)}</b><br>
  Ortalama getiri: <b>%${fmt(s.avgReturn,2)}</b><br>
  Ortalama bekleme süresi: <b>${fmt(s.avgHoldingDays,1)} gün</b><br>
  Maksimum düşüş: <b>%${fmt(s.maxDrawdown,2)}</b><br>
  Ortalama risk/getiri: <b>${fmt(s.riskReward,2)}</b><br>
  En iyi / en kötü: <b>%${fmt(s.bestReturn,2)} / %${fmt(s.worstReturn,2)}</b>`;
  $('btDecisionTable').innerHTML='<tr><th>Karar</th><th>Sinyal</th><th>Başarı</th><th>Başarı %</th><th>Ort. Getiri</th><th>Ort. Bekleme</th><th>Max DD</th><th>Risk/Getiri</th></tr>'+Object.keys(by).map(k=>`<tr><td><b>${k}</b></td><td>${fmt(by[k].count,0)}</td><td>${fmt(by[k].success,0)}</td><td>%${fmt(by[k].successRate,1)}</td><td>%${fmt(by[k].avgReturn,2)}</td><td>${fmt(by[k].avgHoldingDays,1)} gün</td><td>%${fmt(by[k].avgDrawdown,2)}</td><td>${fmt(by[k].avgRiskReward,2)}</td></tr>`).join('')+
  '<tr><th colspan="8">Yıllara Göre Özet</th></tr>'+Object.keys(yy).sort().map(y=>`<tr><td><b>${y}</b></td><td>${fmt(yy[y].count,0)}</td><td>${fmt(yy[y].success,0)}</td><td>%${fmt(yy[y].successRate,1)}</td><td>%${fmt(yy[y].avgReturn,2)}</td><td>${fmt(yy[y].avgHoldingDays,1)} gün</td><td>%${fmt(yy[y].avgDrawdown,2)}</td><td>${fmt(yy[y].avgRiskReward,2)}</td></tr>`).join('');
  const good=(s.successRate||0)>=65, mid=(s.successRate||0)>=52;
  const rrGood=(s.riskReward||0)>=1.5;
  $('btAiComment').innerHTML=`<b>AI Backtest Yorumu:</b><br>${good?'Bu sinyal yapısı geçmiş örneklerde güçlü başarı oranı göstermiş.':mid?'Bu sinyal yapısı orta düzeyde tutarlı. Ek teyitlerle kullanılmalı.':'Bu sinyal yapısı geçmişte zayıf kalmış. Tek başına kullanılmamalı.'}<br><br>${rrGood?'Risk/getiri oranı kabul edilebilir seviyede.':'Risk/getiri oranı düşük; hedef/stop dengesi iyileştirilmeli.'}<br><br><b>Not:</b> Backtest geçmiş veriye dayanır; geleceği garanti etmez. Kapanış teyidi, stop ve pozisyon büyüklüğü ile birlikte değerlendirilmelidir.`;
}

function renderLearning(j){
  const l=j&&j.learning?j.learning:null;
  if(!l||!j.success){$('learningComment').textContent='Öğrenen AI hatası: '+(j&&j.error?j.error:'Veri alınamadı');return;}
  $('learnSamples').textContent=fmt(l.summary.totalSamples||l.summary.count||0,0);
  $('learnSuccess').textContent='%'+fmt(l.summary.successRate,1);
  if($('learn5Success')) $('learn5Success').textContent='%'+fmt((l.horizons&&l.horizons['5g']?l.horizons['5g'].successRate:0),1);
  if($('learn20Success')) $('learn20Success').textContent='%'+fmt((l.horizons&&l.horizons['20g']?l.horizons['20g'].successRate:0),1);
  if($('learnAdj')) { const adj=Number(l.confidenceAdjustment||0); $('learnAdj').textContent=(adj>=0?'+':'')+fmt(adj,1); $('learnAdj').className='v '+(adj>=2?'ok':adj<=-2?'bad':'warn'); }
  if($('learnAvg')) $('learnAvg').textContent='%'+fmt(l.summary.avgReturn,2);
  $('learningComment').innerHTML='<b>'+j.symbol+' Öğrenen AI Lite:</b><br>'+l.comment+'<br><br><b>Yorum:</b> Bu modül, 5/20/30 günlük geçmiş sinyal sonuçlarını değerlendirir; güven puanına küçük bir öğrenme düzeltmesi önerir. Geçmiş performans geleceği garanti etmez.';
  const yearly=Object.entries(l.yearly||{}).sort((a,b)=>a[0].localeCompare(b[0]));
  $('learnYearTable').innerHTML='<tr><th>Yıl</th><th>Sinyal</th><th>Başarı</th><th>Ort. Getiri</th></tr>'+yearly.map(([y,r])=>`<tr><td><b>${y}</b></td><td>${r.count}</td><td>%${fmt(r.successRate,1)}</td><td>%${fmt(r.avgReturn,2)}</td></tr>`).join('');
  $('learnRuleTable').innerHTML='<tr><th>Kural</th><th>Örnek</th><th>Başarı</th><th>Ort. Getiri</th></tr>'+(l.topRules||[]).map(r=>`<tr><td><b>${r.name}</b></td><td>${r.count}</td><td>%${fmt(r.successRate,1)}</td><td>%${fmt(r.avgReturn,2)}</td></tr>`).join('');
  $('learnWeakTable').innerHTML='<tr><th>Zayıf Kural</th><th>Örnek</th><th>Başarı</th><th>Uyarı</th></tr>'+(l.weakRules||[]).map(r=>`<tr><td><b>${r.name}</b></td><td>${r.count}</td><td>%${fmt(r.successRate,1)}</td><td>Tek başına kullanılmamalı</td></tr>`).join('');
  const dec=Object.entries(l.decisions||{}).sort((a,b)=>(b[1].successRate||0)-(a[1].successRate||0));
  $('learnDecisionTable').innerHTML='<tr><th>Karar</th><th>Sinyal</th><th>Başarı</th><th>Ort. Getiri</th></tr>'+dec.map(([d,r])=>`<tr><td><span class="badge ${decisionClass(d)}">${d}</span></td><td>${r.count}</td><td>%${fmt(r.successRate,1)}</td><td>%${fmt(r.avgReturn,2)}</td></tr>`).join('');
}

function signalJournal(){try{return JSON.parse(localStorage.getItem('bistSignalJournalV1')||'[]')}catch(e){return []}}
function setSignalJournal(arr){localStorage.setItem('bistSignalJournalV1',JSON.stringify(arr.slice(-250)))}
function saveCurrentSignal(){
  const a=lastStock&&lastStock.analysis?lastStock.analysis:null; const symbol=(lastStock&&lastStock.symbol)||($('search').value||'').toUpperCase().trim();
  if(!a||!symbol){setStatus('Kaydedilecek sinyal yok. Önce hisse analizi yapın.');return;}
  const item={id:Date.now(), savedAt:new Date().toISOString(), symbol, date:a.date, decision:a.decision, score:Math.round(a.finalScore||0), confidence:Math.round(a.confidence||0), risk:Math.round(a.risk||0), price:Number(a.close||0), stop:Number(a.stop||0), target:Number(a.target1||0), note:'Yerel kayıt'};
  const arr=signalJournal(); arr.push(item); setSignalJournal(arr); renderSignalJournal(); setStatus(symbol+' sinyali Öğrenen AI yerel hafızasına kaydedildi.');
}
function clearSignalJournal(){if(!confirm('Yerel sinyal hafızası temizlensin mi?'))return; localStorage.removeItem('bistSignalJournalV1'); renderSignalJournal(); setStatus('Yerel sinyal hafızası temizlendi.')}
function renderSignalJournal(){
  const el=$('signalJournalTable'); if(!el)return; const arr=signalJournal().slice().reverse();
  if(!arr.length){el.innerHTML='<tr><td>Henüz yerel sinyal kaydı yok.</td></tr>';return;}
  el.innerHTML='<tr><th>Tarih</th><th>Hisse</th><th>Karar</th><th>Skor</th><th>Güven</th><th>Risk</th><th>Fiyat</th><th>Stop</th><th>Hedef</th></tr>'+arr.slice(0,30).map(x=>`<tr><td>${String(x.savedAt).slice(0,10)}</td><td><b>${x.symbol}</b></td><td><span class="badge ${decisionClass(x.decision)}">${x.decision}</span></td><td>${fmt(x.score,0)}</td><td>%${fmt(x.confidence,0)}</td><td>%${fmt(x.risk,0)}</td><td>${tl(x.price)}</td><td>${tl(x.stop)}</td><td>${tl(x.target)}</td></tr>`).join('');
}

async function runLearning(){
  const s=$('search').value.toUpperCase().trim()||'PAPIL';
  showPage('learningPage',document.querySelector('[data-page="learningPage"]'));
  $('learningComment').textContent=s+' için Öğrenen AI geçmiş sinyalleri inceliyor...';
  try{
    const j=await fetchJsonSafe('/api/learning?symbol='+encodeURIComponent(s)+'&period=30&t='+Date.now());
    renderLearning(j);
    setStatus(s+' Öğrenen AI analizi tamamlandı.');
  }catch(e){
    $('learningComment').textContent='Öğrenen AI hatası: '+e.message;
    setStatus('Öğrenen AI hatası: '+e.message);
  }
}

async function runBacktest(){
  const s=$('search').value.toUpperCase().trim()||'PAPIL';
  showPage('backtestPage',document.querySelector('[data-page="backtestPage"]'));
  $('btSummary').textContent=s+' backtest yapılıyor...';
  try{const j=await (await fetch('/api/backtest?symbol='+encodeURIComponent(s)+'&period=30&years=10&mode=stats')).json();renderBacktest(j)}catch(e){$('btSummary').textContent='Backtest hatası: '+e.message}
}
async function runPortfolioBacktest(){
  showPage('backtestPage',document.querySelector('[data-page="backtestPage"]'));
  $('btPortfolioTable').innerHTML='<tr><td>Portföy backtest yapılıyor...</td></tr>';
  const out=[];
  for(const p of portfolio){
    try{const j=await (await fetch('/api/backtest?symbol='+encodeURIComponent(p.symbol)+'&period=30&years=10&mode=stats')).json();out.push({symbol:p.symbol,success:j.summary?.successRate||0,avg:j.summary?.avgReturn||0,signals:j.summary?.totalSignals||0})}catch(e){out.push({symbol:p.symbol,error:e.message,success:0,avg:0,signals:0})}
  }
  $('btPortfolioTable').innerHTML='<tr><th>Hisse</th><th>Sinyal</th><th>Başarı %</th><th>Ort. Getiri</th></tr>'+out.map(x=>`<tr><td><b>${x.symbol}</b></td><td>${fmt(x.signals,0)}</td><td>%${fmt(x.success,1)}</td><td>%${fmt(x.avg,2)}</td></tr>`).join('');
  const avg=out.length?out.reduce((s,x)=>s+x.success,0)/out.length:0;
  $('btAiComment').innerHTML=`<b>Portföy Backtest Özeti:</b><br>Ortalama başarı oranı: <b>%${fmt(avg,1)}</b><br>${avg>=60?'Portföy sinyal kalitesi geçmişte kabul edilebilir görünmektedir.':'Portföy sinyal kalitesi zayıf; hisse bazlı teyitleri güçlendirmek gerekir.'}`;
}


function renderCommittee(c){
  if(!c){return;}
  if($('committeeDecision')) $('committeeDecision').textContent=(c.icon||'')+' '+(c.finalDecision||'-');
  if($('committeeScore')) $('committeeScore').textContent=fmt(c.finalScore,0)+'/100';
  if($('committeeAgreement')) $('committeeAgreement').textContent=fmt(c.agreement,0)+'/100';
  const experts=c.experts||[];
  if($('committeeTable')) $('committeeTable').innerHTML='<tr><th>Uzman</th><th>Görüş</th><th>Puan</th><th>Gerekçe</th></tr>'+experts.map(e=>`<tr><td><b>${e.icon||''} ${e.name}</b></td><td><span class="badge ${decisionClass(e.view)}">${e.view}</span></td><td><b>${fmt(e.score,0)}</b></td><td>${e.reason||''}</td></tr>`).join('');
  if($('committeeBox')) $('committeeBox').innerHTML=`<b>${c.symbol} Komite Yorumu:</b><br>${c.committeeComment||''}<br><br><b>Güçlü görüşler:</b><br>${(c.positives||[]).length?(c.positives||[]).map(x=>'✅ '+x).join('<br>'):'Belirgin güçlü uzman görüşü yok.'}<br><br><b>Dikkat görüşleri:</b><br>${(c.warnings||[]).length?(c.warnings||[]).map(x=>'⚠️ '+x).join('<br>'):'Kritik zayıf uzman görüşü yok.'}`;
  if($('principlesBox')) $('principlesBox').innerHTML=`<b>1) ${c.explainableAI?.title||'Açıklanabilir AI'}</b><br>${c.explainableAI?.summary||''}<br>${(c.explainableAI?.reasons||[]).map(x=>'• '+x).join('<br>')}<br><br><b>2) ${c.learningSystem?.title||'Öğrenen Sistem'}</b><br>${c.learningSystem?.summary||''}<br>Başarı: %${fmt(c.learningSystem?.successRate||0,1)} • Güven düzeltmesi: ${fmt(c.learningSystem?.confidenceAdjustment||0,1)}<br><br><b>3) ${c.performanceTracking?.title||'Performans Takibi'}</b><br>${c.performanceTracking?.summary||''}<br>${c.performanceTracking?.measured||''}`;
}
async function runCommittee(){
  const s=($('search')?.value||'PAPIL').toUpperCase().trim();
  showPage('committeePage',document.querySelector('[data-page="committeePage"]'));
  if($('committeeBox')) $('committeeBox').textContent=s+' için AI Yatırım Komitesi çalışıyor...';
  try{
    const j=await fetchJsonSafe('/api/committee?symbol='+encodeURIComponent(s)+'&t='+Date.now());
    if(!j.success) throw new Error(j.error||'Komite yanıtı alınamadı');
    renderCommittee(j.committee);
    setStatus(s+' AI Yatırım Komitesi tamamlandı.');
  }catch(e){
    if($('committeeBox')) $('committeeBox').textContent='AI Yatırım Komitesi hatası: '+e.message;
    setStatus('AI Yatırım Komitesi hatası: '+e.message);
  }
}

window.addEventListener('error',e=>{setStatus('Uygulama hatası: '+e.message);console.error(e.error||e.message);return true});
init();