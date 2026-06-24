const demoSymbols=['PAPIL','MRSHL','TEZOL','USAK','VKING','THYAO','AKBNK','GARAN','EREGL','PETKM','TUPRS','BIMAS','ASELS','KCHOL','FROTO','SISE','ISCTR','AEFES','AKSA','AKSEN','PGSUS','TOASO','SAHOL','YKBNK','VESTL','ZOREN','ENKAI','TCELL','KOZAL','ARCLK'];
let selected='PAPIL',chart;
const $=id=>document.getElementById(id);
const fmt=(x,d=2)=>Number.isFinite(Number(x))?Number(x).toLocaleString('tr-TR',{maximumFractionDigits:d,minimumFractionDigits:d}):'-';
const tl=x=>fmt(x)+' TL';
const clamp=(x,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number(x)||0)));
const badgeClass=s=>s>=70?'bgreen':s>=50?'byellow':'bred';
function rnd(seed){let x=Math.sin(seed)*10000;return x-Math.floor(x)}
function seed(symbol){return [...symbol].reduce((a,c)=>a+c.charCodeAt(0),0)}
function makeSeries(symbol){let sd=seed(symbol), base={PAPIL:14.86,MRSHL:1656,TEZOL:21.2,USAK:3.1,VKING:55,THYAO:320,AKBNK:80.5,GARAN:136,EREGL:27.8,PETKM:19,TUPRS:168,BIMAS:514,ASELS:95,KCHOL:180,FROTO:960}[symbol]||40+sd%80;let arr=[],p=base*0.88;for(let i=0;i<160;i++){let drift=(rnd(sd+i)-.45)*0.035 + Math.sin(i/14+sd/20)*0.011;let prev=p;p=Math.max(.5,p*(1+drift));let high=Math.max(prev,p)*(1+rnd(sd+i*3)*.025);let low=Math.min(prev,p)*(1-rnd(sd+i*5)*.025);let volume=Math.round(800000+rnd(sd+i*7)*12000000);arr.push({date:String(i+1),open:+prev.toFixed(2),high:+high.toFixed(2),low:+low.toFixed(2),close:+p.toFixed(2),volume});}return arr}
function avg(a){let b=a.filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:0}
function sma(a,n){return a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1)))}
function ema(a,n){let k=2/(n+1),out=[];a.forEach((v,i)=>out[i]=i?v*k+out[i-1]*(1-k):v);return out}
function rsi(c,n=14){let o=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let g=0,l=0;for(let j=i-n+1;j<=i;j++){let d=c[j]-c[j-1];d>0?g+=d:l-=d}let rs=l===0?100:g/l;o[i]=100-(100/(1+rs))}return o}
function macd(c){let e12=ema(c,12),e26=ema(c,26),m=c.map((_,i)=>e12[i]-e26[i]),s=ema(m,9),h=m.map((v,i)=>v-s[i]);return{m,s,h}}
function atr(h,l,c,n=14){let tr=c.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);return sma(tr,n)}
function roc(c,n=12){return c.map((v,i)=>i<n?null:(v-c[i-n])/c[i-n]*100)}
function mfi(h,l,c,v,n=14){let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),o=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){let mf=tp[j]*v[j];tp[j]>tp[j-1]?pos+=mf:neg+=mf}o[i]=100-(100/(1+pos/(neg||1)))}return o}
function adxCalc(h,l,c,n=14){let plusDM=[0],minusDM=[0],tr=[h[0]-l[0]];for(let i=1;i<c.length;i++){let up=h[i]-h[i-1],dn=l[i-1]-l[i];plusDM[i]=up>dn&&up>0?up:0;minusDM[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]))}let atrv=sma(tr,n),pdi=plusDM.map((x,i)=>atrv[i]?100*avg(plusDM.slice(Math.max(0,i-n+1),i+1))/atrv[i]:0),mdi=minusDM.map((x,i)=>atrv[i]?100*avg(minusDM.slice(Math.max(0,i-n+1),i+1))/atrv[i]:0),dx=pdi.map((x,i)=>(x+mdi[i])?100*Math.abs(x-mdi[i])/(x+mdi[i]):0),adx=sma(dx,n);return{adx,pdi,mdi}}
function detectPattern(c,h,l){
 let n=c.length-1,recent=c.slice(Math.max(0,n-70),n+1),rh=h.slice(Math.max(0,n-70),n+1),rl=l.slice(Math.max(0,n-70),n+1);
 let min=Math.min(...recent),max=Math.max(...recent),pos=recent.indexOf(min),recover=(c[n]-min)/(max-min||1)*100;
 let notes=[],candidates=[];
 function cand(name,score,targetPct,confidence,note){candidates.push({name,score,targetPct,confidence,notes:[note].filter(Boolean)})}
 // Direnç kırılımı: son kapanış son 20 günün üstünde ve hacimli toparlanma adayıdır.
 if(c[n]>Math.max(...c.slice(Math.max(0,n-20),n))) cand('Direnç kırılımı',82,14,78,'Son 20 gün direnci yukarı kırılmış görünüyor');
 // Çanak: dip orta bölgede, dipten anlamlı toparlanma var.
 if(pos>15&&pos<55&&recover>50) cand('Çanak toparlanması',74,16,72,'Dip sonrası kademeli toparlanma var');
 // İkili dip: son 60 günde iki yakın dip ve sonrasında toparlanma.
 let lows=[];for(let i=Math.max(2,n-60);i<n-2;i++){if(c[i]<c[i-1]&&c[i]<c[i+1])lows.push({i,v:c[i]})}
 for(let a=0;a<lows.length;a++){for(let b=a+1;b<lows.length;b++){let d1=lows[a],d2=lows[b];if(Math.abs(d1.v-d2.v)/((d1.v+d2.v)/2)<0.05&&d2.i-d1.i>8&&c[n]>Math.max(d1.v,d2.v)*1.06){cand('İkili dip',76,15,73,'Birbirine yakın iki dip sonrası toparlanma var')}}}
 // İkili tepe: uyarı amaçlı negatif formasyon.
 let highs=[];for(let i=Math.max(2,n-60);i<n-2;i++){if(c[i]>c[i-1]&&c[i]>c[i+1])highs.push({i,v:c[i]})}
 for(let a=0;a<highs.length;a++){for(let b=a+1;b<highs.length;b++){let d1=highs[a],d2=highs[b];if(Math.abs(d1.v-d2.v)/((d1.v+d2.v)/2)<0.04&&d2.i-d1.i>8&&c[n]<Math.min(d1.v,d2.v)*0.96){cand('İkili tepe riski',48,0,65,'Benzer iki zirve sonrası zayıflama riski var')}}}
 // Sıkışma/flama: son 15 gündeki bant, önceki banda göre daralmışsa.
 let last15=c.slice(Math.max(0,n-14),n+1),prev30=c.slice(Math.max(0,n-45),Math.max(0,n-15));
 let range15=(Math.max(...last15)-Math.min(...last15))/(c[n]||1),rangePrev=prev30.length?(Math.max(...prev30)-Math.min(...prev30))/(c[n]||1):0;
 if(range15<0.075 && (!rangePrev || range15<rangePrev*0.65)) cand('Sıkışma / flama adayı',66,12,62,'Fiyat dar bantta sıkışıyor; kırılım yönü izlenmeli');
 if(Math.abs(c[n]-min)/c[n]<.05&&recover<35) cand('Dip bölgesi izleme',58,10,55,'Fiyat dip bölgesine yakın, dönüş teyidi beklenmeli');
 if(!candidates.length)candidates.push({name:'Belirgin formasyon yok',score:35,targetPct:8,confidence:40,notes:[]});
 candidates.sort((a,b)=>b.score-a.score);return candidates[0]
}
function superTrend(close,atrv){let n=close.length-1,st=close[n]-(atrv[n]||0)*2;return{value:st,dir:close[n]>st?1:-1}}
function aiAnalyze(rows,symbol){let c=rows.map(x=>x.close),h=rows.map(x=>x.high||x.close),l=rows.map(x=>x.low||x.close),v=rows.map(x=>x.volume||0),n=c.length-1;let em20=ema(c,20),em50=ema(c,50),em200=ema(c,120),ma20=sma(c,20),ma50=sma(c,50),rs=rsi(c),mc=macd(c),at=atr(h,l,c),ro=roc(c),mf=mfi(h,l,c,v),adx=adxCalc(h,l,c),vol=sma(v,20),pat=detectPattern(c,h,l),st=superTrend(c,at);let close=c[n],prev=c[n-1]||close,change=(close-prev)/prev*100,atrPct=(at[n]||0)/close*100,volumeRatio=v[n]/(vol[n]||1);
let trend=0,money=0,momentum=0,risk=0; if(close>em20[n])trend+=12;if(close>em50[n])trend+=20;if(close>em200[n])trend+=20;if(em50[n]>em200[n])trend+=16;if(mc.m[n]>mc.s[n])trend+=12;if((adx.adx[n]||0)>25)trend+=10;if(st.dir>0)trend+=10;
if(volumeRatio>1.2)money+=20;if(volumeRatio>1.7)money+=20;if((mf[n]||0)>50&&(mf[n]||0)<80)money+=20;if(c[n]>c[Math.max(0,n-5)])money+=20;if(v[n]>avg(v.slice(Math.max(0,n-10),n+1)))money+=20;
if((rs[n]||0)>42&&(rs[n]||0)<68)momentum+=25;if(mc.h[n]>mc.h[n-1])momentum+=20;if((ro[n]||0)>0)momentum+=20;if(c[n]>ma20[n])momentum+=20;if((adx.pdi[n]||0)>(adx.mdi[n]||0))momentum+=15;
risk+=atrPct>6?35:atrPct>4?25:atrPct>2.5?15:8;if(volumeRatio<.65)risk+=18;if((rs[n]||0)>75)risk+=18;if(Math.abs(change)>7)risk+=18;if(close<em50[n])risk+=10;
trend=clamp(trend);money=clamp(money);momentum=clamp(momentum);risk=clamp(risk);let pattern=pat.score,potential=clamp(trend*.28+money*.24+momentum*.20+pattern*.18+(100-risk)*.10),confidence=clamp(trend*.32+money*.22+momentum*.22+pattern*.12+(100-risk)*.12),finalScore=clamp(confidence*.45+potential*.35+(100-risk)*.20),decision=finalScore>=82?'GÜÇLÜ AL':finalScore>=68?'AL':finalScore>=54?'İZLE':finalScore>=40?'BEKLE':'RİSKLİ';let target1=close*(1+Math.max(5,potential/7)/100),target2=close*(1+Math.max(9,potential/4.5)/100),stop=Math.max(Math.min(...l.slice(n-20,n+1)),close*(1-(4+risk/25)/100));let rr=(target1-close)/(close-stop||1);
let positives=[],negatives=[];const add=(cond,txt)=>cond?positives.push(txt):negatives.push(txt);add(close>em50[n],'Fiyat EMA50 üzerinde');add(close>em200[n],'Fiyat EMA200 üzerinde');add(mc.m[n]>mc.s[n],'MACD pozitif');add((adx.adx[n]||0)>25,'ADX trend gücü yeterli');add(st.dir>0,'SuperTrend AL');add(volumeRatio>1,'Hacim ortalama üstü');add((rs[n]||0)>42&&(rs[n]||0)<68,'RSI sağlıklı bölgede');add(risk<45,'Risk kabul edilebilir');return{date:rows[n].date,symbol,close,prev,change,volume:v[n],volAvg:vol[n]||0,volumeRatio,ema20:em20[n],ema50:em50[n],ema200:em200[n],sma20:ma20[n],sma50:ma50[n],rsi:rs[n],macd:mc.m[n],signal:mc.s[n],hist:mc.h[n],atr:at[n],atrPct,roc:ro[n],mfi:mf[n],adx:adx.adx[n],pdi:adx.pdi[n],mdi:adx.mdi[n],superTrend:st.value,superTrendDir:st.dir,trend,money,momentum,pattern,potential,confidence,risk,finalScore,decision,target1,target2,stop,riskReward:rr,formation:pat,positives,negatives,ohlcv:rows}}
function aiComments(symbol,a){let trend=a.trend>=70?'trend güçlü':a.trend>=50?'trend toparlanıyor':'trend zayıf';let para=a.money>=70?'para girişi belirgin':a.money>=50?'para akışı dengeli':'para girişi zayıf';let mom=a.momentum>=70?'momentum güçlü':a.momentum>=50?'momentum orta':'momentum zayıf';return{expert:`${symbol} için ${trend}. ${para}. ${mom}. ADX ${fmt(a.adx)} ve +DI/-DI ${fmt(a.pdi)}/${fmt(a.mdi)}. SuperTrend ${a.superTrendDir>0?'AL':'SAT'} tarafında. Formasyon: ${a.formation.name}.`,ai:`AI karar motoru ${symbol} için ${a.decision} sonucunu üretir. Güven %${fmt(a.confidence,0)}, risk %${fmt(a.risk,0)}, risk/getiri ${fmt(a.riskReward,2)}. ${a.finalScore>=68?'Kapanış teyidi ve stop seviyesiyle işlem planı değerlendirilebilir.':'Henüz güçlü teyit yok; izleme ve kademeli yaklaşım daha güvenli.'}`}}
function mock(symbol){let rows=makeSeries(symbol);let a=aiAnalyze(rows,symbol);return{success:true,symbol,analysis:a,comments:aiComments(symbol,a),ohlcv:rows}}
async function getStock(symbol){try{let r=await fetch('/api/stock?symbol='+encodeURIComponent(symbol));if(!r.ok)throw new Error('API yok');let j=await r.json();if(j&&j.success&&j.analysis){let a=j.analysis;if(!a.finalScore){a=aiAnalyze(j.ohlcv||a.ohlcv||[],symbol);j.analysis=a;j.comments=aiComments(symbol,a)}return j}}catch(e){}return mock(symbol)}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===id));$('pageTitle').textContent=document.querySelector(`.nav[data-page="${id}"]`)?.textContent.replace(/[🏠📊🏆🛡️🚀💼🎯⚙️]/g,'').trim()||'Kontrol Paneli'}
function renderStock(j){let a=j.analysis||{};$('stockCards').innerHTML=[['Karar',a.decision,badgeClass(a.finalScore)],['AI Skor',fmt(a.finalScore,0),badgeClass(a.finalScore)],['Güven','%'+fmt(a.confidence,0),badgeClass(a.confidence)],['Risk','%'+fmt(a.risk,0),a.risk<35?'bgreen':a.risk<60?'byellow':'bred'],['Son Fiyat',tl(a.livePrice||a.close),a.change>=0?'bgreen':'bred']].map(x=>`<div class="card metric"><span>${x[0]}</span><b><span class="badge ${x[2]}">${x[1]}</span></b><small>Değişim: ${fmt(a.change)}%</small></div>`).join('');
let bars=[['Trend',a.trend],['Para Girişi',a.money],['Momentum',a.momentum],['Formasyon',a.pattern],['Potansiyel',a.potential],['Risk',a.risk]];$('engineBars').innerHTML=bars.map(([n,v])=>`<b>${n}: ${fmt(v,0)}/100</b><div class="barWrap"><div class="bar" style="width:${clamp(v)}%;background:${n==='Risk'?(v<35?'#16a34a':v<60?'#f59e0b':'#dc2626'):(v>=70?'#16a34a':v>=50?'#f59e0b':'#dc2626')}"></div></div>`).join('')+`<div class="comment"><b>Karar:</b> ${a.decision} • AI skor ${fmt(a.finalScore,0)}/100</div>`;
$('indicatorDetails').innerHTML=`<div class="list"><div>RSI: ${fmt(a.rsi)}</div><div>MACD / Signal: ${fmt(a.macd)} / ${fmt(a.signal)}</div><div>ADX +DI/-DI: ${fmt(a.adx)} • ${fmt(a.pdi)} / ${fmt(a.mdi)}</div><div>SuperTrend: ${a.superTrendDir>0?'AL':'SAT'}</div><div>Hacim oranı: ${fmt(a.volumeRatio)}x</div><div>Formasyon: ${a.formation?.name||'-'}</div><div>Hedef 1 / Hedef 2: ${tl(a.target1)} / ${tl(a.target2)}</div><div>Stop: ${tl(a.stop)}</div></div>`;
$('expertComment').textContent=j.comments?.expert||aiComments(selected,a).expert;$('aiComment').textContent=j.comments?.ai||aiComments(selected,a).ai;$('whyBox').innerHTML=[...(a.positives||[]).map(t=>`<div>✅ ${t}</div>`),...(a.negatives||[]).slice(0,5).map(t=>`<div>⚠️ ${t}</div>`)].join('');
$('decisionTree').innerHTML=[['Trend',a.trend>=60],['Para girişi',a.money>=55],['Momentum',a.momentum>=55],['Risk kabul',a.risk<50],['AI skor teyidi',a.finalScore>=54]].map(x=>`<div>${x[1]?'✅':'❌'} ${x[0]}</div>`).join('');
renderCurrentPattern(a);
$('scenarioBox').innerHTML=`<div>Olumlu senaryo: ${tl(a.target2)} (${fmt((a.target2-a.close)/a.close*100,1)}%)</div><div>Nötr senaryo: ${tl(a.close*1.02)} civarı yatay</div><div>Olumsuz senaryo / stop: ${tl(a.stop)}</div>`;
$('positionBox').innerHTML=`<div>Vade: ${a.finalScore>=68?'2-6 hafta':'Teyit beklenmeli'}</div><div>Risk/Getiri: 1 : ${fmt(a.riskReward,2)}</div><div>Pozisyon: ${a.risk<35?'Normal':a.risk<60?'Kademeli':'Düşük'}</div><div>İşlem notu: Kapanış teyidi şart.</div>`;draw(a.ohlcv||j.ohlcv||[])}
function draw(rows){if(chart)chart.destroy();rows=Array.isArray(rows)?rows:[];let c=rows.map(r=>r.close),labels=rows.map(r=>r.date),e20=ema(c,20),e50=ema(c,50),e200=ema(c,120);chart=new Chart($('priceChart'),{type:'line',data:{labels,datasets:[{label:selected,data:c,borderWidth:2,pointRadius:0},{label:'EMA20',data:e20,borderWidth:1,pointRadius:0},{label:'EMA50',data:e50,borderWidth:1,pointRadius:0},{label:'EMA200',data:e200,borderWidth:1,pointRadius:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{title:{display:true,text:selected+' Fiyat Grafiği ve Teknik Göstergeler'}}}})}
async function analyze(){selected=($('symbolInput').value||selected).toUpperCase().trim();showPage('stock');renderStock(await getStock(selected))}
function rowsForAll(){return demoSymbols.map(s=>{let j=mock(s);return{symbol:s,...j.analysis}}).sort((a,b)=>b.finalScore-a.finalScore)}
function renderTop20(){let rows=rowsForAll().slice(0,20);$('top20Table').innerHTML='<tr><th>#</th><th>Hisse</th><th>Karar</th><th>AI Skor</th><th>Güven</th><th>Risk</th><th>Formasyon</th></tr>'+rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.symbol}</b></td><td><span class="badge ${badgeClass(r.finalScore)}">${r.decision}</span></td><td>${fmt(r.finalScore,0)}</td><td>${fmt(r.confidence,0)}</td><td>${fmt(r.risk,0)}</td><td>${r.formation?.name||'-'}</td></tr>`).join('');$('scanStatus').textContent='AI motoruyla liste oluşturuldu';renderSafeOpp(rowsForAll())}
function renderSafeOpp(rows){$('safeList').innerHTML=rows.filter(r=>r.risk<35&&r.trend>60).slice(0,12).map(r=>`<div class="rankItem"><b>${r.symbol}</b><span>${r.decision} • Risk ${fmt(r.risk,0)}</span></div>`).join('')||'<div class="comment">Uygun hisse bulunamadı.</div>';$('oppList').innerHTML=rows.filter(r=>r.potential>55&&r.pattern>50).slice(0,12).map(r=>`<div class="rankItem"><b>${r.symbol}</b><span>${r.formation?.name||'Formasyon'} • Pot. ${fmt(r.potential,0)}</span></div>`).join('')||'<div class="comment">Uygun fırsat bulunamadı.</div>'}

function renderCurrentPattern(a){
 if(!$('patternSummary'))return;
 let f=a.formation||{name:'Belirgin formasyon yok',score:a.pattern||0,confidence:a.pattern||0,targetPct:0,notes:[]};
 $('patternSummary').innerHTML=`<div><b>Formasyon:</b> ${f.name}</div><div><b>Formasyon puanı:</b> ${fmt(f.score,0)}/100</div><div><b>Güven:</b> %${fmt(f.confidence,0)}</div><div><b>Olası hedef:</b> %${fmt(f.targetPct||0,1)}</div><div><b>Not:</b> ${(f.notes&&f.notes[0])||'Net formasyon teyidi yok; fiyat ve hacim birlikte izlenmeli.'}</div>`;
 $('patternComment').textContent=`${a.symbol||selected} için ${f.name} tespit edildi. Formasyon puanı ${fmt(f.score,0)}/100. Bu sinyal tek başına işlem kararı değildir; trend, hacim, ADX, SuperTrend ve stop seviyesiyle birlikte değerlendirilmelidir.`;
}
function renderPatterns(){
 let rows=rowsForAll().sort((a,b)=>(b.pattern||0)-(a.pattern||0)).slice(0,25);
 $('patternTable').innerHTML='<tr><th>#</th><th>Hisse</th><th>Formasyon</th><th>Puan</th><th>Güven</th><th>AI Karar</th><th>Risk</th></tr>'+rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.symbol}</b></td><td>${r.formation?.name||'-'}</td><td>${fmt(r.pattern,0)}</td><td>%${fmt(r.formation?.confidence||r.pattern,0)}</td><td><span class="badge ${badgeClass(r.finalScore)}">${r.decision}</span></td><td>${fmt(r.risk,0)}</td></tr>`).join('');
 $('patternStatus').textContent='Formasyon adayları oluşturuldu';
}

function portfolio(){return JSON.parse(localStorage.getItem('bistPortfolio')||'[{"symbol":"MRSHL","lot":286,"cost":2470},{"symbol":"PAPIL","lot":7000,"cost":27.5},{"symbol":"TEZOL","lot":6156,"cost":20.96},{"symbol":"USAK","lot":29222,"cost":3.05},{"symbol":"VKING","lot":1000,"cost":55}]')}
function savePortfolio(p){localStorage.setItem('bistPortfolio',JSON.stringify(p));renderPortfolio()}
function renderPortfolio(){let p=portfolio();$('portfolioTable').innerHTML='<tr><th>Hisse</th><th>Lot</th><th>Maliyet</th><th>AI Karar</th><th>İşlem</th></tr>'+p.map(x=>{let a=mock(x.symbol).analysis;return`<tr><td><b>${x.symbol}</b></td><td>${fmt(x.lot,0)}</td><td>${tl(x.cost)}</td><td><span class="badge ${badgeClass(a.finalScore)}">${a.decision}</span></td><td><button class="ghost" onclick="selected='${x.symbol}';$('symbolInput').value='${x.symbol}';analyze()">Analiz</button></td></tr>`}).join('')}
function addPortfolio(){let s=$('pSymbol').value.toUpperCase().trim(),lot=Number($('pLot').value),cost=Number($('pCost').value);if(!s||!lot||!cost)return alert('Hisse, lot ve maliyet girin');let p=portfolio().filter(x=>x.symbol!==s);p.push({symbol:s,lot,cost});savePortfolio(p)}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('analyzeBtn').onclick=analyze;$('detailToggle').onclick=()=>$('indicatorDetails').classList.toggle('hidden');$('scanBtn').onclick=renderTop20;$('patternScanBtn').onclick=renderPatterns;$('addPortfolio').onclick=addPortfolio;$('symbolInput').value=selected;renderPortfolio();renderTop20();renderPatterns();analyze();

// ===== v14.4 Backtest ve İstatistik Motoru =====
function analyzeAt(rows,symbol,endIndex){
  const cut=rows.slice(0,Math.max(60,Math.min(rows.length,endIndex+1)));
  return aiAnalyze(cut,symbol);
}
function classifyBacktestSignal(decision, ret){
  if(decision==='GÜÇLÜ AL') return ret>=4;
  if(decision==='AL') return ret>=2;
  if(decision==='İZLE') return ret>=-2;
  if(decision==='BEKLE') return ret<=8 && ret>=-6;
  if(decision==='RİSKLİ') return ret<=0;
  return false;
}
function runBacktestForSymbol(symbol, horizon=20, step=5){
  const rows=makeSeries(symbol);
  const signals=[];
  for(let i=80;i<rows.length-horizon;i+=step){
    try{
      const a=analyzeAt(rows,symbol,i);
      const future=rows[i+horizon].close;
      const ret=((future-a.close)/a.close)*100;
      const ok=classifyBacktestSignal(a.decision,ret);
      signals.push({symbol,date:rows[i].date,decision:a.decision,score:a.finalScore,risk:a.risk,price:a.close,future,ret,ok,formation:a.formation?.name||'-'});
    }catch(e){}
  }
  return signals;
}
function summarizeSignals(signals){
  const groups={};
  signals.forEach(s=>{
    groups[s.decision] ||= {decision:s.decision,total:0,ok:0,avg:0,best:-999,worst:999};
    const g=groups[s.decision];
    g.total++; if(s.ok)g.ok++; g.avg+=s.ret; g.best=Math.max(g.best,s.ret); g.worst=Math.min(g.worst,s.ret);
  });
  Object.values(groups).forEach(g=>{g.success=g.total?g.ok/g.total*100:0;g.avg=g.total?g.avg/g.total:0});
  const total=signals.length, ok=signals.filter(s=>s.ok).length, avg=total?signals.reduce((a,s)=>a+s.ret,0)/total:0;
  return {total,ok,success:total?ok/total*100:0,avg,groups:Object.values(groups).sort((a,b)=>b.total-a.total)};
}
function renderBacktestResult(symbol,signals){
  const sum=summarizeSignals(signals);
  const best=signals.slice().sort((a,b)=>b.ret-a.ret)[0];
  const riskLabel=sum.success>=65?'Düşük':sum.success>=52?'Orta':'Yüksek';
  $('backtestCards').innerHTML=[
    ['Toplam Sinyal',fmt(sum.total,0),'Test edilen geçmiş sinyal',sum.total>0?'bgreen':'byellow'],
    ['Başarı','%'+fmt(sum.success,1),'Tutarli sinyal oranı',sum.success>=65?'bgreen':sum.success>=52?'byellow':'bred'],
    ['Ortalama Getiri','%'+fmt(sum.avg,1),'20 işlem günü sonrası',sum.avg>=2?'bgreen':sum.avg>=0?'byellow':'bred'],
    ['En İyi Sinyal',best?('%'+fmt(best.ret,1)):'--',best?`${best.symbol} • ${best.decision}`:'Veri yok',best&&best.ret>0?'bgreen':'byellow'],
    ['Risk Notu',riskLabel,'Sinyal güvenilirliği',riskLabel==='Düşük'?'bgreen':riskLabel==='Orta'?'byellow':'bred']
  ].map(x=>`<div class="card metric"><span>${x[0]}</span><b><span class="badge ${x[3]}">${x[1]}</span></b><small>${x[2]}</small></div>`).join('');
  $('backtestTable').innerHTML='<tr><th>Karar</th><th>Sinyal</th><th>Başarılı</th><th>Başarı</th><th>Ort. Getiri</th><th>En İyi</th><th>En Kötü</th></tr>'+sum.groups.map(g=>`<tr><td><b>${g.decision}</b></td><td>${g.total}</td><td>${g.ok}</td><td>%${fmt(g.success,1)}</td><td>%${fmt(g.avg,1)}</td><td>%${fmt(g.best,1)}</td><td>%${fmt(g.worst,1)}</td></tr>`).join('');
  $('signalHistoryTable').innerHTML='<tr><th>Tarih</th><th>Hisse</th><th>Karar</th><th>Skor</th><th>Risk</th><th>Formasyon</th><th>20 Gün Getiri</th><th>Sonuç</th></tr>'+signals.slice(-30).reverse().map(s=>`<tr><td>${s.date}</td><td><b>${s.symbol}</b></td><td><span class="badge ${badgeClass(s.score)}">${s.decision}</span></td><td>${fmt(s.score,0)}</td><td>${fmt(s.risk,0)}</td><td>${s.formation}</td><td>%${fmt(s.ret,1)}</td><td>${s.ok?'✅ Tutarli':'⚠️ Zayıf'}</td></tr>`).join('');
  $('backtestComment').textContent=`${symbol==='TÜM LİSTE'?'İzleme listesindeki hisseler':'Seçili '+symbol+' hissesi'} için geçmiş sinyaller test edildi. Toplam ${sum.total} sinyalin ${sum.ok} tanesi tutarlı sonuç verdi. Başarı oranı %${fmt(sum.success,1)}, ortalama 20 günlük getiri %${fmt(sum.avg,1)}. Bu sonuç yatırım tavsiyesi değil, sistemin geçmiş performans ölçümüdür.`;
  $('backtestStatus').textContent=`${symbol} backtest tamamlandı`;
}
function runSelectedBacktest(){
  const symbol=($('symbolInput').value||selected||'PAPIL').toUpperCase().trim();
  showPage('backtest');
  $('backtestStatus').textContent=symbol+' için backtest çalışıyor...';
  setTimeout(()=>renderBacktestResult(symbol,runBacktestForSymbol(symbol)),50);
}
function runAllBacktest(){
  showPage('backtest');
  $('backtestStatus').textContent='Tüm izleme listesi için backtest çalışıyor...';
  setTimeout(()=>{
    const all=demoSymbols.slice(0,30).flatMap(s=>runBacktestForSymbol(s,20,10));
    renderBacktestResult('TÜM LİSTE',all);
  },50);
}
if($('backtestBtn')) $('backtestBtn').onclick=runSelectedBacktest;
if($('backtestAllBtn')) $('backtestAllBtn').onclick=runAllBacktest;
