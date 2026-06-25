function n(x,d=0){x=Number(x);return Number.isFinite(x)?x:d}
function clamp(x){return Math.max(0,Math.min(100,Math.round(x||0)))}
export function buildDecisionPayload(symbol, analysis={}, layers=null, backtest=null, kap=null){
  const close=n(analysis.close), stop=n(analysis.stop), target1=n(analysis.target1), target2=n(analysis.target2);
  const trend=n(analysis.trend), momentum=n(analysis.momentum), money=n(analysis.money), pattern=n(analysis.pattern), risk=n(analysis.risk,60), confidence=n(analysis.confidence), finalScore=n(analysis.finalScore), potential=n(analysis.potential);
  const kapScore=n(kap?.avgImpact,50), backtestScore=n(backtest?.summary?.successRate,50);
  const aiScore=clamp(finalScore*.35+confidence*.18+trend*.12+money*.10+momentum*.10+pattern*.08+kapScore*.04+backtestScore*.03-Math.max(0,risk-45)*.20);
  const probability=clamp(aiScore*.55+confidence*.20+(100-risk)*.15+backtestScore*.10);
  const expectedReturn=close&&target1?((target1-close)/close)*100:0;
  const riskPct=close&&stop?((close-stop)/close)*100:0;
  const riskReward=(close&&stop&&target1&&close>stop)?((target1-close)/(close-stop)):0;
  let decision='BEKLE';
  if(aiScore>=82 && risk<55) decision='GÜÇLÜ AL';
  else if(aiScore>=68 && risk<65) decision='AL';
  else if(aiScore>=52) decision='İZLE';
  else if(aiScore<38 || risk>75) decision='RİSKLİ';
  const positives=[]; const warnings=[];
  const add=(ok,pos,neg)=>ok?positives.push(pos):warnings.push(neg);
  add(trend>=65,`Trend güçlü: ${trend}/100`,`Trend zayıf: ${trend}/100`);
  add(momentum>=55,`Momentum destekliyor: ${momentum}/100`,`Momentum sınırlı: ${momentum}/100`);
  add(money>=55,`Para girişi olumlu: ${money}/100`,`Para girişi zayıf: ${money}/100`);
  add(pattern>=60,`Formasyon desteği var: ${analysis.formation?.name||pattern}`,`Formasyon teyidi zayıf: ${pattern}/100`);
  add(risk<=45,`Risk kontrol edilebilir: ${risk}/100`,`Risk yüksek: ${risk}/100`);
  add(riskReward>=1.5,`Risk/getiri uygun: 1:${riskReward.toFixed(2)}`,`Risk/getiri zayıf: 1:${riskReward.toFixed(2)}`);
  const comment = `${symbol} için AI karar motoru ${decision} sonucunu üretir. Güven puanı ${aiScore}/100, olasılık %${probability}, risk ${risk}/100. Beklenen getiri yaklaşık %${expectedReturn.toFixed(1)}; stop ${stop?.toFixed?.(2)||stop}, hedef ${target1?.toFixed?.(2)||target1}. ${positives.slice(0,3).join(' ')} ${warnings.length?'Dikkat: '+warnings.slice(0,2).join(' '):''}`;
  return {symbol,decision,confidenceScore:aiScore,riskScore:risk,probability,expectedReturn:+expectedReturn.toFixed(2),riskPct:+riskPct.toFixed(2),riskReward:+riskReward.toFixed(2),stop,target1,target2,comment,positives,warnings,layerInputs:{trend,momentum,money,pattern,kapScore,backtestScore,finalScore,confidence}};
}
