import {sma,ema,rsi,macd,atr,obv,roc,adx,supertrend} from './indicators.js';
import { buildLayeredConfidence } from './confidence-engine.js';
const clamp=x=>Math.max(0,Math.min(100,Math.round(x||0)));
const min=(a)=>Math.min(...a.filter(Number.isFinite));
const max=(a)=>Math.max(...a.filter(Number.isFinite));
const pct=(a,b)=>b?((a-b)/b)*100:0;
function detectFormations(rows,ctx){
  const c=rows.map(x=>x.close),h=rows.map(x=>x.high),l=rows.map(x=>x.low),v=rows.map(x=>x.volume||0),n=c.length-1;
  const close=c[n], volAvg=ctx.volAvg||1, recent=c.slice(Math.max(0,n-80));
  const hi=max(recent), lo=min(recent), range=Math.max(hi-lo,0.0001);
  const left=c[Math.max(0,n-70)], mid=c[Math.max(0,n-35)], right=close;
  const lows20=l.slice(Math.max(0,n-20)), highs20=h.slice(Math.max(0,n-20));
  const low20=min(lows20), high20=max(highs20);
  const detected=[]; const notes=[];
  const push=(name,score,confidence,targetPct,status,stopHint)=>detected.push({name,score:clamp(score),confidence:clamp(confidence),targetPct:+targetPct.toFixed(1),status,stopHint});
  // Çanak: soldan dibe düşüş ve sağ tarafta toparlanma
  const cupDepth=pct(hi,lo); const recovery=(right-lo)/range*100;
  if(cupDepth>18 && recovery>45 && right<hi*1.06){push('Çanak',58+recovery*.25,55+recovery*.20,Math.min(35,cupDepth*.55),'Boyun çizgisi kırılımı takip edilmeli',`Stop: ${low20.toFixed(2)} altı`); notes.push('Çanak adayında boyun çizgisi ve hacimli kırılım teyidi aranır.');}
  if(cupDepth>18 && recovery>55 && c.slice(Math.max(0,n-10)).every(x=>x>lo*1.08) && close<hi*1.03){push('Çanak-Kulp',68+recovery*.20,65+recovery*.20,Math.min(45,cupDepth*.65),'Kulp bölgesi sıkışıyor olabilir',`Stop: ${low20.toFixed(2)} altı`); notes.push('Çanak-kulp için küçük geri çekilme sonrası hacimli kırılım önemlidir.');}
  // İkili dip / tepe
  const lows60=l.slice(Math.max(0,n-60)); const lowVal=min(lows60); const lowIdx=lows60.indexOf(lowVal); const secondLow=lows60.slice(Math.max(0,lowIdx+8)).reduce((best,x)=>Math.abs(x-lowVal)<Math.abs(best-lowVal)?x:best,Infinity);
  if(Number.isFinite(secondLow) && Math.abs(pct(secondLow,lowVal))<5 && close>lowVal*1.08){push('İkili Dip',70,67,Math.min(25,pct(high20,lowVal)),'Dipler birbirine yakın; dönüş teyidi oluşuyor',`Stop: ${lowVal.toFixed(2)} altı`); notes.push('İkili dipte dip altı stop, ara tepe üzeri kırılım teyit olarak izlenir.');}
  const highs60=h.slice(Math.max(0,n-60)); const highVal=max(highs60); const highIdx=highs60.indexOf(highVal); const secondHigh=highs60.slice(Math.max(0,highIdx+8)).reduce((best,x)=>Math.abs(x-highVal)<Math.abs(best-highVal)?x:best,-Infinity);
  if(Number.isFinite(secondHigh) && Math.abs(pct(secondHigh,highVal))<5 && close<highVal*.94){push('İkili Tepe',65,63,-Math.min(22,pct(highVal,low20)),'Zayıflama / kar satışı riski',`Direnç: ${highVal.toFixed(2)}`); notes.push('İkili tepe satış baskısı uyarısıdır; destek kırılımı risk artırır.');}
  // TOBO/OBO basit omuz-baş-omuz yaklaşımı
  if(c.length>90){const a=c.slice(n-90,n-60),b=c.slice(n-60,n-30),d=c.slice(n-30);const la=min(a), head=min(b), ra=min(d);if(head<la*.94 && head<ra*.94 && Math.abs(pct(ra,la))<10 && close>Math.max(...b)*.9){push('TOBO',72,66,28,'Ters OBO dönüş adayı',`Stop: ${head.toFixed(2)} altı`);notes.push('TOBO için boyun çizgisi üzerinde kapanış aranmalıdır.');}const ta=max(a), hhead=max(b), tra=max(d);if(hhead>ta*1.06 && hhead>tra*1.06 && Math.abs(pct(tra,ta))<10 && close<Math.min(...b)*1.1){push('OBO',68,62,-25,'OBO zayıflama adayı',`Direnç: ${hhead.toFixed(2)}`);notes.push('OBO risk formasyonudur; destek kırılırsa düşüş hızlanabilir.');}}
  // Sıkışma, flama, bayrak, üçgen, kama
  const widthNow=(high20-low20)/close*100, widthPrev=(max(h.slice(Math.max(0,n-60),Math.max(0,n-40)))-min(l.slice(Math.max(0,n-60),Math.max(0,n-40))))/close*100;
  if(widthNow<Math.max(4,widthPrev*.65) && ctx.volumeRatio>1){push('Flama / Sıkışma',62+ctx.volumeRatio*8,60,18,'Dar bantta hacim artışı var',`Stop: ${low20.toFixed(2)} altı`);notes.push('Flama/sıkışma yönü kırılım ile netleşir; hacimli kapanış beklenmelidir.');}
  if(close>ctx.ema20 && ctx.ema20>ctx.ema50 && widthNow<8){push('Bayrak',68,64,20,'Trend içinde kısa soluklanma',`Stop: EMA20 altı`);notes.push('Bayrak formasyonunda ana trend yönünde kırılım pozitif kabul edilir.');}
  const lastHighs=h.slice(Math.max(0,n-30)), lastLows=l.slice(Math.max(0,n-30));
  if(lastHighs[0]>lastHighs[lastHighs.length-1] && lastLows[0]<lastLows[lastLows.length-1]){push('Daralan Kama / Üçgen',66,61,17,'Sıkışma artıyor; yön beklenmeli',`Bant dışı kapanış takip edilmeli`);notes.push('Daralan yapılarda erken işlem yerine kırılım teyidi daha güvenlidir.');}
  if(close>high20*.985 && ctx.volumeRatio>1.25){push('Yükselen Üçgen Kırılımı',76,72,22,'Direnç bölgesi hacimle test ediliyor',`Stop: ${low20.toFixed(2)} altı`);notes.push('Direnç üzerinde hacimli kapanış pozitif teyit sağlar.');}
  if(close<low20*1.015 && ctx.volumeRatio>1.15){push('Alçalan Üçgen Riski',64,60,-18,'Destek bölgesi baskı altında',`Destek: ${low20.toFixed(2)}`);notes.push('Destek altında kapanış risk uyarısıdır.');}
  detected.sort((a,b)=>b.score-a.score);
  const best=detected[0]||{name:'Belirgin formasyon yok',score:35,confidence:40,targetPct:0,status:'Teyit beklenmeli',stopHint:'Teknik stop izlenmeli'};
  return {name:best.name,score:best.score,confidence:best.confidence,targetPct:best.targetPct,detected,notes};
}
export function analyze(rows){
  if(!Array.isArray(rows)||rows.length<60)throw new Error('Yeterli veri yok');
  const c=rows.map(x=>x.close),h=rows.map(x=>x.high),l=rows.map(x=>x.low),v=rows.map(x=>x.volume||0),n=c.length-1;
  const e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),ma20=sma(c,20),ma50=sma(c,50),rs=rsi(c),mc=macd(c),at=atr(h,l,c),ro=roc(c),ob=obv(c,v),vol=sma(v,20),di=adx(h,l,c),sup=supertrend(h,l,c);
  const close=c[n],prev=c[n-1]||close,change=((close-prev)/prev)*100,atrPct=((at[n]||0)/close)*100,volumeRatio=v[n]/(vol[n]||1);
  const ctx={volAvg:vol[n]||0,volumeRatio,ema20:e20[n],ema50:e50[n]};
  const formation=detectFormations(rows,ctx);
  let trend=0,money=0,momentum=0,risk=10,pattern=formation.score||35;
  if(close>e20[n])trend+=15;if(close>e50[n])trend+=25;if(close>e200[n])trend+=25;if(e50[n]>e200[n])trend+=15;if((di.adx[n]||0)>25&&di.pdi[n]>di.mdi[n])trend+=20;if(sup.dir[n]===1)trend+=15;
  if(v[n]>(vol[n]||1)*1.3)money+=35;if(ob[n]>(ob[Math.max(0,n-20)]||0))money+=25;if(v[n]>(vol[n]||1))money+=20;if(close>c[Math.max(0,n-10)])money+=20;
  if(rs[n]>45&&rs[n]<65)momentum+=25;if(mc.m[n]>mc.s[n])momentum+=30;if((mc.h[n]||0)>(mc.h[n-1]||0))momentum+=20;if((ro[n]||0)>0)momentum+=25;
  if(atrPct>6)risk+=35;else if(atrPct>4)risk+=20;else if(atrPct>2.5)risk+=10;if(rs[n]>75)risk+=20;if(Math.abs(change)>7)risk+=20;
  trend=clamp(trend);money=clamp(money);momentum=clamp(momentum);risk=clamp(risk);pattern=clamp(pattern);
  const potential=clamp(trend*.25+money*.22+momentum*.22+pattern*.31);
  const confidence=clamp(trend*.25+money*.18+momentum*.18+pattern*.24+(100-risk)*.15);
  const finalScore=clamp(confidence*.42+potential*.35+(100-risk)*.18+pattern*.05);
  const decision=finalScore>=80?'GÜÇLÜ AL':finalScore>=65?'AL':finalScore>=50?'İZLE':finalScore>=35?'BEKLE':'RİSKLİ';
  const target1=close*(1+Math.max(5,Math.abs(formation.targetPct||potential/7))/100),target2=close*(1+Math.max(10,Math.abs(formation.targetPct||potential/4))*1.25/100),stop=close*(1-(4+risk/18)/100);
  const positives=[],negatives=[];const add=(ok,t)=>ok?positives.push(t):negatives.push(t);
  add(close>e50[n],'EMA50 üstünde');add(close>e200[n],'EMA200 üstünde');add(mc.m[n]>mc.s[n],'MACD pozitif');add((di.adx[n]||0)>25,'ADX trend güçlü');add(sup.dir[n]===1,'SuperTrend AL');add(v[n]>(vol[n]||1),'Hacim ortalama üstü');add(risk<50,'Risk kabul edilebilir');add(pattern>=60,`Formasyon desteği: ${formation.name}`);
  const result={date:rows[n].date,close,prev,change,volume:v[n],volAvg:vol[n]||0,volumeRatio,ema20:e20[n],ema50:e50[n],ema200:e200[n],sma20:ma20[n],sma50:ma50[n],rsi:rs[n],macd:mc.m[n],signal:mc.s[n],hist:mc.h[n],atr:at[n],atrPct,roc:ro[n],obv:ob[n],adx:di.adx[n],pdi:di.pdi[n],mdi:di.mdi[n],superTrend:sup.st[n],superTrendDir:sup.dir[n],trend,money,momentum,pattern,risk,potential,confidence,finalScore,decision,target1,target2,stop,formation,positives,negatives,ohlcv:rows}; result.multiLayer=buildLayeredConfidence({analysis:result}); return result
}
export function comments(symbol,a){return{expert:`${symbol}: Trend ${a.trend}/100, para girişi ${a.money}/100, momentum ${a.momentum}/100. Formasyon: ${a.formation?.name||'Yok'} (${a.pattern}/100). ADX ${Number(a.adx||0).toFixed(1)}, SuperTrend ${a.superTrendDir===1?'AL':'SAT'}.`,ai:`Karar motoru ${symbol} için ${a.decision} sonucunu üretiyor. Formasyon motoru ${a.formation?.name||'belirgin yapı yok'} sonucunu buldu. Güven %${a.confidence}, risk %${a.risk}. Kırılım, hacim ve stop seviyesi birlikte izlenmelidir.`}}
