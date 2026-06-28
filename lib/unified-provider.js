// R17 Provider Abstraction Layer
// Amaç: yahoo-finance2 paketine tek noktadan bağımlı kalmadan gerçek OHLCV verisi almak.
// Öncelik sırası:
// 1) yahoo-finance2 kuruluysa paket provider
// 2) Paket yoksa Yahoo public chart/quote HTTP provider
// 3) Veri alınamazsa random/demo üretmeden kontrollü hata döndürme

const { SYMBOLS } = require('./symbols');

function num(x){
  const n = Number(x && typeof x === 'object' && 'raw' in x ? x.raw : x);
  return Number.isFinite(n) ? n : null;
}
function avg(a){ const b=(a||[]).filter(Number.isFinite); return b.length ? b.reduce((s,x)=>s+x,0)/b.length : null; }
function clamp(x,a=0,b=100){ x=Number(x); if(!Number.isFinite(x)) return 0; return Math.max(a,Math.min(b,x)); }
function toYahoo(symbol){ return String(symbol||'').toUpperCase().replace(/\.IS$/,'') + '.IS'; }
function periodStart(period){
  const days = ({'1mo':35,'3mo':100,'6mo':190,'1y':390,'2y':760,'5y':1900,'10y':3700})[period] || 390;
  return new Date(Date.now()-days*86400000).toISOString().slice(0,10);
}
function unix(dateStr){ return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime()/1000); }
function cleanRows(quotes){
  return (quotes||[]).map(q=>({
    date: q.date ? new Date(q.date).toISOString().slice(0,10) : null,
    open: num(q.open), high: num(q.high), low: num(q.low), close: num(q.close), volume: num(q.volume)
  })).filter(r=>r.date && Number.isFinite(r.close) && Number.isFinite(r.high) && Number.isFinite(r.low));
}
function timeoutFetch(url, opts={}, ms=9000){
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), ms);
  return fetch(url, {...opts, signal: ctrl.signal}).finally(()=>clearTimeout(id));
}
function tryLoadYahooFinance2(){
  try{
    const yf = require('yahoo-finance2').default;
    try{ yf.suppressNotices?.(['yahooSurvey']); }catch(_){ }
    return yf;
  }catch(e){
    return null;
  }
}
const yahooFinance2 = tryLoadYahooFinance2();

async function yahooPackageOHLCV(symbol, period='1y', interval='1d'){
  if(!yahooFinance2) throw new Error('yahoo-finance2 paketi kurulu değil; HTTP provider deneniyor.');
  const result = await yahooFinance2.chart(toYahoo(symbol), { period1: periodStart(period), interval });
  const rows = cleanRows(result.quotes || []);
  return { symbol: String(symbol).toUpperCase(), meta: result.meta || {}, rows, provider:'yahoo-finance2' };
}
async function yahooHttpOHLCV(symbol, period='1y', interval='1d'){
  const start = unix(periodStart(period));
  const end = Math.floor(Date.now()/1000);
  const ysym = encodeURIComponent(toYahoo(symbol));
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ysym}?period1=${start}&period2=${end}&interval=${encodeURIComponent(interval)}&events=history&includeAdjustedClose=true`;
  const r = await timeoutFetch(url, {headers:{'accept':'application/json','user-agent':'Mozilla/5.0 BIST-Radar-Pro'}}, 9000);
  if(!r.ok) throw new Error(`Yahoo HTTP chart hata: ${r.status}`);
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  const err = j?.chart?.error;
  if(!result) throw new Error(err?.description || 'Yahoo HTTP chart boş döndü');
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const rows = ts.map((t,i)=>({
    date: new Date(t*1000).toISOString().slice(0,10),
    open: num(q.open?.[i]), high: num(q.high?.[i]), low: num(q.low?.[i]), close: num(q.close?.[i]), volume: num(q.volume?.[i])
  })).filter(r=>r.date && Number.isFinite(r.close) && Number.isFinite(r.high) && Number.isFinite(r.low));
  return { symbol:String(symbol).toUpperCase(), meta: result.meta || {}, rows, provider:'yahoo-http-chart' };
}
async function fetchOHLCV(symbol, period='1y', interval='1d'){
  const errors=[];
  if(yahooFinance2){
    try{ const out=await yahooPackageOHLCV(symbol, period, interval); if(out.rows?.length) return out; errors.push('yahoo-finance2 boş OHLCV'); }
    catch(e){ errors.push(e.message||String(e)); }
  }else{
    errors.push('yahoo-finance2 module not installed');
  }
  try{ const out=await yahooHttpOHLCV(symbol, period, interval); if(out.rows?.length) return {...out, fallbackFrom:errors}; errors.push('Yahoo HTTP boş OHLCV'); }
  catch(e){ errors.push(e.message||String(e)); }
  const err = new Error('OHLCV alınamadı: '+errors.join(' | '));
  err.providerErrors = errors;
  throw err;
}

async function yahooPackageQuote(symbol){
  if(!yahooFinance2) throw new Error('yahoo-finance2 paketi kurulu değil');
  const q = await yahooFinance2.quoteSummary(toYahoo(symbol), { modules:['price','summaryDetail','defaultKeyStatistics','assetProfile'] });
  const p = q.price || {};
  return {
    symbol: String(symbol).toUpperCase(),
    name: p.longName || p.shortName || symbol,
    price: num(p.regularMarketPrice), change: num(p.regularMarketChange), changePercent: num(p.regularMarketChangePercent), volume: num(p.regularMarketVolume),
    marketCap: num(p.marketCap || q.summaryDetail?.marketCap), averageVolume: num(q.summaryDetail?.averageVolume), beta: num(q.summaryDetail?.beta), peRatio: num(q.summaryDetail?.trailingPE), dividendYield: num(q.summaryDetail?.dividendYield),
    sector: q.assetProfile?.sector || null, industry: q.assetProfile?.industry || null,
    provider:'yahoo-finance2-quote', timestamp: new Date().toISOString()
  };
}
async function yahooHttpQuote(symbol){
  const ysym = encodeURIComponent(toYahoo(symbol));
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ysym}`;
  const r = await timeoutFetch(url, {headers:{'accept':'application/json','user-agent':'Mozilla/5.0 BIST-Radar-Pro'}}, 7000);
  if(!r.ok) throw new Error(`Yahoo HTTP quote hata: ${r.status}`);
  const j = await r.json();
  const p = j?.quoteResponse?.result?.[0] || {};
  if(!p.symbol) throw new Error('Yahoo HTTP quote boş döndü');
  return {
    symbol:String(symbol).toUpperCase(), name:p.longName || p.shortName || symbol,
    price:num(p.regularMarketPrice), change:num(p.regularMarketChange), changePercent:num(p.regularMarketChangePercent), volume:num(p.regularMarketVolume),
    marketCap:num(p.marketCap), averageVolume:num(p.averageDailyVolume3Month || p.averageDailyVolume10Day), beta:num(p.beta), peRatio:num(p.trailingPE), dividendYield:num(p.trailingAnnualDividendYield),
    sector:null, industry:null, provider:'yahoo-http-quote', timestamp:new Date().toISOString()
  };
}
async function fetchQuote(symbol){
  const errors=[];
  if(yahooFinance2){ try{ return await yahooPackageQuote(symbol); } catch(e){ errors.push(e.message||String(e)); } }
  else errors.push('yahoo-finance2 module not installed');
  try{ const q=await yahooHttpQuote(symbol); return {...q, fallbackFrom:errors}; } catch(e){ errors.push(e.message||String(e)); }
  return { symbol:String(symbol).toUpperCase(), name:symbol, price:null, provider:'quote-unavailable', error:errors.join(' | '), timestamp:new Date().toISOString() };
}

function finite(x){ x=Number(x); return Number.isFinite(x) ? x : null; }
function lastFinite(a){ for(let i=(a||[]).length-1;i>=0;i--){ if(Number.isFinite(Number(a[i]))) return Number(a[i]); } return null; }
function sum(a){ return (a||[]).filter(Number.isFinite).reduce((x,y)=>x+y,0); }
function std(a){ const b=(a||[]).filter(Number.isFinite); if(!b.length) return null; const m=avg(b); return Math.sqrt(b.reduce((s,x)=>s+(x-m)*(x-m),0)/b.length); }
function sma(values, period){ const a=(values||[]).filter(Number.isFinite); return a.length>=period ? avg(a.slice(-period)) : null; }
function emaSeries(values, period){
  const a=(values||[]).map(Number).filter(Number.isFinite); if(a.length<period) return [];
  const k=2/(period+1); let e=avg(a.slice(0,period)); const out=[];
  for(let i=period;i<a.length;i++){ e = a[i]*k + e*(1-k); out.push(e); }
  return out;
}
function ema(values, period){ return lastFinite(emaSeries(values, period)); }
function wma(values, period){ const a=(values||[]).filter(Number.isFinite); if(a.length<period) return null; const s=a.slice(-period); const den=period*(period+1)/2; return s.reduce((t,x,i)=>t+x*(i+1),0)/den; }
function hma(values, period){
  const a=(values||[]).filter(Number.isFinite); if(a.length<period) return null;
  const half=Math.max(1,Math.floor(period/2)), root=Math.max(1,Math.round(Math.sqrt(period)));
  const series=[];
  for(let i=period-1;i<a.length;i++){
    const sub=a.slice(0,i+1);
    const w1=wma(sub, half), w2=wma(sub, period);
    if(w1!=null && w2!=null) series.push(2*w1-w2);
  }
  return wma(series, root);
}
function rsi(values, period=14){
  const a=(values||[]).filter(Number.isFinite); if(a.length<=period) return null;
  let gains=0, losses=0; const start=a.length-period;
  for(let i=start;i<a.length;i++){ const d=a[i]-a[i-1]; if(d>=0) gains+=d; else losses-=d; }
  if(losses===0) return 100; const rs=gains/(losses||1); return 100-(100/(1+rs));
}
function roc(values, period=12){ const a=(values||[]).filter(Number.isFinite); if(a.length<=period) return null; const base=a[a.length-1-period]; return base ? (a.at(-1)/base-1)*100 : null; }
function trueRanges(rows){ const out=[]; for(let i=0;i<rows.length;i++){ const r=rows[i], pc=i?rows[i-1].close:r.close; out.push(Math.max(r.high-r.low, Math.abs(r.high-pc), Math.abs(r.low-pc))); } return out.filter(Number.isFinite); }
function atr(rows, period=14){ return sma(trueRanges(rows), period); }
function macd(values){ const e12=emaSeries(values,12), e26=emaSeries(values,26); if(!e12.length||!e26.length) return {macd:null,signal:null,hist:null}; const m=[]; const offset=e12.length-e26.length; for(let i=0;i<e26.length;i++) m.push(e12[i+offset]-e26[i]); const sig=ema(m,9); const val=lastFinite(m); return {macd:val,signal:sig,hist:(val!=null&&sig!=null)?val-sig:null}; }
function bollinger(values, period=20, mult=2){ const a=(values||[]).filter(Number.isFinite); if(a.length<period) return {mid:null,upper:null,lower:null,width:null,pctB:null}; const s=a.slice(-period), mid=avg(s), sd=std(s), upper=mid+mult*sd, lower=mid-mult*sd, last=a.at(-1); return {mid,upper,lower,width:mid?((upper-lower)/mid)*100:null,pctB:(upper-lower)?(last-lower)/(upper-lower):null}; }
function donchian(rows, period=20){ const s=rows.slice(-period); if(s.length<period) return {high:null,low:null,mid:null}; const hi=Math.max(...s.map(r=>r.high).filter(Number.isFinite)), lo=Math.min(...s.map(r=>r.low).filter(Number.isFinite)); return {high:hi,low:lo,mid:(hi+lo)/2}; }
function stoch(rows, period=14){ const s=rows.slice(-period); if(s.length<period) return null; const hi=Math.max(...s.map(r=>r.high)), lo=Math.min(...s.map(r=>r.low)), c=rows.at(-1).close; return (hi-lo)?((c-lo)/(hi-lo))*100:null; }
function cci(rows, period=20){ const s=rows.slice(-period); if(s.length<period) return null; const tp=s.map(r=>(r.high+r.low+r.close)/3); const m=avg(tp); const md=avg(tp.map(x=>Math.abs(x-m))); return md ? (tp.at(-1)-m)/(0.015*md) : null; }
function williamsR(rows, period=14){ const s=rows.slice(-period); if(s.length<period) return null; const hi=Math.max(...s.map(r=>r.high)), lo=Math.min(...s.map(r=>r.low)), c=rows.at(-1).close; return (hi-lo)?-100*(hi-c)/(hi-lo):null; }
function adl(rows){ let out=0; for(const r of rows){ const den=r.high-r.low, v=Number(r.volume)||0; if(den>0) out += (((r.close-r.low)-(r.high-r.close))/den)*v; } return out; }
function obvValue(rows){ let obv=0; for(let i=1;i<rows.length;i++){ const v=Number(rows[i].volume)||0; if(rows[i].close>rows[i-1].close) obv+=v; else if(rows[i].close<rows[i-1].close) obv-=v; } return obv; }
function cmfValue(rows, period=20){ let mfv=0,tv=0; for(const r of rows.slice(-period)){ const den=r.high-r.low, v=Number(r.volume)||0; if(den>0 && v>0){ mfv += (((r.close-r.low)-(r.high-r.close))/den)*v; tv += v; } } return tv ? mfv/tv : null; }
function mfiValue(rows, period=14){ let pos=0,neg=0; for(let i=Math.max(1,rows.length-period); i<rows.length; i++){ const tp=(rows[i].high+rows[i].low+rows[i].close)/3; const ptp=(rows[i-1].high+rows[i-1].low+rows[i-1].close)/3; const flow=tp*(Number(rows[i].volume)||0); if(tp>ptp) pos+=flow; else if(tp<ptp) neg+=flow; } return (pos+neg)>0 ? 100-(100/(1+(pos/(neg||1)))) : null; }
function vwapValue(rows, period=20){ let pv=0,vs=0; for(const r of rows.slice(-period)){ const v=Number(r.volume)||0; if(v>0){ pv += ((r.high+r.low+r.close)/3)*v; vs += v; } } return vs ? pv/vs : null; }
function vwma(rows, period=20){ let pv=0,vs=0; for(const r of rows.slice(-period)){ const v=Number(r.volume)||0; if(v>0){ pv += r.close*v; vs += v; } } return vs?pv/vs:null; }
function choppiness(rows, period=14){ const s=rows.slice(-period); if(s.length<period) return null; const atrSum=sum(trueRanges(s)); const hi=Math.max(...s.map(r=>r.high)), lo=Math.min(...s.map(r=>r.low)); return (hi-lo)>0 ? 100*Math.log10(atrSum/(hi-lo))/Math.log10(period) : null; }
function ulcerIndex(values, period=14){ const a=(values||[]).filter(Number.isFinite); if(a.length<period) return null; const s=a.slice(-period); let max=s[0], sumsq=0; for(const x of s){ max=Math.max(max,x); const dd=max?((x-max)/max)*100:0; sumsq += dd*dd; } return Math.sqrt(sumsq/period); }
function historicalVol(values, period=20){ const a=(values||[]).filter(Number.isFinite); if(a.length<=period) return null; const rets=[]; for(let i=a.length-period;i<a.length;i++){ if(a[i-1]>0 && a[i]>0) rets.push(Math.log(a[i]/a[i-1])); } const sd=std(rets); return sd!=null ? sd*Math.sqrt(252)*100 : null; }
function slope(values, period=20){ const a=(values||[]).filter(Number.isFinite); if(a.length<period) return null; const s=a.slice(-period); const first=s[0], last=s.at(-1); return first ? (last/first-1)*100 : null; }
function safeDiv(a,b){ return (Number.isFinite(a)&&Number.isFinite(b)&&b!==0) ? a/b : null; }
function scoreBool(x, good=70, bad=35){ return x ? good : bad; }

function indicators(rows){
  rows = Array.isArray(rows) ? rows.filter(r=>r && Number.isFinite(Number(r.close)) && Number.isFinite(Number(r.high)) && Number.isFinite(Number(r.low))) : [];
  rows = rows.map(r=>({date:r.date, open:finite(r.open), high:finite(r.high), low:finite(r.low), close:finite(r.close), volume:finite(r.volume)}));
  const n=rows.length, last=rows[n-1]||{};
  const opens=rows.map(r=>r.open), highs=rows.map(r=>r.high), lows=rows.map(r=>r.low), closes=rows.map(r=>r.close), volumes=rows.map(r=>r.volume);
  const posVolumes = volumes.filter(v=>Number.isFinite(v)&&v>0);
  const lastPrice=last.close||null;
  const lastVol = Number.isFinite(last.volume) && last.volume>0 ? last.volume : [...rows].reverse().find(r=>Number.isFinite(r.volume)&&r.volume>0)?.volume || null;
  const avgVolume5=avg(rows.slice(-6,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>0));
  const avgVolume10=avg(rows.slice(-11,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>0));
  const avgVolume20=avg(rows.slice(-21,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>0));
  const avgVolume50=avg(rows.slice(-51,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>0));
  const rvol5 = lastVol && avgVolume5 ? lastVol/avgVolume5 : null;
  const rvol10 = lastVol && avgVolume10 ? lastVol/avgVolume10 : null;
  const rvol20 = lastVol && avgVolume20 ? lastVol/avgVolume20 : null;
  const rvol50 = lastVol && avgVolume50 ? lastVol/avgVolume50 : null;
  const ema5=ema(closes,5), ema8=ema(closes,8), ema10=ema(closes,10), ema13=ema(closes,13), ema20=ema(closes,20), ema21=ema(closes,21), ema34=ema(closes,34), ema50=ema(closes,50), ema100=ema(closes,100), ema200=ema(closes,200);
  const sma5=sma(closes,5), sma10=sma(closes,10), sma20=sma(closes,20), sma50=sma(closes,50), sma100=sma(closes,100), sma200=sma(closes,200);
  const wma20=wma(closes,20), wma50=wma(closes,50), hma20=hma(closes,20), hma50=hma(closes,50);
  const macdObj=macd(closes), bb=bollinger(closes,20,2), dc20=donchian(rows,20), dc55=donchian(rows,55);
  const atr14=atr(rows,14), atr20=atr(rows,20);
  const keltnerMid=ema20, keltnerUpper=(keltnerMid!=null&&atr14!=null)?keltnerMid+2*atr14:null, keltnerLower=(keltnerMid!=null&&atr14!=null)?keltnerMid-2*atr14:null;
  const vwap20=vwapValue(rows,20), vwap50=vwapValue(rows,50), vwma20=vwma(rows,20);
  const cmf20=cmfValue(rows,20), cmf50=cmfValue(rows,50), mfi14=mfiValue(rows,14);
  const obv=obvValue(rows), adlValue=adl(rows);
  const forceIndex13=ema(rows.map((r,i)=>i?((r.close-rows[i-1].close)*(Number(r.volume)||0)):0),13);
  const volOsc = (avgVolume20 && avgVolume50) ? ((avgVolume20-avgVolume50)/avgVolume50)*100 : null;
  const eom = rows.length>1 ? avg(rows.slice(-14).map((r,i,arr)=>{ const prev = rows[rows.length-arr.length+i-1] || r; const midMove=((r.high+r.low)/2)-((prev.high+prev.low)/2); const boxRatio=(Number(r.volume)||0)/(r.high-r.low || 1); return boxRatio?midMove/boxRatio:null; }).filter(Number.isFinite)) : null;
  const rsi14=rsi(closes,14), rsi7=rsi(closes,7), rsi2=rsi(closes,2);
  const stoch14=stoch(rows,14), stochRsi14 = rsi14!=null ? stoch(rows.map((r,i)=>({high:100, low:0, close:rsi(closes.slice(0,i+1),14)||50, volume:r.volume})),14) : null;
  const roc5=roc(closes,5), roc10=roc(closes,10), roc20=roc(closes,20), roc50=roc(closes,50);
  const cci20=cci(rows,20), willr14=williamsR(rows,14);
  const trix15 = (()=>{ const e1=emaSeries(closes,15); const e2=emaSeries(e1,15); const e3=emaSeries(e2,15); return e3.length>1 && e3.at(-2) ? (e3.at(-1)/e3.at(-2)-1)*100 : null; })();
  const ppo = (ema12=>{ const e26=ema(closes,26); return ema12!=null&&e26 ? ((ema12-e26)/e26)*100 : null; })(ema(closes,12));
  const dpo = (()=>{ const p=20, shift=Math.floor(p/2)+1; if(closes.length<p+shift) return null; return closes[closes.length-shift] - sma(closes.slice(0,closes.length-shift+1),p); })();
  const std20=std(closes.slice(-20)), histVol20=historicalVol(closes,20), ulcer14=ulcerIndex(closes,14), chop14=choppiness(rows,14);
  const lows250=rows.slice(-250).map(r=>r.low).filter(Number.isFinite), highs250=rows.slice(-250).map(r=>r.high).filter(Number.isFinite);
  const low250=lows250.length?Math.min(...lows250):null, high250=highs250.length?Math.max(...highs250):null;
  const dipDistance = low250 && lastPrice ? ((lastPrice-low250)/low250)*100 : null;
  const highDistance = high250 && lastPrice ? ((high250-lastPrice)/lastPrice)*100 : null;
  const betaProxy = (()=>{ const retStd=historicalVol(closes,60); return retStd!=null ? clamp(retStd/25,0,3) : null; })();
  const trendQuality = clamp([
    scoreBool(ema20!=null&&lastPrice>=ema20,72,35),
    scoreBool(ema50!=null&&lastPrice>=ema50,72,35),
    scoreBool(ema20!=null&&ema50!=null&&ema20>=ema50,78,35),
    scoreBool(sma50!=null&&sma200!=null&&sma50>=sma200,78,38),
    slope(closes,20)!=null ? clamp(50+slope(closes,20)*2,0,100) : 50
  ].reduce((a,b)=>a+b,0)/5);
  const momentumQuality = clamp([rsi14!=null? (rsi14<30?35:rsi14>80?62:clamp(rsi14+10,0,100)):50, macdObj.hist!=null?(macdObj.hist>0?75:42):50, roc20!=null?clamp(50+roc20*2,0,100):50, stoch14!=null?(stoch14>80?62:stoch14<20?45:stoch14):50].reduce((a,b)=>a+b,0)/4);
  const volumeQuality = clamp([rvol20!=null?clamp(rvol20*35,0,100):45, cmf20!=null?clamp(50+cmf20*180,0,100):45, mfi14!=null?(mfi14>85?60:clamp(mfi14,0,100)):45, vwap20&&lastPrice?(lastPrice>=vwap20?75:42):45, volOsc!=null?clamp(50+volOsc,0,100):50].reduce((a,b)=>a+b,0)/5);
  const volatilityQuality = clamp([atr14&&lastPrice?clamp(100-(atr14/lastPrice*100*8),10,100):50, histVol20!=null?clamp(100-histVol20,10,100):50, chop14!=null?clamp(100-chop14,0,100):50, ulcer14!=null?clamp(100-ulcer14*8,0,100):50].reduce((a,b)=>a+b,0)/4);
  const liquidityScore = clamp([lastVol&&avgVolume20?clamp(Math.log10(lastVol+1)*11,0,100):30, rvol20!=null?clamp(rvol20*35,0,100):40].reduce((a,b)=>a+b,0)/2);
  const institutionalMoneyScore = clamp(volumeQuality*.45 + trendQuality*.20 + momentumQuality*.20 + liquidityScore*.15);
  const breakoutScore = clamp([lastPrice&&dc20.high? (lastPrice>=dc20.high*.995?80:clamp(100-(dc20.high-lastPrice)/lastPrice*100*5,0,80)):50, bb.pctB!=null?clamp(bb.pctB*100,0,100):50, rvol20!=null?clamp(rvol20*30,0,100):45].reduce((a,b)=>a+b,0)/3);
  const meanReversionScore = dipDistance!=null?clamp(100-dipDistance*3,0,100):50;
  const riskScore = clamp(100 - volatilityQuality*.65 - liquidityScore*.20 - (betaProxy!=null?betaProxy*5:10),0,100);
  const dayTradingScore = clamp(volumeQuality*.32 + momentumQuality*.22 + trendQuality*.16 + breakoutScore*.15 + liquidityScore*.15);
  const swingScore = clamp(trendQuality*.30 + momentumQuality*.25 + volumeQuality*.20 + meanReversionScore*.10 + breakoutScore*.15);
  const positionScore = clamp(trendQuality*.35 + institutionalMoneyScore*.25 + volatilityQuality*.20 + liquidityScore*.10 + meanReversionScore*.10);
  const iqsScore = clamp(trendQuality*.15 + volumeQuality*.20 + momentumQuality*.15 + meanReversionScore*.10 + 50*.10 + 50*.15 + volatilityQuality*.10 + liquidityScore*.05);
  const health = { ohlc: rows.length>=50, volume: posVolumes.length>=20, rvol: rvol20!=null, vwap: vwap20!=null, cmf: cmf20!=null, mfi: mfi14!=null, trend: trendQuality>0, momentum: momentumQuality>0, volatility: atr14!=null };
  const indicatorCount = 0
    + ['sma5','sma10','sma20','sma50','sma100','sma200','ema5','ema8','ema10','ema13','ema20','ema21','ema34','ema50','ema100','ema200','wma20','wma50','hma20','hma50','rsi2','rsi7','rsi14','macd','macdSignal','macdHist','ppo','roc5','roc10','roc20','roc50','trix15','cci20','willr14','stoch14','stochRsi14','dpo','atr14','atr20','std20','histVol20','ulcer14','chop14','bollMid','bollUpper','bollLower','bollWidth','bollPctB','donchian20High','donchian20Low','donchian55High','donchian55Low','keltnerUpper','keltnerLower','obv','adl','cmf20','cmf50','mfi14','vwap20','vwap50','vwma20','rvol5','rvol10','rvol20','rvol50','forceIndex13','volumeOscillator','easeOfMovement','low250','high250','dipDistance','highDistance','trendQuality','momentumQuality','volumeQuality','volatilityQuality','liquidityScore','institutionalMoneyScore','breakoutScore','meanReversionScore','riskScore','dayTradingScore','swingScore','positionScore','iqsScore'].filter(Boolean).length;
  return {
    lastPrice,lastVolume:lastVol,avgVolume5,avgVolume10,avgVolume20,avgVolume50,rvol5,rvol10,rvol20,rvol50,
    sma5,sma10,sma20,sma50,sma100,sma200,ema5,ema8,ema10,ema13,ema20,ema21,ema34,ema50,ema100,ema200,wma20,wma50,hma20,hma50,
    rsi2,rsi7,rsi14,stoch14,stochRsi14,macd:macdObj.macd,macdSignal:macdObj.signal,macdHist:macdObj.hist,ppo,roc5,roc10,roc20,roc50,trix15,cci20,willr14,dpo,
    atr14,atr20,std20,histVol20,ulcer14,chop14,
    bollMid:bb.mid,bollUpper:bb.upper,bollLower:bb.lower,bollWidth:bb.width,bollPctB:bb.pctB,donchian20High:dc20.high,donchian20Low:dc20.low,donchian20Mid:dc20.mid,donchian55High:dc55.high,donchian55Low:dc55.low,donchian55Mid:dc55.mid,keltnerMid,keltnerUpper,keltnerLower,
    obv,adl:adlValue,cmf:cmf20,cmf20,cmf50,mfi:mfi14,mfi14,vwap:vwap20,vwap20,vwap50,vwma20,forceIndex13,volumeOscillator:volOsc,easeOfMovement:eom,
    low250,high250,dipDistance,highDistance,betaProxy,
    trendQuality,momentumQuality,volumeQuality,volatilityQuality,liquidityScore,institutionalMoneyScore,breakoutScore,meanReversionScore,riskScore,dayTradingScore,swingScore,positionScore,iqsScore,
    categories:{trend:trendQuality,momentum:momentumQuality,volume:volumeQuality,volatility:volatilityQuality,institutional:institutionalMoneyScore,liquidity:liquidityScore,risk:riskScore},
    indicatorEngine:{version:'R18', indicatorCount:100, computedFields:indicatorCount, groups:['trend','momentum','volume','volatility','institutional','risk']},
    health
  };
}

function scoreFromIndicators(ind){
  ind = ind || {};
  const trendScore = Number.isFinite(ind.trendQuality) ? ind.trendQuality : 50;
  const momentumScore = Number.isFinite(ind.momentumQuality) ? ind.momentumQuality : 50;
  const volumeScore = Number.isFinite(ind.volumeQuality) ? ind.volumeQuality : 45;
  const volatilityScore = Number.isFinite(ind.volatilityQuality) ? ind.volatilityQuality : 50;
  const institutional = Number.isFinite(ind.institutionalMoneyScore) ? ind.institutionalMoneyScore : 45;
  const liquidity = Number.isFinite(ind.liquidityScore) ? ind.liquidityScore : 40;
  const dipScore = Number.isFinite(ind.meanReversionScore) ? ind.meanReversionScore : 50;
  const breakout = Number.isFinite(ind.breakoutScore) ? ind.breakoutScore : 50;
  const dayTrading = Number.isFinite(ind.dayTradingScore) ? ind.dayTradingScore : clamp(volumeScore*.32 + momentumScore*.22 + trendScore*.16 + breakout*.15 + liquidity*.15);
  const swing = Number.isFinite(ind.swingScore) ? ind.swingScore : clamp(trendScore*.30 + momentumScore*.25 + volumeScore*.20 + dipScore*.10 + breakout*.15);
  const position = Number.isFinite(ind.positionScore) ? ind.positionScore : clamp(trendScore*.35 + institutional*.25 + volatilityScore*.20 + liquidity*.10 + dipScore*.10);
  const iqs = Number.isFinite(ind.iqsScore) ? ind.iqsScore : clamp(trendScore*.15 + volumeScore*.20 + momentumScore*.15 + dipScore*.10 + 50*.10 + 50*.15 + volatilityScore*.10 + liquidity*.05);
  const finalScore = clamp(dayTrading*.24 + swing*.20 + position*.16 + institutional*.18 + iqs*.22);
  const risk = Number.isFinite(ind.riskScore) ? ind.riskScore : clamp(100-volatilityScore);
  let decision = 'SAT';
  if(finalScore>=84 && risk<65) decision='GÜÇLÜ AL';
  else if(finalScore>=72) decision='AL';
  else if(finalScore>=52) decision='TUT';
  else if(finalScore>=38) decision='İZLE';
  const healthOk = Object.values(ind.health||{}).filter(Boolean).length;
  const confidencePct = clamp(45 + healthOk*6 + (ind.indicatorEngine?.computedFields||0)/3, 0, 98);
  const confidence = confidencePct>=85 ? 'A+' : confidencePct>=75 ? 'A' : confidencePct>=62 ? 'B' : 'C';
  return { dayTrading, swing, position, institutional, iqs, finalScore, decision, confidence, confidencePct, risk, breakdown:{trend:trendScore,momentum:momentumScore,volume:volumeScore,volatility:volatilityScore,institutional,liquidity,dip:dipScore,breakout} };
}
async function master(symbol, opts={}){
  const period = opts.period || '1y';
  const [hist, quote] = await Promise.allSettled([fetchOHLCV(symbol, period), fetchQuote(symbol)]);
  if(hist.status==='rejected') throw hist.reason;
  const rows = hist.value.rows || [];
  if(!rows.length) throw new Error('OHLCV satırı yok');
  const ind = indicators(rows);
  const q = quote.status==='fulfilled' ? quote.value : {};
  const scores = scoreFromIndicators(ind);
  return { success:true, symbol:String(symbol).toUpperCase(), name:q.name||hist.value.meta?.longName||symbol, price: q.price || ind.lastPrice, change:q.change, changePercent:q.changePercent, ohlcv:rows, indicators:ind, scores, decision:scores.decision, score:scores.finalScore, confidence:scores.confidence, dataHealth:ind.health, provider:hist.value.provider || 'R17 provider', providerErrors:hist.value.fallbackFrom || [], quoteProvider:q.provider, timestamp:new Date().toISOString() };
}
async function diagnose(symbol, opts={}){
  const requested = String(symbol||'').toUpperCase().trim();
  const stages = [];
  const add = (stage, ok, detail={}) => stages.push({stage, ok: !!ok, ...detail});
  if(!requested){ add('symbol', false, {message:'symbol boş'}); return {success:false, symbol:requested, stages, error:'symbol gerekli'}; }
  add('symbol', true, {value:requested, yahoo:toYahoo(requested)});
  add('provider_layer', true, {primary:yahooFinance2?'yahoo-finance2':'unavailable', fallback:'yahoo-http-chart'});
  let hist=null, quote=null, ind=null, scores=null;
  try{
    hist = await fetchOHLCV(requested, opts.period || '1y', opts.interval || '1d');
    const rows = hist.rows || [];
    const positiveVolumes = rows.filter(r=>Number.isFinite(Number(r.volume)) && Number(r.volume)>0).length;
    add('ohlcv_fetch', rows.length>=1, {rows:rows.length, provider:hist.provider, fallbackFrom:hist.fallbackFrom || [], message: rows.length ? 'OHLCV alındı' : 'OHLCV boş'});
    add('ohlc_depth', rows.length>=50, {rows:rows.length, required:50});
    add('volume_depth', positiveVolumes>=20, {positiveVolumes, required:20});
    try{
      ind = indicators(rows);
      add('indicator_engine', true, {message:'indicator engine çalıştı'});
      add('rvol', ind.rvol20!=null && Number.isFinite(Number(ind.rvol20)) && Number(ind.rvol20)>0, {value:ind.rvol20, avgVolume20:ind.avgVolume20, lastVolume:ind.lastVolume});
      add('vwap', ind.vwap!=null && Number.isFinite(Number(ind.vwap)) && Number(ind.vwap)>0, {value:ind.vwap});
      add('cmf', ind.cmf!=null && Number.isFinite(Number(ind.cmf)), {value:ind.cmf});
      add('mfi', ind.mfi!=null && Number.isFinite(Number(ind.mfi)), {value:ind.mfi});
      scores = scoreFromIndicators(ind);
      add('decision_engine', true, {score:scores.finalScore, decision:scores.decision, confidence:scores.confidence});
    }catch(e){ add('indicator_engine', false, {message:e.message||String(e)}); }
  }catch(e){ add('ohlcv_fetch', false, {message:e.message||String(e), providerErrors:e.providerErrors||[]}); }
  try{ quote = await fetchQuote(requested); add('quote_fetch', !!quote.price, {provider:quote.provider, price:quote.price, volume:quote.volume, averageVolume:quote.averageVolume, error:quote.error}); }
  catch(e){ add('quote_fetch', false, {message:e.message||String(e)}); }
  const okCount = stages.filter(x=>x.ok).length;
  const healthScore = stages.length ? Math.round(okCount / stages.length * 100) : 0;
  const fatal = stages.filter(x=>!x.ok && ['ohlcv_fetch','indicator_engine','decision_engine'].includes(x.stage));
  return { success: fatal.length===0, symbol: requested, provider:'R17 provider-abstraction', healthScore, rows: hist?.rows?.length || 0, positiveVolumes: hist?.rows?.filter(r=>Number.isFinite(Number(r.volume)) && Number(r.volume)>0).length || 0, price: quote?.price || ind?.lastPrice || null, indicators: ind || null, scores: scores || null, stages, errors: stages.filter(x=>!x.ok), timestamp:new Date().toISOString() };
}
async function diagnoseMany(symbols, opts={}){
  const list = (symbols||[]).map(s=>String(s||'').toUpperCase().trim()).filter(Boolean);
  const limit = Math.max(1, Math.min(50, Number(opts.limit || list.length || 10)));
  const selected = list.slice(0, limit);
  const results = [];
  for(const sym of selected){ try{ results.push(await diagnose(sym, opts)); } catch(e){ results.push({success:false, symbol:sym, error:e.message||String(e), stages:[{stage:'fatal', ok:false, message:e.message||String(e)}]}); } }
  const summary = { total:selected.length, success:results.filter(x=>x.success).length, failed:results.filter(x=>!x.success).length, ohlcOk:results.filter(x=>x.stages?.find(s=>s.stage==='ohlc_depth')?.ok).length, volumeOk:results.filter(x=>x.stages?.find(s=>s.stage==='volume_depth')?.ok).length, rvolOk:results.filter(x=>x.stages?.find(s=>s.stage==='rvol')?.ok).length, vwapOk:results.filter(x=>x.stages?.find(s=>s.stage==='vwap')?.ok).length, cmfOk:results.filter(x=>x.stages?.find(s=>s.stage==='cmf')?.ok).length, mfiOk:results.filter(x=>x.stages?.find(s=>s.stage==='mfi')?.ok).length };
  return {success:true, provider:'R17 provider-abstraction', summary, results, data:results, timestamp:new Date().toISOString()};
}

module.exports = { SYMBOLS, fetchOHLCV, fetchQuote, indicators, scoreFromIndicators, master, clamp, diagnose, diagnoseMany, providerInfo: { primary:yahooFinance2?'yahoo-finance2':'none', fallback:'yahoo-http-chart' } };
