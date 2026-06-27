
import { SYMBOLS } from './symbols.js';

export function getSymbols(){ return SYMBOLS; }

function seed(s){ return [...String(s)].reduce((a,c)=>a+c.charCodeAt(0),0); }
function rnd(s,m=1){ return Math.abs((Math.sin(seed(s))*10000)%1)*m; }
function clamp(v,min=0,max=100){ return Math.max(min, Math.min(max, Number.isFinite(v)?v:0)); }
function round(n,d=2){ return Number((Number(n)||0).toFixed(d)); }

export function analyzeStock(symbol='PAPIL'){
  symbol = String(symbol).toUpperCase();
  const trend=rnd(symbol+'trend',100);
  const money=rnd(symbol+'money',100);
  const momentum=rnd(symbol+'momentum',100);
  const pattern=rnd(symbol+'pattern',100);
  const risk=rnd(symbol+'risk',75);
  const backtest=rnd(symbol+'backtest',100);
  const news=rnd(symbol+'news',100);
  const financial=45+rnd(symbol+'financial',50);
  const sector=45+rnd(symbol+'sector',50);
  const price=round(10+rnd(symbol+'price',120),2);
  const ai=Math.round(trend*.15+money*.15+momentum*.12+pattern*.10+(100-risk)*.12+backtest*.14+news*.08+financial*.08+sector*.06);
  const potential=Math.round((100-risk)*.20+momentum*.25+pattern*.25+money*.15+rnd(symbol+'potential',15));
  return {
    symbol,price,trend,money,momentum,pattern,risk,backtest,news,financial,sector,ai,potential,
    decision: ai>=82?'GÜÇLÜ AL':ai>=68?'AL':ai>=52?'İZLE':'BEKLE'
  };
}

export function makeOhlcv(symbol='PAPIL', days=140){
  let p=analyzeStock(symbol).price;
  const arr=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const open=p;
    p=Math.max(1,p*(1+Math.sin((days-i)/8+seed(symbol)/11)*0.012+(rnd(symbol+i,1)-.5)*.025));
    const high=Math.max(open,p)*(1+rnd(symbol+'h'+i,.025));
    const low=Math.min(open,p)*(1-rnd(symbol+'l'+i,.025));
    arr.push({date:d.toISOString().slice(0,10),open:round(open),high:round(high),low:round(low),close:round(p),volume:Math.round(500000+rnd(symbol+'v'+i,15000000))});
  }
  return arr;
}

export function analyzeDipPro(symbol='PAPIL'){
  const x=analyzeStock(symbol);
  const support=clamp(100-x.risk + x.pattern*.25);
  const rsiDip=clamp(x.momentum*.8 + (100-x.risk)*.2);
  const macdTurn=clamp(x.momentum*.65 + x.trend*.35);
  const emaConvergence=clamp((100-Math.abs(x.trend-x.momentum))*.55 + x.trend*.25);
  const bollinger=clamp((100-x.risk)*.55 + x.pattern*.45);
  const volume=clamp(x.money*.65 + x.momentum*.20 + x.news*.15);
  const flow=clamp(x.money*.8 + x.trend*.2);
  const backtest=x.backtest;
  const newsKap=x.news;
  const general=clamp(support*.15+rsiDip*.12+macdTurn*.10+emaConvergence*.10+bollinger*.10+volume*.10+flow*.13+backtest*.15+newsKap*.05);

  const lowBand=round(x.price*(1-Math.max(2.5, x.risk/22)/100),2);
  const highBand=round(x.price*(1-Math.max(0.5, x.risk/55)/100),2);
  const strongest=round((lowBand+highBand)/2,2);
  const maturity=clamp(general*.7 + (100-x.risk)*.2 + x.backtest*.1);
  const remainingMin=Math.max(2, Math.round((100-maturity)/8));
  const remainingMax=Math.max(remainingMin+3, Math.round((100-maturity)/4+7));
  const firstBuy=round(highBand,2);
  const strongBuy=round(strongest,2);
  const stop=round(lowBand*(1-Math.max(2.5,x.risk/30)/100),2);
  const firstTarget=round(x.price*(1+x.potential/100*.45),2);
  const mainTarget=round(x.price*(1+x.potential/100*.85),2);
  const optimistic=round(x.price*(1+x.potential/100*1.15),2);
  const expected=mainTarget;
  const pessimistic=stop;
  const similar=Math.max(8, Math.round(8+rnd(symbol+'sim',26)));
  const successful=Math.round(similar*(0.48+general/220));
  const successRate=round(successful/similar*100,1);
  const avgRise=round(8+x.potential*.55,1);
  const avgWait=Math.round(remainingMax+8+rnd(symbol+'wait',22));
  const mostLikelyDate=new Date(); mostLikelyDate.setDate(mostLikelyDate.getDate()+Math.round((remainingMin+remainingMax)/2));
  const institutional=clamp(x.money*.75 + volume*.25);
  const accumulation=clamp(institutional*.7 + (100-x.risk)*.3);
  const distribution=clamp(100-accumulation + x.risk*.15);

  return {
    symbol:x.symbol, currentPrice:x.price,
    scores:{support,rsiDip,macdTurn,emaConvergence,bollinger,volume,flow,backtest,newsKap,general},
    dipRegion:{low:lowBand,high:highBand,strongest,confidence:round(general*.75+backtest*.25,1)},
    maturity:{score:round(maturity,1),remaining:`${remainingMin}-${remainingMax} işlem günü`,mostLikelyDate:mostLikelyDate.toISOString().slice(0,10),dateRange:'±4 işlem günü'},
    levels:{firstBuy,strongBuy,stop,firstTarget,mainTarget},
    scenarios:{
      optimistic:{probability:28,target:optimistic},
      expected:{probability:54,target:expected},
      pessimistic:{probability:18,stop:pessimistic}
    },
    history:{similar,successful,successRate,avgRise,avgWait},
    catchBottom:round(clamp(general*.65 + maturity*.25 + (100-x.risk)*.10),1),
    funds:{institutional:round(institutional,1),accumulation:round(accumulation,1),distribution:round(distribution,1)},
    decision: general>=82?'KADEMELİ AL':general>=68?'İLK ALIM BÖLGESİ İZLE':general>=52?'TEYİT BEKLE':'ERKEN',
    reasons:[
      'Destek bölgesi, momentum ve para girişi birlikte dip skoruna dahil edildi.',
      'Tek fiyat yerine dip fiyat aralığı hesaplandı.',
      'Falling Knife ve erken alım riski ayrı izlenir.',
      'Backtest, geçmiş benzer yapıların başarı oranını temsil eder.',
      'Kademeli alım için ilk alım, güçlü alım ve stop seviyeleri üretildi.'
    ],
    base:x
  };
}

export function investmentCommittee(symbol='PAPIL'){
  const x=analyzeStock(symbol);
  const dip=analyzeDipPro(symbol);
  const experts=[
    {name:'📈 Teknik Analist',score:clamp(x.trend*.45+x.momentum*.30+x.pattern*.25),view:x.trend>68?'AL':'İZLE',reason:'Trend, momentum ve formasyon birlikte değerlendirildi.'},
    {name:'📊 Temel Analist',score:x.financial,view:x.financial>70?'AL':'İZLE',reason:'Finansal sağlık katmanı için büyüme/borçluluk temsil puanı.'},
    {name:'📰 Haber/KAP Analisti',score:x.news,view:x.news>68?'AL':x.news>45?'NÖTR':'DİKKAT',reason:'KAP/haber duyarlılık puanı karar katmanına eklendi.'},
    {name:'💰 Para Akışı Analisti',score:x.money,view:x.money>70?'AL':'İZLE',reason:'OBV/MFI/VWAP benzeri para akışı temsil puanı.'},
    {name:'🧩 Formasyon Analisti',score:x.pattern,view:x.pattern>70?'AL':'İZLE',reason:'Çanak, ikili dip, TOBO benzeri formasyon olasılığı.'},
    {name:'📊 Backtest Analisti',score:x.backtest,view:x.backtest>70?'AL':'İZLE',reason:'Benzer geçmiş sinyallerin başarı temsil puanı.'},
    {name:'🛡️ Risk Yöneticisi',score:100-x.risk,view:x.risk<35?'AL':x.risk<55?'DİKKAT':'RİSKLİ',reason:'Volatilite, stop mesafesi ve düşüş riski birlikte değerlendirildi.'},
    {name:'🎯 Dip Avcısı AI',score:dip.scores.general,view:dip.decision,reason:'Dip bölgesi, olgunluk, tepki hedefi ve Falling Knife riski incelendi.'}
  ];
  const finalScore=round(experts.reduce((a,e)=>a+e.score,0)/experts.length,1);
  return {
    symbol:x.symbol,
    experts,
    finalScore,
    finalDecision:finalScore>=82?'GÜÇLÜ AL':finalScore>=68?'AL':finalScore>=52?'İZLE':'BEKLE',
    summary:`${x.symbol} için komite ortalama güven puanı ${finalScore}/100. Karar ${finalScore>=82?'GÜÇLÜ AL':finalScore>=68?'AL':finalScore>=52?'İZLE':'BEKLE'}.`
  };
}
