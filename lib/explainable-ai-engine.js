function n(x,d=0){x=Number(x);return Number.isFinite(x)?x:d}
function clamp(x){return Math.max(0,Math.min(100,Math.round(n(x))))}
function signLabel(v){v=n(v); if(v>=12)return 'Güçlü pozitif'; if(v>=5)return 'Pozitif'; if(v>-5)return 'Nötr'; if(v>-12)return 'Negatif'; return 'Güçlü negatif'}
function light(v){v=n(v); if(v>=70)return 'green'; if(v>=45)return 'yellow'; return 'red'}
function grade(v){v=n(v); if(v>=90)return 'A+'; if(v>=82)return 'A'; if(v>=72)return 'B+'; if(v>=62)return 'B'; if(v>=50)return 'C'; return 'D'}
function addLayer(arr,key,label,value,weight,explain,positive=true){
  value=clamp(value); weight=n(weight);
  const contribution=Number(((value-50)/50*weight).toFixed(2));
  arr.push({key,label,value,weight,contribution,status:light(value),impact:signLabel(contribution),explain,positive});
}
export function buildExplainableAI(symbol, core={}, decisionPayload=null){
  const a=core.analysis||core||{};
  const day=core.dayTrading||{};
  const inst=core.institutional||core.institutionalScanner||{};
  const q=core.quality||core.iqs||{};
  const layers=[];
  const rvol=n(day.rvol20||a.rvol20||a.volumeRatio||1);
  const rvolScore=clamp(rvol>=4?96:rvol>=3?88:rvol>=2?78:rvol>=1.5?66:rvol>=1?52:35);
  addLayer(layers,'rvol','Relative Volume',rvolScore,18,`RVOL ${rvol.toFixed(2)}x; hacim ortalamasına göre ${rvol>=2?'belirgin güçlü':'sınırlı'} hareket.`);
  addLayer(layers,'money','Kurumsal Para',n(inst.components?.moneyFlow||a.money||a.moneyFlow||50),16,'OBV/CMF/MFI/VWAP tabanlı para akışı katmanı.');
  addLayer(layers,'trend','Trend Kalitesi',n(a.trend||inst.components?.trend||50),14,'EMA/SuperTrend ve yön kalitesi birlikte değerlendirilir.');
  addLayer(layers,'momentum','Momentum',n(a.momentum||inst.components?.momentum||50),12,'RSI/MACD/ROC benzeri momentum bileşenleri.');
  addLayer(layers,'vwap','VWAP Uyumu',n(day.scores?.vwap||a.vwapScore||inst.components?.vwap||50),10,'Fiyatın VWAP ile ilişkisi kurumsal işlem ortalamasına göre okunur.');
  addLayer(layers,'dip','Dip / Tepki Gücü',n(a.pattern||a.dipScore||inst.components?.dip||50),9,'Dip kümesi, tepki gücü ve formasyon desteği.');
  addLayer(layers,'kap','KAP / Haber Etkisi',n(a.kapScore||inst.components?.kap||50),8,'Son gerçek KAP/haber etkisi varsa puana eklenir; veri yoksa nötr kabul edilir.');
  addLayer(layers,'backtest','Backtest Güveni',n(a.backtestScore||inst.components?.backtest||q.backtest||50),8,'Geçmiş sinyal başarısı ve istatistiksel güven.');
  const riskRaw=n(a.risk||inst.components?.risk||50);
  const riskScore=clamp(100-riskRaw);
  addLayer(layers,'risk','Risk Kontrolü',riskScore,10,`Risk motoru ${riskRaw}/100; düşük risk pozitif, yüksek risk negatif katkı üretir.`,riskRaw<=55);
  addLayer(layers,'liquidity','Likidite',n(inst.components?.liquidity||q.liquidity||60),5,'İşlem hacmi ve pozisyon taşınabilirliği.');
  const base=50+layers.reduce((s,x)=>s+x.contribution,0);
  const score=clamp(decisionPayload?.confidenceScore||q.score||inst.score||day.score||base);
  const riskPenalty=Math.max(0,riskRaw-60);
  const dataQuality=clamp(85 + (core.meta?.source?8:0) - (core.meta?.fallback?20:0));
  const confidence=clamp(score*.50 + dataQuality*.20 + (100-riskRaw)*.18 + n(a.confidence||50)*.12 - riskPenalty*.25);
  let decision='BEKLE';
  if(score>=86&&confidence>=78&&riskRaw<62)decision='GÜÇLÜ AL';
  else if(score>=72&&confidence>=62&&riskRaw<70)decision='AL / İZLE';
  else if(score>=55)decision='İZLE';
  else if(riskRaw>=72)decision='RİSKLİ';
  else decision='ZAYIF';
  const positives=layers.filter(x=>x.contribution>4).sort((a,b)=>b.contribution-a.contribution).map(x=>`${x.label}: +${x.contribution} (${x.explain})`);
  const negatives=layers.filter(x=>x.contribution<-3).sort((a,b)=>a.contribution-b.contribution).map(x=>`${x.label}: ${x.contribution} (${x.explain})`);
  const trace=[
    `Başlangıç puanı 50 kabul edildi.`,
    ...layers.sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,8).map(x=>`${x.label} katkısı ${x.contribution>0?'+':''}${x.contribution} puan.`),
    `Son AI skoru ${score}/100, güven ${confidence}/100, risk ${riskRaw}/100.`
  ];
  const shortComment=`${symbol} için Explainable AI kararı: ${decision}. Skor ${score}/100, güven ${grade(confidence)} (${confidence}/100). En güçlü katkılar: ${positives.slice(0,3).map(x=>x.split(':')[0]).join(', ')||'nötr katmanlar'}. ${negatives.length?'Başlıca risk: '+negatives[0].split(':')[0]+'.':'Belirgin negatif katman sınırlı.'}`;
  return {symbol,score,decision,confidence,confidenceGrade:grade(confidence),risk:riskRaw,dataQuality,layers:layers.sort((a,b)=>b.weight-a.weight),positives,negatives,trace,shortComment,traffic:{green:layers.filter(x=>x.status==='green').length,yellow:layers.filter(x=>x.status==='yellow').length,red:layers.filter(x=>x.status==='red').length}};
}
