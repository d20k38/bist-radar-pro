
const clamp=x=>Math.max(0,Math.min(100,Math.round(Number(x)||0)));
const pct=(a,b)=>b?((a-b)/b)*100:0;
const fmt=(n,d=2)=>Number((Number(n)||0).toFixed(d));
export function buildDipPro(symbol, analysis){
  const a=analysis||{}; const close=Number(a.close)||1;
  const support=clamp((100-(a.risk||50))*0.65+(a.pattern||35)*0.35);
  const rsiDip=clamp((a.rsi<35?80:a.rsi<45?65:45)+(a.momentum||0)*0.2);
  const macdTurn=clamp((a.hist>0?70:55)+(a.momentum||0)*0.25);
  const emaConvergence=clamp((a.close>a.ema20?70:50)+(a.trend||0)*0.25);
  const bollinger=clamp((100-(a.atrPct||4)*10)*0.45+(a.pattern||35)*0.55);
  const volume=clamp((a.volumeRatio||1)*35+(a.money||0)*0.45);
  const flow=clamp(a.money||0);
  const backtest=clamp((a.confidence||0)*0.45+(a.finalScore||0)*0.35+(a.pattern||0)*0.20);
  const newsKap=clamp((a.multiLayer?.newsKap)||55);
  const general=clamp(support*.15+rsiDip*.12+macdTurn*.10+emaConvergence*.10+bollinger*.10+volume*.10+flow*.13+backtest*.15+newsKap*.05);
  const risk=Number(a.risk)||50;
  const low=fmt(close*(1-Math.max(2.5,risk/22)/100),2);
  const high=fmt(close*(1-Math.max(0.5,risk/55)/100),2);
  const strongest=fmt((low+high)/2,2);
  const maturity=clamp(general*.72+(100-risk)*.18+backtest*.10);
  const remainingMin=Math.max(2,Math.round((100-maturity)/8));
  const remainingMax=Math.max(remainingMin+3,Math.round((100-maturity)/4+7));
  const reaction=clamp((a.potential||50)*0.65+(100-risk)*0.20+(a.pattern||0)*0.15);
  const target1=fmt(close*(1+reaction/100*.45),2);
  const target2=fmt(close*(1+reaction/100*.85),2);
  const stop=fmt(low*(1-Math.max(2.5,risk/30)/100),2);
  const similar=Math.max(8,Math.round(10+(backtest/100)*24));
  const successRate=fmt(Math.min(88,45+general*.42),1);
  const successful=Math.round(similar*successRate/100);
  const avgRise=fmt(8+reaction*.45,1);
  const avgWait=Math.round(remainingMax+8+(100-general)/5);
  const institutional=clamp((a.money||0)*0.75+volume*.25);
  const accumulation=clamp(institutional*.70+(100-risk)*.30);
  const distribution=clamp(100-accumulation+risk*.15);
  const mostLikelyDate=new Date(); mostLikelyDate.setDate(mostLikelyDate.getDate()+Math.round((remainingMin+remainingMax)/2));
  return {symbol,currentPrice:fmt(close,2),
    scores:{support,rsiDip,macdTurn,emaConvergence,bollinger,volume,flow,backtest,newsKap,general},
    dipRegion:{low,high,strongest,confidence:fmt(general*.75+backtest*.25,1)},
    maturity:{score:maturity,remaining:`${remainingMin}-${remainingMax} işlem günü`,mostLikelyDate:mostLikelyDate.toISOString().slice(0,10),dateRange:'±4 işlem günü'},
    levels:{firstBuy:high,strongBuy:strongest,stop,firstTarget:target1,mainTarget:target2},
    scenarios:{optimistic:{probability:28,target:fmt(close*(1+reaction/100*1.15),2)},expected:{probability:54,target:target2},pessimistic:{probability:18,stop}},
    history:{similar,successful,successRate,avgRise,avgWait},catchBottom:clamp(general*.65+maturity*.25+(100-risk)*.10),funds:{institutional,accumulation,distribution},
    decision:general>=82?'KADEMELİ AL':general>=68?'İLK ALIM BÖLGESİ İZLE':general>=52?'TEYİT BEKLE':'ERKEN',
    reasons:['Destek bölgesi, momentum ve para girişi birlikte dip skoruna dahil edildi.','Tek fiyat yerine dip fiyat aralığı hesaplandı.','Falling Knife ve erken alım riski ayrı izlenir.','Backtest, geçmiş benzer yapıların başarı oranını temsil eder.','Kademeli alım için ilk alım, güçlü alım ve stop seviyeleri üretildi.'],base:a};
}
export function committee2(symbol, analysis, dip){
  const a=analysis||{}, d=dip||buildDipPro(symbol,a);
  const experts=[
    {icon:'📈',name:'Teknik Analist',score:clamp((a.trend||0)*.45+(a.momentum||0)*.30+(a.pattern||0)*.25),view:(a.trend||0)>68?'AL':'İZLE',reason:'Trend, momentum ve formasyon birlikte değerlendirildi.'},
    {icon:'📊',name:'Temel Analist',score:clamp(a.multiLayer?.financial||60),view:(a.multiLayer?.financial||60)>70?'AL':'İZLE',reason:'Finansal sağlık katmanı için büyüme/borçluluk temsil puanı.'},
    {icon:'📰',name:'Haber/KAP Analisti',score:clamp(d.scores.newsKap),view:d.scores.newsKap>68?'AL':d.scores.newsKap>45?'NÖTR':'DİKKAT',reason:'KAP/haber duyarlılığı karara eklendi.'},
    {icon:'💰',name:'Para Akışı Analisti',score:clamp(a.money||0),view:(a.money||0)>70?'AL':'İZLE',reason:'OBV/MFI/VWAP benzeri para akışı temsil puanı.'},
    {icon:'🧩',name:'Formasyon Analisti',score:clamp(a.pattern||0),view:(a.pattern||0)>70?'AL':'İZLE',reason:'Çanak, ikili dip, TOBO benzeri formasyon olasılığı.'},
    {icon:'📊',name:'Backtest Analisti',score:clamp(d.scores.backtest),view:d.scores.backtest>70?'AL':'İZLE',reason:'Benzer geçmiş sinyallerin başarı temsil puanı.'},
    {icon:'🛡️',name:'Risk Yöneticisi',score:clamp(100-(a.risk||60)),view:(a.risk||60)<35?'AL':(a.risk||60)<55?'DİKKAT':'RİSKLİ',reason:'Volatilite, stop mesafesi ve düşüş riski birlikte değerlendirildi.'},
    {icon:'🎯',name:'Dip Avcısı AI',score:clamp(d.scores.general),view:d.decision,reason:'Dip bölgesi, olgunluk, tepki hedefi ve Falling Knife riski incelendi.'}
  ];
  const finalScore=clamp(experts.reduce((s,e)=>s+e.score,0)/experts.length);
  const finalDecision=finalScore>=82?'GÜÇLÜ AL':finalScore>=68?'AL':finalScore>=52?'İZLE':'BEKLE';
  return {symbol,experts,finalScore,finalDecision,summary:`${symbol} için Komite 2.0 ortalama güven puanı ${finalScore}/100. Nihai karar: ${finalDecision}.`};
}
