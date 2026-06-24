export function sma(a,n){return a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1)));}
export function avg(a){const b=a.filter(x=>Number.isFinite(x));return b.length?b.reduce((s,x)=>s+x,0)/b.length:null;}
export function ema(a,n){let k=2/(n+1),out=[];a.forEach((v,i)=>{out[i]=i===0?v:(v*k+out[i-1]*(1-k));});return out;}
export function rsi(c,n=14){let out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let g=0,l=0;for(let j=i-n+1;j<=i;j++){let d=c[j]-c[j-1];if(d>0)g+=d;else l-=d;}let rs=l===0?100:g/l;out[i]=100-(100/(1+rs));}return out;}
export function macd(c){let e12=ema(c,12),e26=ema(c,26),m=c.map((_,i)=>e12[i]-e26[i]),s=ema(m,9),h=m.map((v,i)=>v-s[i]);return{m,s,h};}
export function atr(h,l,c,n=14){let tr=c.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);return sma(tr,n);}
export function roc(c,n=12){return c.map((v,i)=>i<n?null:((v-c[i-n])/c[i-n])*100);}
export function mfi(h,l,c,v,n=14){let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){let mf=tp[j]*v[j];if(tp[j]>tp[j-1])pos+=mf;else neg+=mf;}out[i]=100-(100/(1+pos/(neg||1)));}return out;}
export function obv(c,v){let out=[0];for(let i=1;i<c.length;i++)out[i]=out[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0);return out;}
export function stochastic(h,l,c,n=14){let k=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let hh=Math.max(...h.slice(i-n+1,i+1)),ll=Math.min(...l.slice(i-n+1,i+1));k[i]=hh===ll?50:((c[i]-ll)/(hh-ll))*100;}return{k,d:sma(k.map(x=>x??50),3)};}
export function cci(h,l,c,n=20){let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),out=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let arr=tp.slice(i-n+1,i+1),ma=avg(arr),md=avg(arr.map(x=>Math.abs(x-ma)));out[i]=md?((tp[i]-ma)/(0.015*md)):0;}return out;}
function clamp(x,min=0,max=100){return Math.max(min,Math.min(max,Math.round(x||0)));}
function lastFinite(arr){for(let i=arr.length-1;i>=0;i--)if(Number.isFinite(arr[i]))return arr[i];return null;}
export function analyze(rows, atIndex=null){
  if(!Array.isArray(rows)||rows.length<60) throw new Error('Yeterli OHLCV verisi yok');
  const cut=atIndex==null?rows.length:Math.max(60,Math.min(rows.length,atIndex+1));
  const r=rows.slice(0,cut).filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.high)&&Number.isFinite(x.low));
  const c=r.map(x=>x.close),h=r.map(x=>x.high),l=r.map(x=>x.low),v=r.map(x=>x.volume||0),n=c.length-1;
  const em20=ema(c,20),em50=ema(c,50),em200=ema(c,200),ma20=sma(c,20),ma50=sma(c,50),ma200=sma(c,200),rs=rsi(c),mc=macd(c),at=atr(h,l,c),ro=roc(c),mf=mfi(h,l,c,v),ob=obv(c,v),sto=stochastic(h,l,c),cc=cci(h,l,c),vol=sma(v,20);
  const close=c[n], prev=c[n-1]||close;
  const change=((close-prev)/prev)*100;
  const atrPct=((at[n]||0)/close)*100;
  const donU=Math.max(...h.slice(Math.max(0,n-19),n+1));
  const donD=Math.min(...l.slice(Math.max(0,n-19),n+1));
  let trend=0,money=0,momentum=0,risk=0;
  if(close>(em50[n]??Infinity))trend+=25;
  if(close>(em200[n]??Infinity))trend+=25;
  if((em50[n]??0)>(em200[n]??0))trend+=20;
  if((mc.m[n]??0)>(mc.s[n]??0))trend+=15;
  if(close>(ma50[n]??Infinity))trend+=15;
  if(v[n]>(vol[n]||1)*1.3)money+=35;
  if((mf[n]??0)>50&&(mf[n]??0)<80)money+=25;
  if(ob[n]>(ob[Math.max(0,n-20)]??0))money+=25;
  if(c[n]>c[Math.max(0,n-5)])money+=15;
  if((rs[n]??0)>45&&(rs[n]??0)<65)momentum+=30;
  if((mc.h[n]??0)>(mc.h[n-1]??0))momentum+=25;
  if((ro[n]??0)>0)momentum+=25;
  if(c[n]>c[Math.max(0,n-3)])momentum+=20;
  risk += atrPct>6?40:atrPct>4?28:atrPct>2.5?18:10;
  if(v[n]<(vol[n]||1)*0.7)risk+=20;
  if((rs[n]??0)>75)risk+=20;
  if(Math.abs(change)>7)risk+=25;
  trend=clamp(trend); money=clamp(money); momentum=clamp(momentum); risk=clamp(risk);
  const potential=clamp(trend*0.35+money*0.30+momentum*0.35);
  const confidence=clamp(trend*0.40+money*0.25+momentum*0.25+(100-risk)*0.10);
  const finalScore=clamp((confidence*potential)/Math.max(risk,15)/1.2);
  const decision=finalScore>=80?'GÜÇLÜ AL':finalScore>=65?'AL':finalScore>=50?'İZLE':finalScore>=35?'BEKLE':'RİSKLİ';
  const target1=close*(1+Math.max(5,potential/6)/100);
  const target2=close*(1+Math.max(10,potential/4)/100);
  const stop=Math.max(donD, close*(1-(4+risk/20)/100));
  const positives=[]; const negatives=[];
  const add=(cond,text)=>cond?positives.push(text):negatives.push(text);
  add(close>(em50[n]??Infinity),'EMA50 üstünde'); add(close>(em200[n]??Infinity),'EMA200 üstünde'); add((mc.m[n]??0)>(mc.s[n]??0),'MACD pozitif'); add((rs[n]??0)>40&&(rs[n]??0)<70,'RSI sağlıklı bölgede'); add(v[n]>(vol[n]||1),'Hacim ortalama üstü'); add(risk<50,'Risk kabul edilebilir');
  return {date:r[n].date,close,prev,change,open:r[n].open,high:r[n].high,low:r[n].low,volume:v[n],volAvg:vol[n]||0,ema20:em20[n],ema50:em50[n],ema200:em200[n],sma20:ma20[n],sma50:ma50[n],sma200:ma200[n],rsi:rs[n],macd:mc.m[n],signal:mc.s[n],hist:mc.h[n],histPrev:mc.h[n-1],atr:at[n],atrPct,roc:ro[n],mfi:mf[n],obv:ob[n],stochK:sto.k[n],stochD:sto.d[n],cci:cc[n],donU,donD,trend,money,momentum,risk,potential,confidence,finalScore,decision,target1,target2,stop,positives,negatives,ohlcv:r};
}
export function comments(symbol,a){
  const trend=a.trend>=70?'güçlü yükseliş eğiliminde':a.trend>=50?'toparlanma eğiliminde':'zayıf görünümde';
  const money=a.money>=70?'para girişi belirgin':a.money>=50?'para akışı dengeli':'para girişi zayıf';
  const mom=a.momentum>=70?'momentum güçlü':a.momentum>=50?'momentum orta düzeyde':'momentum zayıf';
  const expert=`${symbol} teknik olarak ${trend}. ${money}. ${mom}. Fiyat EMA50 ${a.close>a.ema50?'üstünde':'altında'}, EMA200 ${a.close>a.ema200?'üstünde':'altında'}. MACD ${a.macd>a.signal?'al tarafında':'zayıf tarafta'}. RSI ${fmt(a.rsi)} seviyesinde.`;
  const ai=`Karar destek motoru ${symbol} için ${a.decision} sonucunu üretiyor. Güven oranı %${a.confidence}, risk oranı %${a.risk}. ${a.finalScore>=65?'Kapanış teyidi ve stop bölgesi korunarak işlem planı değerlendirilebilir.':'Henüz güçlü teyit oluşmadığı için izleme veya bekleme daha güvenli görünüyor.'}`;
  return {expert,ai};
}
function fmt(x){return Number.isFinite(x)?Number(x).toFixed(2):'-';}
