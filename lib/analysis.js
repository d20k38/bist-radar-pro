export function sma(a,n){return a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1)));}
export function avg(a){const b=a.filter(x=>Number.isFinite(Number(x))).map(Number);return b.length?b.reduce((s,x)=>s+x,0)/b.length:null;}
export function ema(a,n){let k=2/(n+1),out=[];a.forEach((v,i)=>{v=Number(v);out[i]=i===0?v:(v*k+out[i-1]*(1-k));});return out;}
export function rsi(c,n=14){let out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let g=0,l=0;for(let j=i-n+1;j<=i;j++){let d=c[j]-c[j-1];if(d>0)g+=d;else l-=d;}let rs=l===0?100:g/l;out[i]=100-(100/(1+rs));}return out;}
export function macd(c){let e12=ema(c,12),e26=ema(c,26),m=c.map((_,i)=>e12[i]-e26[i]),s=ema(m,9),h=m.map((v,i)=>v-s[i]);return{m,s,h};}
export function atr(h,l,c,n=14){let tr=c.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);return sma(tr,n);}
export function roc(c,n=12){return c.map((v,i)=>i<n?null:((v-c[i-n])/c[i-n])*100);}
export function mfi(h,l,c,v,n=14){let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){let mf=tp[j]*v[j];if(tp[j]>tp[j-1])pos+=mf;else neg+=mf;}out[i]=100-(100/(1+pos/(neg||1)));}return out;}
export function obv(c,v){let out=[0];for(let i=1;i<c.length;i++)out[i]=out[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0);return out;}
export function stochastic(h,l,c,n=14){let k=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let hh=Math.max(...h.slice(i-n+1,i+1)),ll=Math.min(...l.slice(i-n+1,i+1));k[i]=hh===ll?50:((c[i]-ll)/(hh-ll))*100;}return{k,d:sma(k.map(x=>x??50),3)};}
export function cci(h,l,c,n=20){let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),out=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let arr=tp.slice(i-n+1,i+1),ma=avg(arr),md=avg(arr.map(x=>Math.abs(x-ma)));out[i]=md?((tp[i]-ma)/(0.015*md)):0;}return out;}
function clamp(x,min=0,max=100){return Math.max(min,Math.min(max,Math.round(Number(x)||0)));}
function lastFinite(arr){for(let i=arr.length-1;i>=0;i--)if(Number.isFinite(Number(arr[i])))return Number(arr[i]);return null;}
function num(x,d=0){x=Number(x);return Number.isFinite(x)?x:d;}

export function dmiAdx(h,l,c,n=14){
  const len=c.length, tr=Array(len).fill(null), pdm=Array(len).fill(0), mdm=Array(len).fill(0);
  for(let i=1;i<len;i++){
    const up=h[i]-h[i-1], down=l[i-1]-l[i];
    pdm[i]=(up>down&&up>0)?up:0; mdm[i]=(down>up&&down>0)?down:0;
    tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));
  }
  const pdi=Array(len).fill(null), mdi=Array(len).fill(null), dx=Array(len).fill(null), adx=Array(len).fill(null);
  for(let i=n;i<len;i++){
    const trSum=avg(tr.slice(i-n+1,i+1))*n || 1;
    const pSum=avg(pdm.slice(i-n+1,i+1))*n || 0;
    const mSum=avg(mdm.slice(i-n+1,i+1))*n || 0;
    pdi[i]=100*pSum/trSum; mdi[i]=100*mSum/trSum;
    dx[i]=100*Math.abs(pdi[i]-mdi[i])/Math.max(pdi[i]+mdi[i],1);
    if(i>=n*2) adx[i]=avg(dx.slice(i-n+1,i+1));
  }
  return {pdi,mdi,adx};
}

export function supertrend(h,l,c,period=10,mult=3){
  const at=atr(h,l,c,period), len=c.length, st=Array(len).fill(null), dir=Array(len).fill(1);
  let finalUpper=null, finalLower=null;
  for(let i=0;i<len;i++){
    const hl2=(h[i]+l[i])/2, basicUpper=hl2+mult*(at[i]||0), basicLower=hl2-mult*(at[i]||0);
    if(i===0||at[i]==null){st[i]=null;continue;}
    finalUpper=(basicUpper<(finalUpper??basicUpper)||c[i-1]>(finalUpper??basicUpper))?basicUpper:(finalUpper??basicUpper);
    finalLower=(basicLower>(finalLower??basicLower)||c[i-1]<(finalLower??basicLower))?basicLower:(finalLower??basicLower);
    if(c[i]>(st[i-1]??finalUpper)){dir[i]=1;st[i]=finalLower;}
    else if(c[i]<(st[i-1]??finalLower)){dir[i]=-1;st[i]=finalUpper;}
    else {dir[i]=dir[i-1]||1;st[i]=dir[i]===1?finalLower:finalUpper;}
  }
  return {st,dir};
}

export function detectPatterns(rows){
  const c=rows.map(x=>x.close), h=rows.map(x=>x.high), l=rows.map(x=>x.low), v=rows.map(x=>x.volume||0), n=c.length-1;
  const recent=c.slice(Math.max(0,n-59),n+1); const vol20=avg(v.slice(Math.max(0,n-19),n+1))||1;
  const min=Math.min(...recent), max=Math.max(...recent), close=c[n], range=Math.max(max-min,0.01);
  const left=recent.slice(0,20), mid=recent.slice(20,40), right=recent.slice(40);
  let name='Belirgin formasyon yok', score=35, targetPct=8, confidence=40, notes=[];
  const cup = left.length&&mid.length&&right.length && avg(left)>avg(mid)*1.08 && avg(right)>avg(mid)*1.08 && close>avg(right)*0.98;
  const doubleBottom = recent.length>35 && Math.abs(Math.min(...recent.slice(0,30))-Math.min(...recent.slice(30)))/close < 0.06 && close>min*1.08;
  const breakout = close >= max*0.97 && v[n] > vol20*1.3;
  const consolidation = (Math.max(...recent.slice(-15))-Math.min(...recent.slice(-15)))/close < 0.10 && v[n]>vol20*1.2;
  if(cup){name='Çanak / toparlanma';score+=25;targetPct+=12;confidence+=18;notes.push('Çanak benzeri toparlanma var');}
  if(doubleBottom){name=name==='Belirgin formasyon yok'?'İkili dip':name+' + İkili dip';score+=18;targetPct+=10;confidence+=12;notes.push('İkili dip ihtimali');}
  if(breakout){name=name==='Belirgin formasyon yok'?'Direnç kırılımı':name+' + Kırılım';score+=25;targetPct+=12;confidence+=16;notes.push('Hacimli kırılım var');}
  if(consolidation){name=name==='Belirgin formasyon yok'?'Sıkışma / flama adayı':name+' + Sıkışma';score+=12;targetPct+=7;confidence+=8;notes.push('Sıkışma sonrası hareket adayı');}
  return {name,score:clamp(score),targetPct:clamp(targetPct,5,60),confidence:clamp(confidence),notes};
}

export function analyze(rows, atIndex=null){
  if(!Array.isArray(rows)||rows.length<60) throw new Error('Yeterli OHLCV verisi yok');
  const cut=atIndex==null?rows.length:Math.max(60,Math.min(rows.length,atIndex+1));
  const r=rows.slice(0,cut).filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.high)&&Number.isFinite(x.low));
  const c=r.map(x=>Number(x.close)),h=r.map(x=>Number(x.high)),l=r.map(x=>Number(x.low)),v=r.map(x=>Number(x.volume)||0),n=c.length-1;
  const em20=ema(c,20),em50=ema(c,50),em200=ema(c,200),ma20=sma(c,20),ma50=sma(c,50),ma200=sma(c,200),rs=rsi(c),mc=macd(c),at=atr(h,l,c),ro=roc(c),mf=mfi(h,l,c,v),ob=obv(c,v),sto=stochastic(h,l,c),cc=cci(h,l,c),vol=sma(v,20),dmi=dmiAdx(h,l,c),sup=supertrend(h,l,c),formation=detectPatterns(r);
  const close=c[n], prev=c[n-1]||close;
  const change=prev?((close-prev)/prev)*100:0;
  const atrPct=close?((at[n]||0)/close)*100:0;
  const donU=Math.max(...h.slice(Math.max(0,n-19),n+1));
  const donD=Math.min(...l.slice(Math.max(0,n-19),n+1));
  const volumeRatio=v[n]/Math.max(vol[n]||1,1);
  let trend=0,money=0,momentum=0,risk=0,patternScore=formation.score||0;

  if(close>(em20[n]??Infinity))trend+=10;
  if(close>(em50[n]??Infinity))trend+=20;
  if(close>(em200[n]??Infinity))trend+=20;
  if((em50[n]??0)>(em200[n]??0))trend+=15;
  if((mc.m[n]??0)>(mc.s[n]??0))trend+=12;
  if((dmi.adx[n]??0)>20)trend+=10;
  if((dmi.adx[n]??0)>30)trend+=8;
  if((dmi.pdi[n]??0)>(dmi.mdi[n]??0))trend+=10;
  if((sup.dir[n]??0)>0 && close>(sup.st[n]??Infinity))trend+=10;

  if(volumeRatio>1.2)money+=15;
  if(volumeRatio>1.5)money+=15;
  if(volumeRatio>2)money+=15;
  if((mf[n]??0)>50&&(mf[n]??0)<80)money+=20;
  if(ob[n]>(ob[Math.max(0,n-20)]??0))money+=25;
  if(c[n]>c[Math.max(0,n-5)])money+=10;

  if((rs[n]??0)>40&&(rs[n]??0)<65)momentum+=25;
  if((rs[n]??0)>=30&&(rs[n]??0)<=40 && (rs[n]??0)>(rs[n-1]??0))momentum+=15;
  if((mc.h[n]??0)>(mc.h[n-1]??0))momentum+=20;
  if((mc.m[n]??0)>(mc.s[n]??0))momentum+=15;
  if((ro[n]??0)>0)momentum+=20;
  if((cc[n]??0)>0)momentum+=10;
  if(c[n]>c[Math.max(0,n-3)])momentum+=10;

  risk += atrPct>7?38:atrPct>5?28:atrPct>3?18:10;
  if(v[n]<(vol[n]||1)*0.7)risk+=15;
  if((rs[n]??0)>75)risk+=15;
  if(Math.abs(change)>7)risk+=20;
  if(volumeRatio>3 && change<1)risk+=10; // hacim var ama fiyat yürümüyor: dağıtım riski
  if(close<(em200[n]??0))risk+=10;

  trend=clamp(trend); money=clamp(money); momentum=clamp(momentum); risk=clamp(risk); patternScore=clamp(patternScore);
  const potential=clamp(trend*0.25+money*0.25+momentum*0.20+patternScore*0.30);
  const confidence=clamp(trend*0.30+money*0.25+momentum*0.25+(100-risk)*0.20);
  const finalScore=clamp(confidence*0.45+potential*0.35+(100-risk)*0.20);
  const safeScore=clamp(trend*0.35+money*0.20+momentum*0.15+(100-risk)*0.30);
  const opportunityScore=clamp(money*0.30+momentum*0.25+patternScore*0.35+trend*0.10-risk*0.10);
  const riskReward=clamp((potential*confidence)/Math.max(risk,20));
  const decision=finalScore>=82?'GÜÇLÜ AL':finalScore>=68?'AL':finalScore>=54?'İZLE':finalScore>=40?'BEKLE':'RİSKLİ';
  const target1=close*(1+Math.max(5,potential/7)/100);
  const target2=close*(1+Math.max(10,potential/4.5)/100);
  const stop=Math.max(donD, close*(1-(4+risk/18)/100));
  const positives=[]; const negatives=[];
  const add=(cond,text)=>cond?positives.push(text):negatives.push(text);
  add(close>(em50[n]??Infinity),'EMA50 üstünde'); add(close>(em200[n]??Infinity),'EMA200 üstünde'); add((em50[n]??0)>(em200[n]??0),'EMA50 > EMA200'); add((mc.m[n]??0)>(mc.s[n]??0),'MACD pozitif'); add((dmi.pdi[n]??0)>(dmi.mdi[n]??0),'+DI alıcı tarafında'); add((dmi.adx[n]??0)>20,'ADX trend gücü yeterli'); add((sup.dir[n]??0)>0,'SuperTrend AL'); add((rs[n]??0)>40&&(rs[n]??0)<70,'RSI sağlıklı bölgede'); add(volumeRatio>1,'Hacim ortalama üstü'); add(risk<50,'Risk kabul edilebilir'); if(formation.name!=='Belirgin formasyon yok') positives.push('Formasyon: '+formation.name);
  return {date:r[n].date,close,prev,change,open:r[n].open,high:r[n].high,low:r[n].low,volume:v[n],volAvg:vol[n]||0,volumeRatio,ema20:em20[n],ema50:em50[n],ema200:em200[n],sma20:ma20[n],sma50:ma50[n],sma200:ma200[n],rsi:rs[n],macd:mc.m[n],signal:mc.s[n],hist:mc.h[n],histPrev:mc.h[n-1],atr:at[n],atrPct,roc:ro[n],mfi:mf[n],obv:ob[n],stochK:sto.k[n],stochD:sto.d[n],cci:cc[n],adx:dmi.adx[n],pdi:dmi.pdi[n],mdi:dmi.mdi[n],superTrend:sup.st[n],superTrendDir:sup.dir[n],donU,donD,trend,money,momentum,pattern:patternScore,formation,risk,potential,confidence,finalScore,safeScore,opportunityScore,riskReward,decision,target1,target2,stop,positives,negatives,ohlcv:r};
}
export function comments(symbol,a){
  const trend=a.trend>=70?'güçlü yükseliş eğiliminde':a.trend>=50?'toparlanma eğiliminde':'zayıf görünümde';
  const money=a.money>=70?'para girişi belirgin':a.money>=50?'para akışı dengeli':'para girişi zayıf';
  const mom=a.momentum>=70?'momentum güçlü':a.momentum>=50?'momentum orta düzeyde':'momentum zayıf';
  const form=a.formation?.name&&a.formation.name!=='Belirgin formasyon yok'?` ${a.formation.name} formasyonu izleniyor.`:'';
  const expert=`${symbol} teknik olarak ${trend}. ${money}. ${mom}. Fiyat EMA50 ${a.close>a.ema50?'üstünde':'altında'}, EMA200 ${a.close>a.ema200?'üstünde':'altında'}. ADX ${fmt(a.adx)} ile ${a.adx>20?'trend gücü yeterli':'trend gücü zayıf'}. +DI/-DI ${fmt(a.pdi)}/${fmt(a.mdi)}. SuperTrend ${a.superTrendDir>0?'AL':'SAT'} tarafında.${form} RSI ${fmt(a.rsi)} seviyesinde.`;
  const ai=`Karar destek motoru ${symbol} için ${a.decision} sonucunu üretiyor. Güven oranı %${fmt(a.confidence,0)}, risk oranı %${fmt(a.risk,0)}, risk/getiri skoru %${fmt(a.riskReward,0)}. ${a.finalScore>=68?'Kapanış teyidi, hedef ve stop bölgesi korunarak işlem planı değerlendirilebilir.':'Henüz güçlü teyit oluşmadığı için izleme veya bekleme daha güvenli görünüyor.'}`;
  return {expert,ai};
}
function fmt(x,d=2){return Number.isFinite(Number(x))?Number(x).toFixed(d):'-';}
