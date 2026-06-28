// V26 Core Engine: tek veri/indicator/AI hesaplama altyapısı.
// Random/pseudo veri üretmez; tüm hesaplamalar provider üzerinden gelen gerçek OHLC/hacim ile yapılır.
import { getOhlcv } from './provider.js';
import { analyze } from './engine.js';
import { analyzeDayTrading } from './day-trading-engine.js';
import { analyzeInstitutionalScanner } from './institutional-scanner-engine.js';
import { analyzeV19Institutional } from './v19-institutional-engine.js';
import { buildIndicatorBundle, compactIndicators } from './indicator-engine.js';

const TTL = 1000 * 60 * 8; // Vercel fonksiyon ömrü içinde kısa önbellek; veri kaynağı değil, timeout azaltma katmanı.
const KEY_SEP = '::';

function now(){ return Date.now(); }
function cleanSymbol(symbol){ return String(symbol||'').toUpperCase().replace('.IS','').trim(); }
function getStore(){
  const g = globalThis;
  if(!g.__BIST_RADAR_V26_CORE__) g.__BIST_RADAR_V26_CORE__ = { ohlcv:new Map(), analysis:new Map(), meta:{hits:0,misses:0,createdAt:new Date().toISOString()} };
  return g.__BIST_RADAR_V26_CORE__;
}
function fresh(item){ return item && (now() - item.ts) < TTL; }
function put(map,key,value){ map.set(key,{ts:now(),value}); return value; }
function get(map,key){ const item=map.get(key); if(fresh(item)) return item.value; map.delete(key); return null; }
function lastFinite(arr, fallback=null){ for(let i=(arr?.length||0)-1;i>=0;i--){ const v=Number(arr[i]); if(Number.isFinite(v)) return v; } return fallback; }
function round(x,d=2){ return Number.isFinite(Number(x)) ? +Number(x).toFixed(d) : 0; }
function clamp(x){ return Math.max(0, Math.min(100, Math.round(Number(x)||0))); }
function pct(a,b){ return b ? ((a-b)/b)*100 : 0; }

export function getCoreMeta(){
  const s=getStore();
  return {...s.meta, ohlcvCache:s.ohlcv.size, analysisCache:s.analysis.size, ttlSeconds:Math.round(TTL/1000), version:'V26 Core Engine'};
}

export async function getCoreOhlcv(symbol, range='1y', interval='1d'){
  const s=getStore();
  const sym=cleanSymbol(symbol);
  const key=[sym,range,interval].join(KEY_SEP);
  const cached=get(s.ohlcv,key);
  if(cached){ s.meta.hits++; return cached; }
  s.meta.misses++;
  const rows=await getOhlcv(sym, range, interval);
  return put(s.ohlcv,key,rows);
}

export async function getCoreAnalysis(symbol, options={}){
  const sym=cleanSymbol(symbol);
  const range=options.range || '1y';
  const benchmark=options.benchmark || 'XU100';
  const key=[sym,range,benchmark, options.includeV19?'v19':'std'].join(KEY_SEP);
  const s=getStore();
  const cached=get(s.analysis,key);
  if(cached){ s.meta.hits++; return cached; }
  s.meta.misses++;
  const rows=await getCoreOhlcv(sym,range,'1d');
  const base=analyze(rows);
  let benchmarkRows=[];
  try{ benchmarkRows=await getCoreOhlcv(benchmark,range,'1d'); }catch(e){ benchmarkRows=[]; }
  const indicators=buildIndicatorBundle(rows, benchmarkRows);
  const dayTrading=analyzeDayTrading(rows, benchmarkRows);
  let v19=null;
  if(options.includeV19){ try{ v19=analyzeV19Institutional(rows); }catch(e){ v19={success:false,error:e.message}; } }
  const institutional=analyzeInstitutionalScanner({symbol:sym, analysis:base, dayTrading, ai:v19?.ai||{}, scores:{trend:base.trend, money:base.money}, successProbability:v19?.ai?.successProbability, confidence:base.confidence});
  const quality=buildInstitutionalQuality({base,dayTrading,institutional,v19});
  const payload={symbol:sym, rows, analysis:base, indicators, dayTrading, institutional, v19, quality, meta:{source:'R7 Core + Indicator Engine', random:false, computedAt:new Date().toISOString(), range, benchmark}};
  return put(s.analysis,key,payload);
}

export function buildInstitutionalQuality({base={},dayTrading={},institutional={},v19={}}){
  const trend=clamp(base.trend || institutional.components?.trend || 0);
  const volume=clamp(((dayTrading.scores?.rvol||0)+(dayTrading.scores?.obv||0)+(dayTrading.scores?.cmf||0)+(dayTrading.scores?.vwap||0))/4);
  const momentum=clamp(((base.momentum||0)+(dayTrading.scores?.momentum||0)+(dayTrading.scores?.relativeStrength||0))/3);
  const dip=clamp(v19?.ai?.dipScore ?? base.pattern ?? 50);
  const kap=clamp(institutional.components?.kap ?? 50);
  const backtest=clamp(institutional.components?.backtest ?? base.confidence ?? 50);
  const risk=clamp(100-(base.risk||50));
  const liquidity=clamp(dayTrading.scores?.liquidity ?? institutional.components?.liquidity ?? 50);
  const score=clamp(trend*.15 + volume*.20 + momentum*.15 + dip*.10 + kap*.10 + backtest*.15 + risk*.10 + liquidity*.05);
  return {score, grade:score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'D', components:{trend,volume,momentum,dip,kap,backtest,risk,liquidity}, source:'V26 IQS draft from shared core calculations'};
}

export function compactCoreResult(core){
  const a=core.analysis||{}, d=core.dayTrading||{}, i=core.institutional||{}, q=core.quality||{};
  return {symbol:core.symbol, close:round(a.close), change:round(a.change), decision:a.decision, finalScore:a.finalScore, confidence:a.confidence, risk:a.risk, trend:a.trend, money:a.money, momentum:a.momentum, formation:a.formation?.name||'Belirgin formasyon yok', indicators:compactIndicators(core.indicators), dayTrading:d, institutional:i, quality:q, meta:core.meta};
}
