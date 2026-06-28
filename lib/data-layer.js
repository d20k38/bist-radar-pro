// R1 Veri Katmanı: tek sembol evreni + tek Master Stock Object üretimi.
// Yeni özellik eklemez; mevcut modüllerin aynı veri modelini okuyabilmesi için adapter katmanıdır.
// Random/pseudo fiyat, hacim veya skor üretmez. Veri yoksa kaydı success:false olarak işaretler.

export function cleanSymbol(symbol){
  return String(symbol||'').toUpperCase().replace(/\.IS$/,'').trim();
}
export function round(x,d=2){
  return Number.isFinite(Number(x)) ? Number(Number(x).toFixed(d)) : 0;
}
export function clamp(x,min=0,max=100){
  const n=Number(x);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));
}
export function grade(score){
  score=Number(score)||0;
  return score>=90?'A+':score>=80?'A':score>=70?'B':score>=60?'C':'D';
}
export function finalDecision(score, risk=50, confidence=50){
  score=Number(score)||0; risk=Number(risk)||50; confidence=Number(confidence)||50;
  if(score>=86 && risk<=62 && confidence>=62) return 'GÜÇLÜ AL';
  if(score>=70 && risk<=70) return 'AL';
  if(score>=52) return 'İZLE/TUT';
  if(score>=38) return 'TUT/BEKLE';
  return 'SAT/KAÇIN';
}
export function normalizeUniverse(symbols){
  const out=[]; const seen=new Set();
  for(const raw of symbols||[]){
    const s=cleanSymbol(raw);
    if(!/^[A-Z]{2,6}[A-Z0-9]?$/.test(s)) continue;
    if(seen.has(s)) continue;
    seen.add(s); out.push(s);
  }
  return out.sort();
}
function safeNum(...vals){
  for(const v of vals){ const n=Number(v); if(Number.isFinite(n)) return n; }
  return 0;
}
function avg(vals, fallback=0){
  const a=(vals||[]).map(Number).filter(Number.isFinite);
  return a.length ? a.reduce((s,x)=>s+x,0)/a.length : fallback;
}
function dipDistanceFromCore(core){
  const close=safeNum(core?.analysis?.close, core?.dayTrading?.currentPrice);
  const v19=core?.v19||{};
  const level=safeNum(v19?.ai?.strongestDip, v19?.strongestDip, v19?.ai?.support, v19?.support, core?.analysis?.formation?.support);
  if(!close || !level) return null;
  return round(((close-level)/level)*100,2);
}
export function buildMasterStockObject(core, extra={}){
  const a=core?.analysis||{};
  const d=core?.dayTrading||{};
  const inst=core?.institutional||{};
  const q=core?.quality||{};
  const v19=core?.v19||{};
  const symbol=cleanSymbol(core?.symbol || extra.symbol);
  const day=clamp(d.score ?? d.scores?.day ?? 0);
  const swing=clamp(avg([a.trend,a.momentum,a.money,inst.components?.trend,inst.components?.momentum], a.finalScore||0));
  const position=clamp(avg([q.components?.trend,q.components?.backtest,q.components?.risk,q.components?.liquidity,extra.financialScore], q.score||a.confidence||0));
  const institutional=clamp(inst.score ?? avg([inst.components?.moneyFlow,inst.components?.rvol,inst.components?.vwap,inst.components?.relativeStrength], a.money||0));
  const iqs=clamp(q.score ?? avg([a.trend,a.money,a.momentum,100-(a.risk||50)], a.finalScore||0));
  const kap=clamp(extra.kapScore ?? inst.components?.kap ?? q.components?.kap ?? 50);
  const financial=clamp(extra.financialScore ?? 50);
  const learning=clamp(extra.learningScore ?? inst.components?.backtest ?? q.components?.backtest ?? a.confidence ?? 50);
  const backtest=clamp(inst.components?.backtest ?? q.components?.backtest ?? a.confidence ?? 50);
  const risk=clamp(a.risk ?? (100-(inst.components?.risk||50)) ?? 50);
  const liquidity=clamp(inst.components?.liquidity ?? d.scores?.liquidity ?? q.components?.liquidity ?? 50);
  const aiScore=clamp(
    day*.18 + swing*.12 + position*.12 + institutional*.16 + iqs*.18 + kap*.07 + financial*.06 + learning*.07 + backtest*.04 - Math.max(0,risk-65)*.12
  );
  const confidence=clamp(avg([a.confidence, iqs, backtest, liquidity, 100-risk], aiScore));
  const decision=finalDecision(aiScore,risk,confidence);
  const dipDistance=dipDistanceFromCore(core);
  const reasons=[];
  if(day>=70) reasons.push(`Day Trading ${round(day,0)}/100`);
  if(institutional>=70) reasons.push(`Kurumsal para ${round(institutional,0)}/100`);
  if(iqs>=70) reasons.push(`IQS ${round(iqs,0)}/100`);
  if(kap>=70) reasons.push(`KAP katkısı ${round(kap,0)}/100`);
  if(backtest>=70) reasons.push(`Backtest/güven ${round(backtest,0)}/100`);
  if(risk>70) reasons.push(`Risk yüksek ${round(risk,0)}/100`);
  if(!reasons.length) reasons.push('Karar için ek teyit bekleniyor');
  return {
    success:true,
    schema:'R1_MASTER_STOCK_OBJECT',
    symbol,
    price:{close:round(a.close ?? d.currentPrice), change:round(a.change)},
    scores:{ai:round(aiScore,1), confidence:round(confidence,1), risk:round(risk,1), iqs:round(iqs,1), day:round(day,1), swing:round(swing,1), position:round(position,1), institutional:round(institutional,1), kap:round(kap,1), financial:round(financial,1), learning:round(learning,1), backtest:round(backtest,1), liquidity:round(liquidity,1)},
    decision:{label:decision, grade:grade(aiScore), confidenceGrade:grade(confidence), reasons},
    tradePlan:{entryLow:d.plan?.entryLow ?? round(a.close*.995), entryHigh:d.plan?.entryHigh ?? round(a.close*1.005), stop:d.plan?.stop ?? round(a.stop), target1:d.plan?.target1 ?? round(a.target1), target2:d.plan?.target2 ?? round(a.target2), riskReward:d.plan?.riskReward ?? round((a.target1-a.close)/Math.max(0.01,a.close-a.stop),2)},
    layers:{analysis:a, dayTrading:d, institutional:inst, quality:q, v19},
    metrics:{rvol20:d.rvol20, rvol5:d.rvol5, vwap20:d.vwap20, cmf20:d.cmf20, mfi14:d.mfi14, rsi14:d.rsi14, atrPct:d.atrPct, dipDistance},
    meta:{source:'R1 Data Layer', random:false, computedAt:new Date().toISOString(), core:core.meta||{}}
  };
}
export function masterToLegacyRow(m){
  return {
    symbol:m.symbol,
    close:m.price.close,
    change:m.price.change,
    decision:m.decision.label,
    finalScore:m.scores.ai,
    confidence:m.scores.confidence,
    risk:m.scores.risk,
    trend:m.scores.swing,
    money:m.scores.institutional,
    momentum:m.scores.day,
    quality:m.scores.iqs,
    dayScore:m.scores.day,
    swingScore:m.scores.swing,
    positionScore:m.scores.position,
    institutionalScore:m.scores.institutional,
    kapScore:m.scores.kap,
    financialScore:m.scores.financial,
    backtestScore:m.scores.backtest,
    dipDistance:m.metrics.dipDistance,
    plan:m.tradePlan,
    explain:m.decision.reasons.join(' • '),
    master:m
  };
}
