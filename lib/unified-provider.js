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

function indicators(rows){
  rows = Array.isArray(rows) ? rows : [];
  const n=rows.length, last=rows[n-1]||{};
  const closes=rows.map(r=>r.close).filter(Number.isFinite);
  const vols=rows.map(r=>r.volume).filter(Number.isFinite);
  const lastVol = Number.isFinite(last.volume) && last.volume>0 ? last.volume : [...rows].reverse().find(r=>Number.isFinite(r.volume)&&r.volume>0)?.volume;
  const vol20 = avg(rows.slice(-21,-1).map(r=>r.volume).filter(v=>Number.isFinite(v)&&v>0));
  const rvol20 = lastVol && vol20 ? lastVol/vol20 : null;
  let pv=0,vsum=0; for(const r of rows.slice(-20)){ const v=Number(r.volume); if(v>0){ pv += ((r.high+r.low+r.close)/3)*v; vsum += v; }}
  const vwap = vsum ? pv/vsum : null;
  let mfv=0, tv=0; for(const r of rows.slice(-20)){ const den=(r.high-r.low); const v=Number(r.volume); if(den>0 && v>0){ const mfm=((r.close-r.low)-(r.high-r.close))/den; mfv += mfm*v; tv += v; }}
  const cmf = tv ? mfv/tv : null;
  let pos=0,neg=0; for(let i=Math.max(1,n-14); i<n; i++){ const tp=(rows[i].high+rows[i].low+rows[i].close)/3; const ptp=(rows[i-1].high+rows[i-1].low+rows[i-1].close)/3; const flow=tp*(Number(rows[i].volume)||0); if(tp>ptp) pos+=flow; else if(tp<ptp) neg+=flow; }
  const mfi = (pos+neg)>0 ? 100 - (100/(1+(pos/(neg||1)))) : null;
  let obv=0; for(let i=1;i<n;i++){ const v=Number(rows[i].volume)||0; if(rows[i].close>rows[i-1].close) obv+=v; else if(rows[i].close<rows[i-1].close) obv-=v; }
  const ret5 = closes.length>5 ? (closes.at(-1)/closes.at(-6)-1)*100 : null;
  const ret20 = closes.length>20 ? (closes.at(-1)/closes.at(-21)-1)*100 : null;
  const lows=rows.slice(-250).map(r=>r.low).filter(Number.isFinite);
  const highs=rows.slice(-250).map(r=>r.high).filter(Number.isFinite);
  const low250 = lows.length ? Math.min(...lows) : null;
  const high250 = highs.length ? Math.max(...highs) : null;
  const dipDistance = Number.isFinite(low250) && last.close ? ((last.close-low250)/low250)*100 : null;
  const health = { ohlc: rows.length>=50, volume: vols.filter(v=>v>0).length>=20, rvol: rvol20!=null, vwap: vwap!=null, cmf: cmf!=null, mfi: mfi!=null };
  return { lastPrice:last.close||null, lastVolume:lastVol||null, avgVolume20:vol20, rvol20, vwap, cmf, mfi, obv, ret5, ret20, low250, high250, dipDistance, health };
}
function scoreFromIndicators(ind){
  const volumeScore = ind.rvol20==null ? 40 : clamp(ind.rvol20*30, 0, 100);
  const vwapScore = ind.vwap && ind.lastPrice ? (ind.lastPrice>=ind.vwap?75:45) : 45;
  const cmfScore = ind.cmf==null ? 45 : clamp(50 + ind.cmf*160, 0, 100);
  const mfiScore = ind.mfi==null ? 45 : (ind.mfi<20?45:ind.mfi>85?55:clamp(ind.mfi,0,100));
  const momentumScore = ind.ret5==null ? 50 : clamp(50 + ind.ret5*4, 0, 100);
  const dipScore = ind.dipDistance==null ? 50 : clamp(100 - ind.dipDistance*3, 0, 100);
  const dayTrading = clamp(volumeScore*.30 + vwapScore*.20 + cmfScore*.18 + mfiScore*.12 + momentumScore*.20);
  const institutional = clamp(volumeScore*.22 + cmfScore*.28 + vwapScore*.20 + mfiScore*.10 + momentumScore*.20);
  const iqs = clamp(dayTrading*.35 + institutional*.35 + dipScore*.15 + momentumScore*.15);
  const finalScore = clamp(iqs*.45 + dayTrading*.35 + institutional*.20);
  const decision = finalScore>=82 ? 'AL' : finalScore>=58 ? 'TUT' : 'SAT';
  const confidence = Object.values(ind.health||{}).filter(Boolean).length >=5 ? 'A' : Object.values(ind.health||{}).filter(Boolean).length >=3 ? 'B' : 'C';
  return { dayTrading, institutional, iqs, finalScore, decision, confidence };
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
