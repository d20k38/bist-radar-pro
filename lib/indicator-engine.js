// R7 Indicator Engine
// Amaç: OHLC/hacim verilerinden geniş gösterge setini tek merkezde hesaplamak.
// Random/pseudo veri üretmez; veri yetersizse ilgili gösterge null döner.

const num=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const round=(x,d=2)=>Number.isFinite(Number(x))?Number(Number(x).toFixed(d)):null;
const clamp=(x,min=0,max=100)=>Math.max(min,Math.min(max,num(x,0)));
const avg=(arr)=>{const a=(arr||[]).map(Number).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null};
const sum=(arr)=>{const a=(arr||[]).map(Number).filter(Number.isFinite);return a.reduce((s,x)=>s+x,0)};
const last=(arr)=>{for(let i=(arr?.length||0)-1;i>=0;i--){const n=Number(arr[i]);if(Number.isFinite(n))return n;}return null};
const pct=(a,b)=>b?((a-b)/b)*100:null;
const series=(rows,key)=>rows.map(r=>num(r[key],null));
function rolling(arr,n,fn){const out=Array(arr.length).fill(null);for(let i=n-1;i<arr.length;i++){out[i]=fn(arr.slice(i-n+1,i+1),i);}return out;}
function sma(arr,n){return rolling(arr,n,w=>avg(w));}
function ema(arr,n){const out=Array(arr.length).fill(null);const k=2/(n+1);let prev=null;for(let i=0;i<arr.length;i++){const v=Number(arr[i]);if(!Number.isFinite(v)){out[i]=prev;continue;}prev=prev===null?v:(v*k+prev*(1-k));out[i]=prev;}return out;}
function wma(arr,n){return rolling(arr,n,w=>{let den=0,tot=0;for(let i=0;i<w.length;i++){const weight=i+1;den+=weight;tot+=num(w[i])*weight;}return den?tot/den:null});}
function hma(arr,n){const half=Math.max(1,Math.round(n/2)),sqrt=Math.max(1,Math.round(Math.sqrt(n)));const w1=wma(arr,half),w2=wma(arr,n);const diff=arr.map((_,i)=>Number.isFinite(w1[i])&&Number.isFinite(w2[i])?2*w1[i]-w2[i]:null);return wma(diff,sqrt);}
function highest(arr,n){return rolling(arr,n,w=>Math.max(...w.filter(Number.isFinite)));}
function lowest(arr,n){return rolling(arr,n,w=>Math.min(...w.filter(Number.isFinite)));}
function stddev(arr,n){return rolling(arr,n,w=>{const m=avg(w);if(m===null)return null;return Math.sqrt(avg(w.map(x=>(x-m)**2)));});}
function rsi(c,n=14){const out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let g=0,l=0;for(let j=i-n+1;j<=i;j++){const d=c[j]-c[j-1];if(d>0)g+=d;else l-=d;}out[i]=l===0?100:100-100/(1+g/l);}return out;}
function macd(c,fast=12,slow=26,signal=9){const f=ema(c,fast),s=ema(c,slow);const line=c.map((_,i)=>Number.isFinite(f[i])&&Number.isFinite(s[i])?f[i]-s[i]:null);const sig=ema(line,signal);const hist=line.map((x,i)=>Number.isFinite(x)&&Number.isFinite(sig[i])?x-sig[i]:null);return{line,signal:sig,hist};}
function trArr(h,l,c){return c.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);}
function atr(h,l,c,n=14){return sma(trArr(h,l,c),n);}
function obv(c,v){const out=[0];for(let i=1;i<c.length;i++)out[i]=out[i-1]+(c[i]>c[i-1]?num(v[i]):c[i]<c[i-1]?-num(v[i]):0);return out;}
function roc(c,n=12){return c.map((x,i)=>i<n?null:pct(x,c[i-n]));}
function momentum(c,n=10){return c.map((x,i)=>i<n?null:x-c[i-n]);}
function stochastic(h,l,c,n=14,smooth=3){const k=c.map((x,i)=>{if(i<n-1)return null;const hi=Math.max(...h.slice(i-n+1,i+1));const lo=Math.min(...l.slice(i-n+1,i+1));return hi!==lo?((x-lo)/(hi-lo))*100:null});const d=sma(k,smooth);return{k,d};}
function stochRsi(c,n=14){const r=rsi(c,n);const st=stochastic(r,r,r,n,3);return st;}
function cci(h,l,c,n=20){const tp=c.map((_,i)=>(h[i]+l[i]+c[i])/3);return rolling(tp,n,w=>{const m=avg(w);const dev=avg(w.map(x=>Math.abs(x-m)));return dev?((w[w.length-1]-m)/(0.015*dev)):null});}
function williamsR(h,l,c,n=14){return c.map((x,i)=>{if(i<n-1)return null;const hi=Math.max(...h.slice(i-n+1,i+1));const lo=Math.min(...l.slice(i-n+1,i+1));return hi!==lo?((hi-x)/(hi-lo))*-100:null;});}
function ultimateOsc(h,l,c){const bp=[],tr=[];for(let i=0;i<c.length;i++){const pc=i?c[i-1]:c[i];bp[i]=c[i]-Math.min(l[i],pc);tr[i]=Math.max(h[i],pc)-Math.min(l[i],pc);}return c.map((_,i)=>{if(i<28)return null;const a7=sum(bp.slice(i-6,i+1))/Math.max(1,sum(tr.slice(i-6,i+1)));const a14=sum(bp.slice(i-13,i+1))/Math.max(1,sum(tr.slice(i-13,i+1)));const a28=sum(bp.slice(i-27,i+1))/Math.max(1,sum(tr.slice(i-27,i+1)));return 100*(4*a7+2*a14+a28)/7;});}
function trix(c,n=15){const e1=ema(c,n),e2=ema(e1,n),e3=ema(e2,n);return e3.map((x,i)=>i?pct(x,e3[i-1]):null);}
function ppo(c){const e12=ema(c,12),e26=ema(c,26);const line=c.map((_,i)=>e26[i]?((e12[i]-e26[i])/e26[i])*100:null);const sig=ema(line,9);const hist=line.map((x,i)=>Number.isFinite(x)&&Number.isFinite(sig[i])?x-sig[i]:null);return{line,signal:sig,hist};}
function dpo(c,n=20){const s=sma(c,n);const shift=Math.floor(n/2)+1;return c.map((x,i)=>i-shift>=0&&Number.isFinite(s[i-shift])?x-s[i-shift]:null);}
function cmf(h,l,c,v,n=20){const out=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let mfv=0,vol=0;for(let j=i-n+1;j<=i;j++){const range=(h[j]-l[j])||1;const mfm=((c[j]-l[j])-(h[j]-c[j]))/range;mfv+=mfm*num(v[j]);vol+=num(v[j]);}out[i]=vol?mfv/vol:null;}return out;}
function mfi(h,l,c,v,n=14){const tp=c.map((_,i)=>(h[i]+l[i]+c[i])/3);const out=Array(c.length).fill(null);for(let i=n;i<c.length;i++){let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){const mf=tp[j]*num(v[j]);if(tp[j]>tp[j-1])pos+=mf;else if(tp[j]<tp[j-1])neg+=mf;}out[i]=neg===0?100:100-100/(1+pos/neg);}return out;}
function vwap(h,l,c,v,n=20){const out=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let pv=0,vol=0;for(let j=i-n+1;j<=i;j++){const tp=(h[j]+l[j]+c[j])/3;pv+=tp*num(v[j]);vol+=num(v[j]);}out[i]=vol?pv/vol:null;}return out;}
function adl(h,l,c,v){const out=[];let acc=0;for(let i=0;i<c.length;i++){const range=(h[i]-l[i])||1;const mfm=((c[i]-l[i])-(h[i]-c[i]))/range;acc+=mfm*num(v[i]);out[i]=acc;}return out;}
function nvi(c,v){const out=[1000];for(let i=1;i<c.length;i++){out[i]=v[i]<v[i-1]?out[i-1]*(1+(c[i]-c[i-1])/c[i-1]):out[i-1];}return out;}
function pvi(c,v){const out=[1000];for(let i=1;i<c.length;i++){out[i]=v[i]>v[i-1]?out[i-1]*(1+(c[i]-c[i-1])/c[i-1]):out[i-1];}return out;}
function forceIndex(c,v,n=13){const raw=c.map((x,i)=>i?(x-c[i-1])*num(v[i]):0);return ema(raw,n);}
function volumeOsc(v,fast=5,slow=20){const vf=sma(v,fast),vs=sma(v,slow);return v.map((_,i)=>vs[i]?((vf[i]-vs[i])/vs[i])*100:null);}
function eom(h,l,v,n=14){const raw=h.map((_,i)=>{if(!i)return null;const dm=((h[i]+l[i])/2)-((h[i-1]+l[i-1])/2);const br=(num(v[i])/100000000)/Math.max(0.0001,h[i]-l[i]);return dm/br;});return sma(raw,n);}
function bollinger(c,n=20,k=2){const mid=sma(c,n),sd=stddev(c,n);return{mid,upper:c.map((_,i)=>Number.isFinite(mid[i])?mid[i]+k*sd[i]:null),lower:c.map((_,i)=>Number.isFinite(mid[i])?mid[i]-k*sd[i]:null),width:c.map((_,i)=>mid[i]?((2*k*sd[i])/mid[i])*100:null)};}
function keltner(h,l,c,n=20,m=2){const mid=ema(c,n),a=atr(h,l,c,10);return{mid,upper:c.map((_,i)=>Number.isFinite(mid[i])?mid[i]+m*num(a[i]):null),lower:c.map((_,i)=>Number.isFinite(mid[i])?mid[i]-m*num(a[i]):null),width:c.map((_,i)=>mid[i]?((m*2*num(a[i]))/mid[i])*100:null)};}
function donchian(h,l,n=20){const hi=highest(h,n),lo=lowest(l,n);return{high:hi,low:lo,mid:hi.map((x,i)=>Number.isFinite(x)&&Number.isFinite(lo[i])?(x+lo[i])/2:null)};}
function parabolicSar(h,l,step=0.02,maxStep=0.2){const out=Array(h.length).fill(null);let bull=true,af=step,ep=h[0],sar=l[0];for(let i=1;i<h.length;i++){sar=sar+af*(ep-sar);if(bull){if(l[i]<sar){bull=false;sar=ep;ep=l[i];af=step;}else if(h[i]>ep){ep=h[i];af=Math.min(maxStep,af+step);}}else{if(h[i]>sar){bull=true;sar=ep;ep=h[i];af=step;}else if(l[i]<ep){ep=l[i];af=Math.min(maxStep,af+step);}}out[i]=sar;}return out;}
function ichimoku(h,l,c){const conv=highest(h,9).map((x,i)=>Number.isFinite(x)&&Number.isFinite(lowest(l,9)[i])?(x+lowest(l,9)[i])/2:null);const base=highest(h,26).map((x,i)=>Number.isFinite(x)&&Number.isFinite(lowest(l,26)[i])?(x+lowest(l,26)[i])/2:null);const spanA=c.map((_,i)=>Number.isFinite(conv[i])&&Number.isFinite(base[i])?(conv[i]+base[i])/2:null);const hi52=highest(h,52),lo52=lowest(l,52);const spanB=hi52.map((x,i)=>Number.isFinite(x)&&Number.isFinite(lo52[i])?(x+lo52[i])/2:null);return{conversion:conv,base,spanA,spanB};}
function adx(h,l,c,n=14){const plusDM=Array(c.length).fill(0),minusDM=Array(c.length).fill(0),tr=trArr(h,l,c);for(let i=1;i<c.length;i++){const up=h[i]-h[i-1],dn=l[i-1]-l[i];plusDM[i]=up>dn&&up>0?up:0;minusDM[i]=dn>up&&dn>0?dn:0;}const atrn=sma(tr,n),pdi=plusDM.map((x,i)=>atrn[i]?100*sma(plusDM,n)[i]/atrn[i]:null),mdi=minusDM.map((x,i)=>atrn[i]?100*sma(minusDM,n)[i]/atrn[i]:null);const dx=pdi.map((x,i)=>Number.isFinite(x)&&Number.isFinite(mdi[i])&&(x+mdi[i])?100*Math.abs(x-mdi[i])/(x+mdi[i]):null);return{adx:sma(dx,n),pdi,mdi};}
function choppiness(h,l,c,n=14){const tr=trArr(h,l,c);return c.map((_,i)=>{if(i<n-1)return null;const trSum=sum(tr.slice(i-n+1,i+1));const hi=Math.max(...h.slice(i-n+1,i+1));const lo=Math.min(...l.slice(i-n+1,i+1));return hi>lo?100*Math.log10(trSum/(hi-lo))/Math.log10(n):null;});}
function ulcerIndex(c,n=14){const hi=highest(c,n);return c.map((x,i)=>{if(i<n-1||!hi[i])return null;const sq=[];for(let j=i-n+1;j<=i;j++){sq.push(Math.min(0,pct(c[j],hi[i]))**2);}return Math.sqrt(avg(sq));});}
function historicalVol(c,n=20){const ret=c.map((x,i)=>i?Math.log(x/c[i-1]):null);return stddev(ret,n).map(x=>Number.isFinite(x)?x*Math.sqrt(252)*100:null);}
function relativeVolume(v,n=20){const av=sma(v,n);return v.map((x,i)=>av[i]?x/av[i]:null);}
function slopeScore(arr,n=5){const cur=last(arr);const idx=(arr?.length||0)-1-n;const prev=idx>=0?num(arr[idx],cur):cur;return cur!==null&&prev?clamp(50+pct(cur,Math.abs(prev)||1)*3):50;}
function scoreFromBool(ok){return ok?75:35;}

export function buildIndicatorBundle(rows, benchmarkRows=[]){
  rows=(rows||[]).filter(r=>Number.isFinite(Number(r.close))&&Number.isFinite(Number(r.high))&&Number.isFinite(Number(r.low)));
  if(rows.length<30) return {success:false,schema:'R7_INDICATOR_ENGINE',error:'Yeterli OHLC/hacim verisi yok',count:0,values:{},series:{},scores:{}};
  const o=series(rows,'open'),h=series(rows,'high'),l=series(rows,'low'),c=series(rows,'close'),v=series(rows,'volume').map(x=>num(x,0));
  const close=last(c), prev=c[c.length-2]||close;
  const s5=sma(c,5),s10=sma(c,10),s20=sma(c,20),s50=sma(c,50),s100=sma(c,100),s200=sma(c,200);
  const e5=ema(c,5),e8=ema(c,8),e10=ema(c,10),e20=ema(c,20),e21=ema(c,21),e50=ema(c,50),e100=ema(c,100),e200=ema(c,200);
  const w20=wma(c,20),w50=wma(c,50),hm20=hma(c,20),hm50=hma(c,50);
  const bb=bollinger(c,20,2),kc=keltner(h,l,c,20,2),dc=donchian(h,l,20),ichi=ichimoku(h,l,c),psar=parabolicSar(h,l),adx14=adx(h,l,c,14);
  const rsi2=rsi(c,2),rsi14=rsi(c,14),stoch=stochastic(h,l,c,14),stRsi=stochRsi(c,14),mac=macd(c),ppoObj=ppo(c),cci20=cci(h,l,c,20),wr=williamsR(h,l,c,14),uo=ultimateOsc(h,l,c),trix15=trix(c,15),roc12=roc(c,12),mom10=momentum(c,10),dpo20=dpo(c,20);
  const ob=obv(c,v),cmf20=cmf(h,l,c,v,20),mfi14=mfi(h,l,c,v,14),vwap20=vwap(h,l,c,v,20),vwma20=sma(c.map((x,i)=>x*v[i]),20).map((x,i)=>sma(v,20)[i]?x/sma(v,20)[i]:null),adlArr=adl(h,l,c,v),nviArr=nvi(c,v),pviArr=pvi(c,v),fi13=forceIndex(c,v,13),vo=volumeOsc(v,5,20),eom14=eom(h,l,v,14),rvol20=relativeVolume(v,20),rvol5=relativeVolume(v,5);
  const atr14=atr(h,l,c,14),hv20=historicalVol(c,20),sd20=stddev(c,20),chop14=choppiness(h,l,c,14),ulcer14=ulcerIndex(c,14);
  let bench5=0,bench20=0,rel5=null,rel20=null;
  if((benchmarkRows||[]).length>=25){const bc=benchmarkRows.map(x=>num(x.close)).filter(Number.isFinite);bench5=pct(last(bc),bc[bc.length-6]);bench20=pct(last(bc),bc[bc.length-21]);rel5=(pct(close,c[c.length-6])||0)-(bench5||0);rel20=(pct(close,c[c.length-21])||0)-(bench20||0);}
  const values={
    close:round(close), changePct:round(pct(close,prev)),
    sma5:round(last(s5)),sma10:round(last(s10)),sma20:round(last(s20)),sma50:round(last(s50)),sma100:round(last(s100)),sma200:round(last(s200)),
    ema5:round(last(e5)),ema8:round(last(e8)),ema10:round(last(e10)),ema20:round(last(e20)),ema21:round(last(e21)),ema50:round(last(e50)),ema100:round(last(e100)),ema200:round(last(e200)),
    wma20:round(last(w20)),wma50:round(last(w50)),hma20:round(last(hm20)),hma50:round(last(hm50)),
    bollingerMid:round(last(bb.mid)),bollingerUpper:round(last(bb.upper)),bollingerLower:round(last(bb.lower)),bollingerWidth:round(last(bb.width)),
    keltnerMid:round(last(kc.mid)),keltnerUpper:round(last(kc.upper)),keltnerLower:round(last(kc.lower)),keltnerWidth:round(last(kc.width)),
    donchianHigh20:round(last(dc.high)),donchianLow20:round(last(dc.low)),donchianMid20:round(last(dc.mid)),
    ichimokuConversion:round(last(ichi.conversion)),ichimokuBase:round(last(ichi.base)),ichimokuSpanA:round(last(ichi.spanA)),ichimokuSpanB:round(last(ichi.spanB)),parabolicSar:round(last(psar)),adx14:round(last(adx14.adx)),pdi14:round(last(adx14.pdi)),mdi14:round(last(adx14.mdi)),
    rsi2:round(last(rsi2)),rsi14:round(last(rsi14)),stochK:round(last(stoch.k)),stochD:round(last(stoch.d)),stochRsiK:round(last(stRsi.k)),stochRsiD:round(last(stRsi.d)),macd:round(last(mac.line)),macdSignal:round(last(mac.signal)),macdHist:round(last(mac.hist)),ppo:round(last(ppoObj.line)),ppoSignal:round(last(ppoObj.signal)),ppoHist:round(last(ppoObj.hist)),roc12:round(last(roc12)),trix15:round(last(trix15)),cci20:round(last(cci20)),williamsR14:round(last(wr)),ultimateOscillator:round(last(uo)),momentum10:round(last(mom10)),dpo20:round(last(dpo20)),
    obv:round(last(ob),0),obvSlopeScore:round(slopeScore(ob,5)),cmf20:round(last(cmf20),4),mfi14:round(last(mfi14)),vwap20:round(last(vwap20)),vwma20:round(last(vwma20)),adl:round(last(adlArr),0),adlSlopeScore:round(slopeScore(adlArr,5)),nvi:round(last(nviArr)),pvi:round(last(pviArr)),forceIndex13:round(last(fi13),0),volumeOscillator:round(last(vo)),easeOfMovement14:round(last(eom14)),rvol20:round(last(rvol20),2),rvol5:round(last(rvol5),2),volume:round(last(v),0),avgVolume20:round(last(sma(v,20)),0),
    atr14:round(last(atr14)),atrPct:round(pct(last(atr14),close)),historicalVol20:round(last(hv20)),stdDev20:round(last(sd20)),choppiness14:round(last(chop14)),ulcerIndex14:round(last(ulcer14)),
    relativeStrength5:round(rel5),relativeStrength20:round(rel20),benchmark5:round(bench5),benchmark20:round(bench20)
  };
  const trendScore=clamp((scoreFromBool(close>last(e20))+scoreFromBool(close>last(e50))+scoreFromBool(close>last(e200))+scoreFromBool(last(e20)>last(e50))+scoreFromBool(last(adx14.adx)>22&&last(adx14.pdi)>last(adx14.mdi)))/5);
  const momentumScore=clamp(((values.rsi14>=45&&values.rsi14<=70?75:values.rsi14>70?55:40)+(values.macdHist>0?75:40)+(values.roc12>0?70:38)+(values.cci20>0?68:42)+(values.ultimateOscillator>50?65:45))/5);
  const volumeScore=clamp(((values.rvol20>=2?85:values.rvol20>=1.2?65:40)+(values.cmf20>0?75:38)+(values.mfi14>=45&&values.mfi14<=80?70:45)+(close>values.vwap20?75:40)+slopeScore(ob,5))/5);
  const volatilityScore=clamp(100-Math.min(70,(values.atrPct||0)*9)+(values.choppiness14<50?8:-5));
  const institutionalScore=clamp(volumeScore*.45+trendScore*.25+momentumScore*.15+(values.relativeStrength20||0)*1.2+values.obvSlopeScore*.15);
  const liquidityScore=clamp(30+Math.log10(Math.max(1,values.volume||1))*8);
  const breakoutScore=clamp((close>values.donchianHigh20*.985?80:45)+(values.rvol20>=1.5?12:0));
  const meanReversionScore=clamp((values.rsi14<35?80:values.rsi14<45?62:40)+(close<values.bollingerLower?15:0));
  const smartMoneyScore=clamp(values.obvSlopeScore*.30+values.adlSlopeScore*.20+(values.cmf20>0?75:35)*.25+(close>values.vwap20?75:40)*.25);
  const scores={trend:round(trendScore,1),momentum:round(momentumScore,1),volume:round(volumeScore,1),volatility:round(volatilityScore,1),institutional:round(institutionalScore,1),smartMoney:round(smartMoneyScore,1),liquidity:round(liquidityScore,1),breakout:round(breakoutScore,1),meanReversion:round(meanReversionScore,1),quality:round(trendScore*.2+momentumScore*.18+volumeScore*.25+institutionalScore*.22+volatilityScore*.1+liquidityScore*.05,1)};
  const indicatorCount=Object.values(values).filter(v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))).length;
  return {success:true,schema:'R7_INDICATOR_ENGINE',count:indicatorCount,groups:{trend:30,momentum:24,volume:22,volatility:10,institutional:10},values,scores,series:{rsi14,macdHist:mac.hist,cmf20,mfi14,rvol20,vwap20,atr14,adx14:adx14.adx},meta:{source:'R7 Indicator Engine',random:false,computedAt:new Date().toISOString()}};
}

export function compactIndicators(bundle){
  const v=bundle?.values||{}, s=bundle?.scores||{};
  return {count:bundle?.count||0, trend:s.trend, momentum:s.momentum, volume:s.volume, volatility:s.volatility, institutional:s.institutional, smartMoney:s.smartMoney, liquidity:s.liquidity, quality:s.quality, rvol20:v.rvol20, vwap20:v.vwap20, obvSlopeScore:v.obvSlopeScore, cmf20:v.cmf20, mfi14:v.mfi14, rsi14:v.rsi14, macdHist:v.macdHist, atrPct:v.atrPct, adx14:v.adx14};
}
