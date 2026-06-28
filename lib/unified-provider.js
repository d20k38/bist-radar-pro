const yahooFinance = require('yahoo-finance2').default;
yahooFinance.suppressNotices(['yahooSurvey']);
const { SYMBOLS } = require('./symbols');

function num(x){ const n = Number(x && typeof x === 'object' && 'raw' in x ? x.raw : x); return Number.isFinite(n) ? n : null; }
function avg(a){ const b=a.filter(Number.isFinite); return b.length? b.reduce((s,x)=>s+x,0)/b.length : null; }
function clamp(x,a=0,b=100){ x=Number(x); if(!Number.isFinite(x)) return 0; return Math.max(a,Math.min(b,x)); }
function toYahoo(symbol){ return String(symbol||'').toUpperCase().replace(/\.IS$/,'') + '.IS'; }
function cleanRows(quotes){
  return (quotes||[]).map(q=>({
    date: q.date ? new Date(q.date).toISOString().slice(0,10) : null,
    open: num(q.open), high: num(q.high), low: num(q.low), close: num(q.close), volume: num(q.volume)
  })).filter(r=>r.date && Number.isFinite(r.close) && Number.isFinite(r.high) && Number.isFinite(r.low));
}
async function fetchOHLCV(symbol, period='1y', interval='1d'){
  const result = await yahooFinance.chart(toYahoo(symbol), { period1: periodStart(period), interval });
  const rows = cleanRows(result.quotes || []);
  const meta = result.meta || {};
  return { symbol: String(symbol).toUpperCase(), meta, rows };
}
function periodStart(period){
  const days = ({'1mo':35,'3mo':100,'6mo':190,'1y':390,'2y':760,'5y':1900,'10y':3700})[period] || 390;
  return new Date(Date.now()-days*86400000).toISOString().slice(0,10);
}
async function fetchQuote(symbol){
  const q = await yahooFinance.quoteSummary(toYahoo(symbol), { modules:['price','summaryDetail','defaultKeyStatistics','assetProfile'] });
  const p = q.price || {};
  return {
    symbol: String(symbol).toUpperCase(),
    name: p.longName || p.shortName || symbol,
    price: num(p.regularMarketPrice),
    change: num(p.regularMarketChange),
    changePercent: num(p.regularMarketChangePercent),
    volume: num(p.regularMarketVolume),
    marketCap: num(p.marketCap || q.summaryDetail?.marketCap),
    averageVolume: num(q.summaryDetail?.averageVolume),
    beta: num(q.summaryDetail?.beta),
    peRatio: num(q.summaryDetail?.trailingPE),
    dividendYield: num(q.summaryDetail?.dividendYield),
    sector: q.assetProfile?.sector || null,
    industry: q.assetProfile?.industry || null,
    timestamp: new Date().toISOString()
  };
}
function indicators(rows){
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
  const low250 = Math.min(...rows.slice(-250).map(r=>r.low).filter(Number.isFinite));
  const high250 = Math.max(...rows.slice(-250).map(r=>r.high).filter(Number.isFinite));
  const dipDistance = Number.isFinite(low250) && last.close ? ((last.close-low250)/low250)*100 : null;
  const health = {
    ohlc: rows.length>=50,
    volume: vols.filter(v=>v>0).length>=20,
    rvol: rvol20!=null,
    vwap: vwap!=null,
    cmf: cmf!=null,
    mfi: mfi!=null
  };
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
  const rows = hist.value.rows;
  const ind = indicators(rows);
  const q = quote.status==='fulfilled' ? quote.value : {};
  const scores = scoreFromIndicators(ind);
  return { success:true, symbol:String(symbol).toUpperCase(), name:q.name||hist.value.meta.longName||symbol, price: q.price || ind.lastPrice, change:q.change, changePercent:q.changePercent, ohlcv:rows, indicators:ind, scores, decision:scores.decision, score:scores.finalScore, confidence:scores.confidence, dataHealth:ind.health, provider:'R12 unified yahoo-finance2', timestamp:new Date().toISOString() };
}
module.exports = { SYMBOLS, fetchOHLCV, fetchQuote, indicators, scoreFromIndicators, master, clamp };
