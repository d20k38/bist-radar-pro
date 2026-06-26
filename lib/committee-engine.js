
const n=(x,d=0)=>{x=Number(x);return Number.isFinite(x)?x:d};
const clamp=x=>Math.max(0,Math.min(100,Math.round(x||0)));
function voteFromScore(score,risk=50){
  score=n(score); risk=n(risk,50);
  if(score>=82 && risk<60) return 'GÜÇLÜ AL';
  if(score>=68 && risk<70) return 'AL';
  if(score>=52) return 'İZLE';
  if(score>=38) return 'BEKLE';
  return 'RİSKLİ';
}
function iconFor(v){return v==='GÜÇLÜ AL'||v==='AL'?'🟢':v==='İZLE'||v==='BEKLE'?'🟡':'🔴'}
function avg(arr){const a=arr.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:0}
export function buildInvestmentCommittee({symbol,analysis={},learning=null,backtest=null,kap=null,portfolio=null}={}){
  const risk=n(analysis.risk,55), trend=n(analysis.trend), momentum=n(analysis.momentum), money=n(analysis.money), pattern=n(analysis.pattern), confidence=n(analysis.confidence), finalScore=n(analysis.finalScore);
  const kapScore=n(kap?.avgImpact,50);
  const btScore=n(backtest?.summary?.successRate, learning?.summary?.successRate ?? 50);
  const learnAdj=n(learning?.confidenceAdjustment,0);
  const technicalScore=clamp(trend*.32+momentum*.25+money*.18+pattern*.15+confidence*.10-Math.max(0,risk-55)*.18);
  const fundamentalScore=clamp(55 + (trend-50)*.18 + (money-50)*.16 + (kapScore-50)*.20 - Math.max(0,risk-60)*.15);
  const newsScore=clamp(kapScore);
  const riskScore=clamp((100-risk)*.55 + confidence*.20 + Math.min(n(analysis.riskReward,60),100)*.25);
  const learningScore=clamp(btScore*.55 + finalScore*.25 + 50*.10 + learnAdj*1.5);
  const experts=[
    {id:'technical', icon:'📈', name:'Teknik Analist', score:technicalScore, view:voteFromScore(technicalScore,risk), reason:`Trend ${trend}/100, momentum ${momentum}/100, para girişi ${money}/100 ve formasyon ${pattern}/100 birlikte değerlendirildi.`},
    {id:'fundamental', icon:'📊', name:'Temel Analist', score:fundamentalScore, view:voteFromScore(fundamentalScore,risk+5), reason:`Temel veri gelmediğinde finansal taraf, likidite/para girişi ve KAP etkisi ile temkinli skorlanır. KAP/Haber etkisi ${kapScore}/100.`},
    {id:'news', icon:'📰', name:'Haber Analisti', score:newsScore, view:voteFromScore(newsScore,risk), reason:`KAP ve haber duyarlılığı ${kapScore}/100. Olumlu haber sinyali teknik skoru destekler, olumsuz haber risk puanını yükseltir.`},
    {id:'risk', icon:'💰', name:'Risk Yöneticisi', score:riskScore, view:voteFromScore(riskScore,100-risk), reason:`Risk ${risk}/100, stop ve risk/getiri dengesi kontrol edildi. Düşük risk yüksek güveni destekler.`},
    {id:'learning', icon:'🤖', name:'Öğrenen AI', score:learningScore, view:voteFromScore(learningScore,risk), reason:`Geçmiş sinyal başarı oranı ${btScore}/100 ve öğrenme düzeltmesi ${learnAdj>=0?'+':''}${learnAdj} puan olarak hesaba katıldı.`}
  ];
  const weights={technical:.30,fundamental:.15,news:.15,risk:.20,learning:.20};
  const weighted=experts.reduce((s,e)=>s+e.score*(weights[e.id]||.2),0);
  const agreement=avg(experts.map(e=>['GÜÇLÜ AL','AL'].includes(e.view)?100:['İZLE','BEKLE'].includes(e.view)?55:20));
  const final=clamp(weighted*.82+agreement*.18);
  const finalDecision=voteFromScore(final,risk);
  const positives=experts.filter(e=>e.score>=68).map(e=>`${e.icon} ${e.name}: ${e.score}/100`);
  const warnings=experts.filter(e=>e.score<52).map(e=>`${e.icon} ${e.name}: ${e.score}/100`);
  const explainableAI={
    title:'Açıklanabilir AI',
    summary:`${symbol} için karar tek bir göstergeye değil; teknik, haber, risk ve öğrenen AI uzmanlarının ortak değerlendirmesine dayanır.`,
    reasons:[
      `Teknik skor: ${technicalScore}/100`,
      `Risk yönetimi skoru: ${riskScore}/100`,
      `Öğrenen AI skoru: ${learningScore}/100`,
      `Haber/KAP skoru: ${newsScore}/100`
    ]
  };
  const learningSystem={
    title:'Öğrenen Sistem',
    summary:`Geçmiş sinyaller 5/20/30 günlük sonuçlarla izlenir; başarılı çalışan kurallar güven puanını artırır, zayıf kurallar azaltır.`,
    successRate:btScore,
    confidenceAdjustment:learnAdj
  };
  const performanceTracking={
    title:'Performans Takibi',
    summary:`Karar türleri, yıllar ve aktif kurallar ayrı ayrı ölçülerek hangi sinyal setinin daha başarılı olduğu görünür hale getirilir.`,
    measured:`Backtest başarı: ${btScore}/100`
  };
  const committeeComment=`${symbol} için AI Yatırım Komitesi nihai kararı ${finalDecision}. Komite güveni ${final}/100. ${positives.length?'Güçlü uzman görüşleri: '+positives.join(', ')+'. ':''}${warnings.length?'Dikkat edilmesi gereken uzman görüşleri: '+warnings.join(', ')+'. ':''}Bu ekran yatırım tavsiyesi değil, çok kaynaklı karar destek özetidir.`;
  return {symbol, finalDecision, finalScore:final, risk, agreement:clamp(agreement), experts, positives, warnings, explainableAI, learningSystem, performanceTracking, committeeComment, icon:iconFor(finalDecision)};
}
