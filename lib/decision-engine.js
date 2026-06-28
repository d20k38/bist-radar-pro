// R19 AI Decision Engine
// Tek amaç: gerçek Indicator Engine çıktısından tutarlı AI puanı, güven, IQS ve AL/TUT/SAT kararı üretmek.
function n(x, fallback=0){ x=Number(x); return Number.isFinite(x) ? x : fallback; }
function clamp(x,a=0,b=100){ x=n(x,0); return Math.max(a, Math.min(b, x)); }
function boolCount(obj){ return Object.values(obj||{}).filter(Boolean).length; }
function grade(p){ p=clamp(p); return p>=90?'A+':p>=82?'A':p>=72?'B+':p>=62?'B':p>=50?'C':'D'; }
function decisionClass(score, risk){
  score=clamp(score); risk=clamp(risk,0,100);
  if(score>=86 && risk<=58) return 'GÜÇLÜ AL';
  if(score>=74 && risk<=68) return 'AL';
  if(score>=58) return 'TUT';
  if(score>=45) return 'İZLE';
  return 'SAT';
}
function signalImpact(name, value, weight, note){
  const v=clamp(value); const contribution = Math.round(((v-50)/50)*weight*100)/100;
  return {name, value:Math.round(v), weight, contribution, note:note||''};
}
function scoreFromIndicators(ind={}){
  const trend = clamp(n(ind.trendQuality,50));
  const momentum = clamp(n(ind.momentumQuality,50));
  const volume = clamp(n(ind.volumeQuality,45));
  const volatilityQuality = clamp(n(ind.volatilityQuality,50));
  const institutional = clamp(n(ind.institutionalMoneyScore,45));
  const liquidity = clamp(n(ind.liquidityScore,45));
  const dip = clamp(n(ind.meanReversionScore,50));
  const breakout = clamp(n(ind.breakoutScore,50));
  const riskRaw = clamp(n(ind.riskScore, 100-volatilityQuality));
  const dataHealthCount = boolCount(ind.health);
  const indicatorCompleteness = clamp((n(ind.indicatorEngine?.computedFields,0) / Math.max(1,n(ind.indicatorEngine?.indicatorCount,100))) * 100);

  const dayTrading = clamp(
    volume*.28 + momentum*.20 + trend*.16 + breakout*.14 + liquidity*.12 + institutional*.10
  );
  const swing = clamp(
    trend*.30 + momentum*.23 + volume*.17 + institutional*.12 + breakout*.10 + dip*.08
  );
  const position = clamp(
    trend*.30 + institutional*.22 + volatilityQuality*.18 + liquidity*.12 + momentum*.10 + dip*.08
  );
  const iqs = clamp(
    trend*.15 + volume*.20 + momentum*.15 + dip*.10 + institutional*.15 + volatilityQuality*.10 + liquidity*.05 + indicatorCompleteness*.10
  );

  let finalScore = clamp(dayTrading*.22 + swing*.18 + position*.14 + institutional*.18 + iqs*.20 + (100-riskRaw)*.08);

  // Kritik negatif uyarılar: hacim sağlığı yoksa ve para akışı negatife dönmüşse skor şişmesin.
  if(ind.health && ind.health.volume===false) finalScore = clamp(finalScore - 12);
  if(n(ind.cmf,0) < -0.20) finalScore = clamp(finalScore - 4);
  if(n(ind.mfi,50) > 84) finalScore = clamp(finalScore - 3);
  if(n(ind.rvol20,0) >= 2 && n(ind.cmf,0) > 0) finalScore = clamp(finalScore + 4);

  const risk = riskRaw;
  const decision = decisionClass(finalScore, risk);
  const confidencePct = clamp(35 + dataHealthCount*5 + indicatorCompleteness*.25 + (liquidity-50)*.10 - Math.max(0,risk-65)*.30);
  const confidence = grade(confidencePct);

  const impacts = [
    signalImpact('Trend', trend, .15, 'EMA/SMA/trend kalitesi'),
    signalImpact('Momentum', momentum, .15, 'RSI, MACD, ROC vb.'),
    signalImpact('Hacim', volume, .20, 'RVOL, VWAP, CMF, MFI, OBV'),
    signalImpact('Kurumsal Para', institutional, .18, 'OBV/CMF/VWAP/likidite bileşimi'),
    signalImpact('IQS', iqs, .20, 'Kurumsal kalite skoru'),
    signalImpact('Risk', 100-risk, .08, 'Volatilite ve drawdown baskısı'),
    signalImpact('Dip/Mean Reversion', dip, .04, 'Dip uzaklığı ve tepki potansiyeli')
  ];
  const positives = impacts.filter(x=>x.value>=60).sort((a,b)=>b.value-a.value).slice(0,5);
  const negatives = impacts.filter(x=>x.value<48).sort((a,b)=>a.value-b.value).slice(0,5);

  return {
    version:'R19 AI Decision Engine',
    dayTrading, swing, position, institutional, iqs,
    finalScore, aiScore: finalScore, decision,
    confidence, confidencePct, risk,
    explain:{positives, negatives, impacts},
    breakdown:{trend,momentum,volume,volatility:volatilityQuality,institutional,liquidity,dip,breakout,iqs,risk},
    flags:{dataHealthCount, indicatorCompleteness, rvol:n(ind.rvol20,null), cmf:n(ind.cmf,null), mfi:n(ind.mfi,null), vwap:n(ind.vwap,null)}
  };
}
module.exports = { scoreFromIndicators, clamp, grade, decisionClass };
