const clamp = (x,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number(x)||0)));
const num = (x,d=0)=>Number.isFinite(Number(x))?Number(x):d;

export function buildLayeredConfidence({analysis={}, kapImpact=50, backtestScore=50, learningScore=null}={}){
  const trend = clamp(analysis.trend ?? 0);
  const momentum = clamp(analysis.momentum ?? 0);
  const money = clamp(analysis.money ?? 0);
  const formation = clamp(analysis.pattern ?? analysis.formation?.score ?? 35);
  const kap = clamp(kapImpact ?? 50);
  const backtest = clamp(learningScore ?? backtestScore ?? 50);
  const risk = clamp(analysis.risk ?? 60);
  const riskAdjustment = clamp(100 - risk);
  const aiGeneral = clamp(
    trend*0.20 + momentum*0.15 + money*0.15 + formation*0.15 + kap*0.15 + backtest*0.10 + riskAdjustment*0.10
  );
  const decision = aiGeneral>=82?'GÜÇLÜ AL':aiGeneral>=68?'AL':aiGeneral>=54?'İZLE':aiGeneral>=40?'BEKLE':'RİSKLİ';
  const layers = [
    {key:'trend', name:'Trend', score:trend, weight:20, comment:trend>=70?'Trend güçlü':trend>=50?'Trend orta seviyede':'Trend zayıf'},
    {key:'momentum', name:'Momentum', score:momentum, weight:15, comment:momentum>=70?'Momentum güçlü':momentum>=50?'Momentum izlenebilir':'Momentum zayıf'},
    {key:'money', name:'Para Girişi', score:money, weight:15, comment:money>=70?'Para girişi güçlü':money>=50?'Para girişi dengeli':'Para girişi zayıf'},
    {key:'formation', name:'Formasyon', score:formation, weight:15, comment:formation>=70?'Formasyon desteği güçlü':formation>=50?'Formasyon adayı var':'Formasyon teyidi zayıf'},
    {key:'kap', name:'Haber/KAP', score:kap, weight:15, comment:kap>=65?'Haber/KAP akışı olumlu':kap<=42?'Haber/KAP akışı riskli':'Haber/KAP nötr'},
    {key:'backtest', name:'Backtest', score:backtest, weight:10, comment:backtest>=65?'Geçmiş sinyal başarısı güçlü':backtest>=52?'Geçmiş sinyal başarısı orta':'Geçmiş sinyal başarısı zayıf'},
    {key:'ai', name:'AI Genel', score:aiGeneral, weight:100, comment:`Nihai karar: ${decision}`}
  ];
  const positives = layers.filter(x=>x.key!=='ai' && x.score>=65).map(x=>`${x.name}: ${x.score}/100`);
  const warnings = layers.filter(x=>x.key!=='ai' && x.score<50).map(x=>`${x.name}: ${x.score}/100`);
  const summary = `Çok katmanlı güven puanı ${aiGeneral}/100. ${decision} kararı; trend, momentum, para girişi, formasyon, Haber/KAP ve backtest katmanlarının ağırlıklı birleşimiyle üretildi.`;
  return {aiGeneral, decision, risk, riskAdjustment, layers, positives, warnings, summary, weights:{trend:20,momentum:15,money:15,formation:15,kap:15,backtest:10,risk:10}};
}
