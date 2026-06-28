// R2 Karar Motoru: R1 Master Stock Object üzerinden tek ve tutarlı AL/TUT/SAT kararı üretir.
// Yeni veri üretmez; random/pseudo değer kullanmaz. Veri yoksa kararı "VERİ YOK" olarak döndürür.

function num(v, fallback=0){ const n=Number(v); return Number.isFinite(n) ? n : fallback; }
function clamp(v,min=0,max=100){ return Math.max(min, Math.min(max, num(v,0))); }
function round(v,d=1){ const n=num(v,0); return Number(n.toFixed(d)); }
function safeText(x){ return String(x||'').trim(); }

export function decisionGrade(score){
  score=num(score,0);
  if(score>=92) return 'A+';
  if(score>=84) return 'A';
  if(score>=76) return 'B+';
  if(score>=68) return 'B';
  if(score>=58) return 'C';
  return 'D';
}

export function finalAction(score, confidence, risk){
  score=num(score,0); confidence=num(confidence,0); risk=num(risk,100);
  if(score>=88 && confidence>=72 && risk<=58) return 'GÜÇLÜ AL';
  if(score>=72 && confidence>=58 && risk<=68) return 'AL';
  if(score>=55 && risk<=78) return 'İZLE/TUT';
  if(score>=42) return 'TUT/BEKLE';
  return 'SAT/KAÇIN';
}

export function actionBucket(action){
  const a=safeText(action).toUpperCase();
  if(a.includes('GÜÇLÜ')) return 'strongBuy';
  if(a==='AL' || a.includes(' AL')) return 'buy';
  if(a.includes('SAT') || a.includes('KAÇIN')) return 'sellAvoid';
  return 'watchHold';
}

export function buildDecisionFromMaster(master){
  if(!master || master.success===false){
    return {success:false,schema:'R2_DECISION',symbol:master?.symbol||'',action:'VERİ YOK',bucket:'noData',score:0,confidence:0,risk:100,grade:'D',reasons:['Gerçek OHLC/hacim verisi üretilemedi.'],warnings:['Veri kaynağı veya API yanıtı kontrol edilmeli.'],master};
  }
  const s=master.scores||{};
  const m=master.metrics||{};
  const day=clamp(s.day), swing=clamp(s.swing), position=clamp(s.position), institutional=clamp(s.institutional), iqs=clamp(s.iqs);
  const kap=clamp(s.kap,0,100), financial=clamp(s.financial), learning=clamp(s.learning), backtest=clamp(s.backtest), liquidity=clamp(s.liquidity);
  const risk=clamp(s.risk,0,100);
  const dipDistance = Number.isFinite(Number(m.dipDistance)) ? Number(m.dipDistance) : null;
  const dipBonus = dipDistance===null ? 0 : dipDistance>=0 && dipDistance<=3 ? 7 : dipDistance<=8 ? 4 : dipDistance<=15 ? 1 : -4;
  const raw = day*.19 + swing*.11 + position*.10 + institutional*.16 + iqs*.18 + kap*.07 + financial*.06 + learning*.06 + backtest*.05 + liquidity*.02 + dipBonus;
  const riskPenalty = Math.max(0, risk-65) * .18;
  const score = clamp(raw - riskPenalty);
  const confidence = clamp((num(master.scores?.confidence,score)*.35)+(iqs*.18)+(backtest*.17)+(liquidity*.15)+((100-risk)*.15));
  const action = finalAction(score, confidence, risk);
  const layers = [
    ['Day Trading',day,.19], ['Swing',swing,.11], ['Pozisyon',position,.10], ['Kurumsal Para',institutional,.16], ['IQS',iqs,.18], ['KAP',kap,.07], ['Financial',financial,.06], ['Learning',learning,.06], ['Backtest',backtest,.05], ['Likidite',liquidity,.02]
  ].map(([label,value,weight])=>({label,value:round(value,0),weight,contribution:round((value-50)*weight,2),status:value>=70?'green':value>=45?'yellow':'red'}));
  const positives=[]; const warnings=[];
  layers.filter(l=>l.value>=70).slice(0,5).forEach(l=>positives.push(`${l.label} güçlü (${l.value}/100)`));
  layers.filter(l=>l.value<45).slice(0,4).forEach(l=>warnings.push(`${l.label} zayıf (${l.value}/100)`));
  if(risk>70) warnings.push(`Risk yüksek (${round(risk,0)}/100)`);
  if(dipDistance!==null){
    if(dipDistance>=0 && dipDistance<=8) positives.push(`Dip bölgesine yakın (%${round(dipDistance,1)})`);
    else if(dipDistance>15) warnings.push(`Dipten uzak (%${round(dipDistance,1)})`);
  }
  if(!positives.length) positives.push('Pozitif teyitler sınırlı; izleme öncelikli.');
  const plan=master.tradePlan||{};
  const reasons=[...positives, ...(warnings.length?['Risk/karşıt görüş: '+warnings.join(' • ')]:[])];
  return {
    success:true,
    schema:'R2_DECISION_ENGINE',
    symbol:master.symbol,
    action,
    bucket:actionBucket(action),
    score:round(score,1),
    confidence:round(confidence,1),
    risk:round(risk,1),
    grade:decisionGrade(score),
    confidenceGrade:decisionGrade(confidence),
    scores:{day,swing,position,institutional,iqs,kap,financial,learning,backtest,liquidity},
    dipDistance,
    layers,
    positives,
    warnings,
    reasons,
    tradePlan:plan,
    summary:`${master.symbol} için R2 Karar Motoru ${action} sonucunu üretti. AI ${round(score,0)}/100, güven ${round(confidence,0)}/100, risk ${round(risk,0)}/100.`,
    master,
    meta:{source:'R2 Karar Motoru',random:false,computedAt:new Date().toISOString()}
  };
}

export function decisionToRow(decision){
  const m=decision.master||{};
  const metrics=m.metrics||{};
  const integrity=m.integrity||{};
  return {
    symbol:decision.symbol,
    close:m.price?.close ?? 0,
    decision:decision.action,
    finalScore:decision.score,
    confidence:decision.confidence,
    risk:decision.risk,
    quality:decision.scores?.iqs ?? 0,
    dayScore:decision.scores?.day ?? 0,
    swingScore:decision.scores?.swing ?? 0,
    positionScore:decision.scores?.position ?? 0,
    institutionalScore:decision.scores?.institutional ?? 0,
    kapScore:decision.scores?.kap ?? 0,
    financialScore:decision.scores?.financial ?? 0,
    backtestScore:decision.scores?.backtest ?? 0,
    rvol20:metrics.rvol20 ?? null,
    rvol:metrics.rvol20 ?? null,
    rvol5:metrics.rvol5 ?? null,
    vwap20:metrics.vwap20 ?? null,
    vwap:metrics.vwap20 ?? null,
    cmf20:metrics.cmf20 ?? null,
    cmf:metrics.cmf20 ?? null,
    mfi14:metrics.mfi14 ?? null,
    mfi:metrics.mfi14 ?? null,
    atrPct:metrics.atrPct ?? null,
    dataHealth:metrics.dataHealth ?? integrity.health ?? null,
    dataStatus:integrity.status || '',
    dataIssues:metrics.dataIssues || integrity.issues || [],
    dipDistance:decision.dipDistance,
    plan:decision.tradePlan,
    explain:decision.reasons?.join(' • ') || decision.summary,
    master:m,
    r2Decision:decision
  };
}

export function summarizeDecisions(decisions){
  const arr=(decisions||[]).filter(x=>x&&x.success!==false);
  const counts={strongBuy:0,buy:0,watchHold:0,sellAvoid:0,noData:0};
  arr.forEach(d=>{ counts[d.bucket]=(counts[d.bucket]||0)+1; });
  return {count:arr.length,counts,top:arr.slice().sort((a,b)=>num(b.score)-num(a.score)).slice(0,10).map(x=>({symbol:x.symbol,action:x.action,score:x.score,confidence:x.confidence,reason:x.positives?.[0]||''}))};
}
