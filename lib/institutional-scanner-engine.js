const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const round=(x,d=2)=>Number.isFinite(Number(x))?Number(Number(x).toFixed(d)):0;
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,n(x,0)));

function pickKapScore(row){
  const c=row?.corporateNews||row?.news||row?.kap||{};
  return n(c.score ?? c.impactScore ?? c.institutionalScore ?? row?.kapScore, 50);
}
function pickBacktest(row){
  return n(row?.backtest?.successRate ?? row?.ai?.backtestSuccess ?? row?.successProbability ?? row?.confidence ?? 50, 50);
}
function pickTrend(row){
  return n(row?.scores?.trend ?? row?.scores?.adx ?? row?.ai?.trendScore ?? row?.ai?.aiTrust ?? 50, 50);
}
function pickDip(row){
  return n(row?.ai?.dipScore ?? row?.dipScore ?? row?.scores?.cluster ?? 50, 50);
}
function pickMoney(row){
  const d=row?.dayTrading||{};
  const parts=[d.scores?.obv,d.scores?.cmf,d.scores?.mfi,d.scores?.vwap].map(x=>n(x,NaN)).filter(Number.isFinite);
  if(parts.length) return parts.reduce((s,x)=>s+x,0)/parts.length;
  return n(row?.ai?.institutional ?? row?.scores?.money ?? 50, 50);
}
function riskScore(row){
  const d=row?.dayTrading||{};
  const atr=n(d.atrPct,3);
  const liq=n(d.scores?.liquidity,50);
  const volPenalty=atr>8?34:atr>5?20:atr>3?8:0;
  return clamp(70 - volPenalty + (liq-50)*0.22);
}
export function analyzeInstitutionalScanner(row){
  const d=row?.dayTrading||{};
  const parts={
    rvol: n(d.scores?.rvol ?? d.score, 50),
    relativeStrength: n(d.scores?.relativeStrength, 50),
    moneyFlow: pickMoney(row),
    vwap: n(d.scores?.vwap, 50),
    dip: pickDip(row),
    trend: pickTrend(row),
    kap: pickKapScore(row),
    backtest: pickBacktest(row),
    momentum: n(d.scores?.momentum, 50),
    risk: riskScore(row),
    liquidity: n(d.scores?.liquidity, 50)
  };
  const score=clamp(
    parts.rvol*.20 + parts.relativeStrength*.12 + parts.moneyFlow*.16 + parts.vwap*.08 +
    parts.dip*.10 + parts.trend*.08 + parts.kap*.08 + parts.backtest*.10 +
    parts.momentum*.04 + parts.risk*.03 + parts.liquidity*.01
  );
  let grade='ZAYIF', bucket='Zayıf', action='TEYİT BEKLE';
  if(score>=88){grade='A+'; bucket='Kurumsal Aday'; action='İLK EKRAN / GÜÇLÜ İZLE';}
  else if(score>=78){grade='A'; bucket='Güçlü Aday'; action='GÜÇLÜ İZLE';}
  else if(score>=68){grade='B'; bucket='Aday'; action='İZLE';}
  else if(score>=58){grade='C'; bucket='Takip'; action='TEYİT BEKLE';}
  else if(score>=45){grade='D'; bucket='Nötr'; action='ZAYIF İZLE';}
  const reasons=[];
  if(n(d.rvol20)>=2) reasons.push(`RVOL20 ${round(d.rvol20,2)}x: hacim kurumsal tarama eşiğinin üstünde`);
  if(parts.relativeStrength>=65) reasons.push('BIST100/eş benchmarka göre göreceli güç yüksek');
  if(parts.moneyFlow>=65) reasons.push('OBV + CMF + MFI + VWAP para akışı güçlü');
  if(parts.dip>=70) reasons.push('Dip Avcısı / destek bölgesi skoru güçlü');
  if(parts.kap>=70) reasons.push('KAP/Haber etkisi pozitif katkı veriyor');
  if(parts.backtest>=65) reasons.push('Geçmiş sinyal/backtest güveni olumlu');
  if(parts.risk<45) reasons.push('Risk motoru volatilite veya likidite nedeniyle uyarı veriyor');
  if(!reasons.length) reasons.push('Kurumsal adaylık için ek hacim, para akışı veya trend teyidi beklenmeli');
  const plan=d.plan||{};
  return {
    score:round(score,1), grade, bucket, action,
    components:Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,round(v,1)])),
    rvol20:round(d.rvol20,2), rvol5:round(d.rvol5,2), currentPrice:d.currentPrice,
    riskLabel:parts.risk>=70?'Düşük':parts.risk>=50?'Orta':'Yüksek',
    setup: score>=78 && n(d.rvol20)>=2 ? 'Day + Swing Kurumsal Aday' : score>=68 ? 'Takip Listesi' : 'Teyit Bekle',
    plan:{entryLow:plan.entryLow, entryHigh:plan.entryHigh, stop:plan.stop, target1:plan.target1, target2:plan.target2, riskReward:plan.riskReward},
    reasons,
    source:'real_ohlcv_volume_existing_api_no_random'
  };
}
