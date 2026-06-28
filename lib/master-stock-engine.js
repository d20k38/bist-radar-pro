// V33 Data Architecture: Master Stock Object.
// Her modülün farklı format üretmesi yerine tüm ekranların okuyacağı tek normalize veri modeli.
// Demo/random veri üretmez; yalnızca Core Engine + gerçek OHLC/hacim/KAP/financial arşivinden türetilir.
import { getCoreAnalysis, compactCoreResult } from './core-engine.js';
import { buildDecisionPayload } from './ai-decision-engine.js';
import { buildExplainableAI } from './explainable-ai-engine.js';
import { analyzeFinancialAI } from './financial-ai-engine.js';

function n(x,d=0){ x=Number(x); return Number.isFinite(x)?x:d; }
function clamp(x,a=0,b=100){ return Math.max(a,Math.min(b,n(x))); }
function round(x,d=2){ x=Number(x); return Number.isFinite(x)?+x.toFixed(d):0; }
function cleanSymbol(s){ return String(s||'').toUpperCase().replace(/\.IS$/,'').trim(); }
function grade(score){ score=n(score); return score>=90?'A+':score>=82?'A':score>=74?'B+':score>=65?'B':score>=55?'C':'D'; }
function action(score,risk=55,confidence=50){
  score=n(score); risk=n(risk); confidence=n(confidence);
  if(score>=90 && confidence>=76 && risk<=58) return 'GÜÇLÜ AL';
  if(score>=76 && confidence>=62 && risk<=68) return 'AL';
  if(score>=58) return 'İZLE / TUT';
  if(score>=44) return 'TUT / ZAYIF';
  return 'SAT / KAÇIN';
}
function normalizeKapScore(institutional={}, kapAI=null){
  return clamp(kapAI?.impactScore ?? institutional.components?.kap ?? institutional.kapScore ?? 50);
}
function normalizeFinancialScore(financialAI=null){ return clamp(financialAI?.score ?? 50); }
function dipDistancePct(core){
  const close=n(core?.analysis?.close||0);
  const v19=core?.v19||{};
  const d=v19?.dipRegion||{};
  const ref=n(d.strongest||d.high||d.low||0);
  return (close&&ref) ? round(((close-ref)/ref)*100,2) : null;
}
function safeArray(x){ return Array.isArray(x)?x:[]; }

export function buildMasterFromCore({core, decision, explainable, financialAI=null, kapAI=null}){
  const a=core?.analysis||{};
  const day=core?.dayTrading||{};
  const inst=core?.institutional||{};
  const q=core?.quality||{};
  const d=decision||buildDecisionPayload(core.symbol,a);
  const close=n(a.close);
  const risk=clamp(a.risk ?? d.riskScore ?? 55);
  const dayScore=clamp(day.score ?? day.finalScore ?? day.scores?.total ?? d.layerInputs?.finalScore ?? a.finalScore ?? 0);
  const swingScore=clamp((a.trend||50)*0.52 + (a.momentum||50)*0.28 + (q.components?.backtest||a.confidence||50)*0.20);
  const positionScore=clamp((q.score||50)*0.48 + (q.components?.backtest||a.confidence||50)*0.24 + (100-risk)*0.18 + normalizeFinancialScore(financialAI)*0.10);
  const institutionalScore=clamp(inst.score ?? inst.institutionalScore ?? a.money ?? q.components?.volume ?? 0);
  const iqs=clamp(q.score ?? (a.finalScore||50));
  const kapScore=normalizeKapScore(inst, kapAI);
  const financialScore=normalizeFinancialScore(financialAI);
  const backtestScore=clamp(q.components?.backtest ?? d.layerInputs?.backtestScore ?? a.confidence ?? 50);
  const learningScore=clamp(core?.learning?.score ?? backtestScore);
  const dipScore=clamp(core?.v19?.ai?.dipScore ?? a.pattern ?? 50);
  const dipDistance=dipDistancePct(core);
  const dipPenalty=dipDistance===null ? 0 : Math.max(0,dipDistance-15)*0.45;
  const riskPenalty=Math.max(0,risk-70)*0.35;
  const aiFinal=clamp(
    iqs*0.24 + dayScore*0.18 + swingScore*0.12 + positionScore*0.10 + institutionalScore*0.12 +
    dipScore*0.08 + kapScore*0.05 + financialScore*0.04 + backtestScore*0.05 + learningScore*0.02 - dipPenalty - riskPenalty
  );
  const confidencePct=clamp(aiFinal*0.54 + (100-risk)*0.24 + backtestScore*0.14 + (financialAI?6:0) + (kapAI?4:0));
  const finalDecision=action(aiFinal,risk,confidencePct);
  const positives=[];
  const warnings=[];
  if(dayScore>=70) positives.push(`Day Trading güçlü: ${Math.round(dayScore)}/100`); else warnings.push(`Day Trading teyidi zayıf: ${Math.round(dayScore)}/100`);
  if(institutionalScore>=65) positives.push(`Kurumsal para destekli: ${Math.round(institutionalScore)}/100`); else warnings.push(`Kurumsal para sınırlı: ${Math.round(institutionalScore)}/100`);
  if(iqs>=70) positives.push(`IQS güçlü: ${Math.round(iqs)}/100`);
  if(kapScore>=65) positives.push(`KAP etkisi pozitif: ${Math.round(kapScore)}/100`);
  if(financialScore>=65) positives.push(`Financial AI olumlu: ${Math.round(financialScore)}/100`);
  if(risk>70) warnings.push(`Risk yüksek: ${Math.round(risk)}/100`);
  if(dipDistance!==null && dipDistance>15) warnings.push(`Dip bölgesinden uzaklık %${round(dipDistance,1)}`);
  const trade={
    entryLow: round(close*0.992,2), entryHigh: round(close*1.006,2), trigger: round(close*1.01,2),
    stop: round(a.stop || close*(risk>65?0.965:0.975),2),
    target1: round(a.target1 || close*1.035,2), target2: round(a.target2 || close*1.065,2)
  };
  const rr = (close&&trade.stop&&trade.target1&&close>trade.stop) ? round((trade.target1-close)/(close-trade.stop),2) : 0;
  trade.riskReward=rr;
  return {
    symbol: cleanSymbol(core.symbol), price: round(close,2), change: round(a.change,2),
    decision: finalDecision, aiFinal: Math.round(aiFinal), confidence: grade(confidencePct), confidencePct: Math.round(confidencePct),
    risk, iqs: Math.round(iqs), dayTrading: Math.round(dayScore), swing: Math.round(swingScore), position: Math.round(positionScore),
    institutional: Math.round(institutionalScore), kap: Math.round(kapScore), financial: Math.round(financialScore), backtest: Math.round(backtestScore), learning: Math.round(learningScore),
    dipScore: Math.round(dipScore), dipDistance, trade,
    raw:{core:compactCoreResult(core), decision:d, explainable, financialAI, kapAI},
    positives, warnings,
    explanation:`${cleanSymbol(core.symbol)} için V33 Master Stock Object kararı ${finalDecision}. AI ${Math.round(aiFinal)}/100, güven ${grade(confidencePct)}, risk ${Math.round(risk)}/100. ${positives.slice(0,3).join(' • ')}${warnings.length?' | Riskler: '+warnings.slice(0,2).join(' • '):''}`,
    schemaVersion:'V33_MASTER_STOCK_OBJECT', random:false, computedAt:new Date().toISOString()
  };
}

export async function getMasterStockObject(symbol, options={}){
  const sym=cleanSymbol(symbol);
  const core=await getCoreAnalysis(sym,{range:options.range||'1y', includeV19:true});
  const decision=buildDecisionPayload(core.symbol, core.analysis);
  let explainable=null;
  try{ explainable=buildExplainableAI(core.symbol, core, decision); }catch(e){ explainable={error:e.message}; }
  let financialAI=null;
  if(typeof options.financialResolver==='function'){
    try{ financialAI=analyzeFinancialAI({symbol:sym, core, financialData:options.financialResolver(sym), kapItems:safeArray(options.kapItems)}); }catch(e){ financialAI={score:50, polarity:'Nötr', error:e.message}; }
  }
  return buildMasterFromCore({core, decision, explainable, financialAI, kapAI:options.kapAI||null});
}

export async function getMasterStockObjects(symbols=[], options={}){
  const out=[]; const errors=[];
  const uniq=[...new Set((symbols||[]).map(cleanSymbol).filter(Boolean))];
  const concurrency=Math.max(1, Math.min(Number(options.concurrency||3), 4));
  for(let i=0;i<uniq.length;i+=concurrency){
    const chunk=uniq.slice(i,i+concurrency);
    const arr=await Promise.all(chunk.map(async s=>{
      try{return await getMasterStockObject(s,options)}catch(e){errors.push({symbol:s,error:e.message});return null;}
    }));
    out.push(...arr.filter(Boolean));
  }
  const map=new Map();
  out.forEach(x=>{ const old=map.get(x.symbol); if(!old || x.aiFinal>old.aiFinal) map.set(x.symbol,x); });
  const rows=[...map.values()].sort((a,b)=>(b.aiFinal||0)-(a.aiFinal||0));
  return {rows, errors, count:rows.length, requested:uniq.length, schemaVersion:'V33_MASTER_STOCK_OBJECT_LIST'};
}
