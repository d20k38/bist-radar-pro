import { yahooSymbol } from './symbols.js';

export async function fetchYahooHistory(symbol, range='1y', interval='1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(symbol))}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplits`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 BIST Radar Pro' } });
  if (!r.ok) throw new Error(`Yahoo chart HTTP ${r.status}`);
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  const q = result?.indicators?.quote?.[0];
  const ts = result?.timestamp || [];
  if (!q || !ts.length) throw new Error('Veri bulunamadı');
  const out = ts.map((t,i)=>({
    date: new Date(t*1000).toISOString().slice(0,10),
    open: num(q.open?.[i]), high: num(q.high?.[i]), low: num(q.low?.[i]), close: num(q.close?.[i]), volume: num(q.volume?.[i]) || 0
  })).filter(x=>x.close && x.high && x.low);
  if (out.length < 60) throw new Error('Teknik analiz için yeterli veri yok');
  return out;
}
function num(x){ return Number.isFinite(x) ? Number(x) : null; }
export function arr(data,k){ return data.map(x=>Number(x[k])).filter(x=>Number.isFinite(x)); }
export function avg(a){ return a.reduce((s,x)=>s+x,0) / (a.length || 1); }
export function sma(a,n){ return a.map((_,i)=>i<n-1?null:avg(a.slice(i-n+1,i+1))); }
export function ema(a,n){ const k=2/(n+1), out=[]; a.forEach((v,i)=>{out[i]= i ? v*k+out[i-1]*(1-k) : v;}); return out; }
export function rsi(c,n=14){ const out=Array(c.length).fill(null); for(let i=n;i<c.length;i++){let g=0,l=0; for(let j=i-n+1;j<=i;j++){const d=c[j]-c[j-1]; if(d>0)g+=d; else l-=d;} const rs=g/(l||0.000001); out[i]=100-(100/(1+rs));} return out; }
export function macd(c){ const e12=ema(c,12), e26=ema(c,26); const line=c.map((_,i)=>e12[i]-e26[i]); const signal=ema(line,9); const hist=line.map((v,i)=>v-signal[i]); return {line, signal, hist}; }
export function atr(h,l,c,n=14){ const tr=c.map((_,i)=> i ? Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1])) : h[i]-l[i]); return sma(tr,n); }
export function roc(c,n=12){ return c.map((v,i)=>i<n?null:((v-c[i-n])/c[i-n])*100); }
export function stochastic(h,l,c,n=14){ const k=Array(c.length).fill(null); for(let i=n-1;i<c.length;i++){const hh=Math.max(...h.slice(i-n+1,i+1)); const ll=Math.min(...l.slice(i-n+1,i+1)); k[i]=((c[i]-ll)/((hh-ll)||0.000001))*100;} return {k,d:sma(k.map(x=>x??0),3)}; }
export function cci(h,l,c,n=20){ const tp=c.map((_,i)=>(h[i]+l[i]+c[i])/3); const out=Array(c.length).fill(null); for(let i=n-1;i<c.length;i++){const part=tp.slice(i-n+1,i+1); const m=avg(part); const md=avg(part.map(x=>Math.abs(x-m))) || 0.000001; out[i]=(tp[i]-m)/(0.015*md);} return out; }
export function mfi(h,l,c,v,n=14){ const tp=c.map((_,i)=>(h[i]+l[i]+c[i])/3); const out=Array(c.length).fill(null); for(let i=n;i<c.length;i++){let pos=0,neg=0; for(let j=i-n+1;j<=i;j++){const mf=tp[j]*v[j]; if(tp[j]>tp[j-1]) pos+=mf; else neg+=mf;} out[i]=100-(100/(1+pos/(neg||1)));} return out; }
export function obv(c,v){ const out=[0]; for(let i=1;i<c.length;i++) out[i]=out[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0); return out; }
export function aroon(h,l,n=25){ const up=Array(h.length).fill(null), down=Array(h.length).fill(null); for(let i=n;i<h.length;i++){const hs=h.slice(i-n+1,i+1), ls=l.slice(i-n+1,i+1); const hi=hs.lastIndexOf(Math.max(...hs)); const lo=ls.lastIndexOf(Math.min(...ls)); up[i]=(n-1-hi)/(n-1)*100; down[i]=(n-1-lo)/(n-1)*100;} return {up,down,osc:up.map((x,i)=>x==null?null:x-down[i])}; }
export function analyze(symbol, data, cutIndex=null){
  const d = cutIndex ? data.slice(0, cutIndex) : data;
  const c=arr(d,'close'), h=arr(d,'high'), l=arr(d,'low'), v=arr(d,'volume'); const n=c.length-1;
  const ma20=sma(c,20), ma50=sma(c,50), ma200=sma(c,200); const em20=ema(c,20), em50=ema(c,50), em200=ema(c,200);
  const rs=rsi(c), mc=macd(c), at=atr(h,l,c), ro=roc(c), sto=stochastic(h,l,c), cc=cci(h,l,c), mf=mfi(h,l,c,v), ob=obv(c,v), ar=aroon(h,l);
  const volAvg=sma(v,20)[n] || avg(v.slice(-20)); const donU=Math.max(...h.slice(-20)), donD=Math.min(...l.slice(-20));
  const x={symbol, date:d[n].date, close:c[n], prev:c[n-1], change:(c[n]-c[n-1])/c[n-1]*100, high:h[n], low:l[n], volume:v[n], volAvg, sma20:ma20[n], sma50:ma50[n], sma200:ma200[n], ema20:em20[n], ema50:em50[n], ema200:em200[n], rsi:rs[n], rsiPrev:rs[n-1], macd:mc.line[n], signal:mc.signal[n], hist:mc.hist[n], histPrev:mc.hist[n-1], atr:at[n], roc:ro[n], stochK:sto.k[n], stochD:sto.d[n], cci:cc[n], mfi:mf[n], obv:ob[n], aroonU:ar.up[n], aroonD:ar.down[n], aroon:ar.osc[n], donU, donD};
  const risk = clamp(Math.round((x.atr/x.close)*700 + (x.volume < x.volAvg*0.55 ? 20 : 0) + (Math.abs(x.change)>7?18:0) + (x.rsi>75?10:0)),0,100);
  let trend=0, momentum=0, volumeScore=0, potential=0, confidence=0, reasons=[];
  if(x.close>x.ema50){trend+=20; reasons.push('EMA50 üstü');}
  if(x.close>x.ema200){trend+=20; reasons.push('EMA200 üstü');}
  if(x.ema50>x.ema200){trend+=20; reasons.push('EMA50>EMA200');}
  if((x.aroonU||0)>(x.aroonD||0)) trend+=15;
  if(x.macd>x.signal){momentum+=25; reasons.push('MACD al tarafında');}
  if(x.hist>x.histPrev) momentum+=15;
  if(x.rsi>=42 && x.rsi<=65){momentum+=20; reasons.push('RSI sağlıklı');}
  if(x.roc>0) momentum+=15;
  if(x.volume>x.volAvg*1.3){volumeScore+=35; reasons.push('hacim ortalama üstü');}
  if(x.mfi>=45 && x.mfi<=75) volumeScore+=20;
  if(ob[n]>ob[Math.max(0,n-20)]) volumeScore+=20;
  const nearBreak = x.close > x.donU*0.97; if(nearBreak){potential+=25; reasons.push('dirence yakın/kırılım adayı');}
  if(x.rsi<35 && x.hist>x.histPrev){potential+=25; reasons.push('dipten dönüş ihtimali');}
  if(x.close>x.ema50 && x.prev <= em50[n-1]) potential+=25;
  trend=clamp(trend,0,100); momentum=clamp(momentum,0,100); volumeScore=clamp(volumeScore,0,100); potential=clamp(potential,0,100);
  confidence=clamp(Math.round(trend*.35 + momentum*.25 + volumeScore*.20 + (100-risk)*.20),0,100);
  const safeScore=clamp(Math.round(confidence*.75 + (100-risk)*.25),0,100);
  const opportunityScore=clamp(Math.round(potential*.45 + momentum*.25 + volumeScore*.20 + trend*.10),0,100);
  const rrScore=clamp(Math.round(((confidence+1)*(potential+25))/(risk+25)/1.5),0,100);
  const aiScore=clamp(Math.round(safeScore*.35 + opportunityScore*.35 + rrScore*.30),0,100);
  let decision='BEKLE'; if(safeScore>=78 && risk<45) decision='GÜVENLİ AL'; else if(opportunityScore>=75 && risk<70) decision='FIRSAT AL'; else if(aiScore>=62) decision='İZLE'; else if(risk>70) decision='RİSKLİ';
  return {symbol, x, trend, momentum, volumeScore, potential, confidence, risk, safeScore, opportunityScore, rrScore, aiScore, decision, reasons};
}
export function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
