
import { sma, ema, rsi, macd, atr, obv, adx } from './indicators.js';

const n = (x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const clamp = (x,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(Number(x))?Number(x):0));
const round = (x,d=2)=>Number.isFinite(Number(x))?Number(Number(x).toFixed(d)):0;
const lastFinite = (arr, d=0)=> {
  for(let i=(arr?.length||0)-1;i>=0;i--) if(Number.isFinite(Number(arr[i]))) return Number(arr[i]);
  return d;
};
const avg = arr => {
  const a=(arr||[]).map(Number).filter(Number.isFinite);
  return a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
};
const min = arr => Math.min(...(arr||[]).map(Number).filter(Number.isFinite));
const max = arr => Math.max(...(arr||[]).map(Number).filter(Number.isFinite));
const pct = (a,b)=> b ? ((a-b)/b)*100 : 0;

function rsiDipScore(value){
  value=n(value,50);
  if(value<=25) return 92;
  if(value<=30) return 86;
  if(value<=35) return 78;
  if(value<=40) return 66;
  if(value<=50) return 48;
  return Math.max(10, 55 - (value-50)*2);
}
function macdScore(hist, prevHist, line, signal){
  let s=45;
  if(hist>prevHist) s+=22;
  if(hist>0) s+=18;
  if(line>signal) s+=10;
  if(hist<0 && hist>prevHist) s+=10;
  return clamp(s);
}
function bollingerScore(close, lower, mid, upper){
  if(!close||!lower||!mid||!upper) return 45;
  const width = upper-lower;
  if(width<=0) return 45;
  const pos=(close-lower)/width;
  if(pos<=0.08) return 92;
  if(pos<=0.18) return 82;
  if(pos<=0.30) return 68;
  if(pos<=0.45) return 52;
  return 35;
}
function supportScore(close, support, atrValue){
  if(!close||!support) return 45;
  const dist=Math.abs(close-support)/close*100;
  const atrPct=close ? (atrValue/close)*100 : 3;
  if(dist <= Math.max(1.2, atrPct*0.65)) return 90;
  if(dist <= Math.max(2.4, atrPct*1.1)) return 76;
  if(dist <= Math.max(4.0, atrPct*1.8)) return 58;
  return 35;
}
function volumeScore(rows){
  const vols=rows.map(x=>n(x.volume,0));
  const recent=avg(vols.slice(-5));
  const base=avg(vols.slice(-30));
  if(!base) return 45;
  const ratio=recent/base;
  if(ratio>=1.8) return 88;
  if(ratio>=1.25) return 72;
  if(ratio>=0.85) return 55;
  return 38;
}
function obvScore(values){
  if(!values || values.length<30) return 45;
  const now=lastFinite(values);
  const p10=n(values[values.length-11],now);
  const p30=n(values[values.length-31],p10);
  let s=45;
  if(now>p10) s+=20;
  if(p10>p30) s+=20;
  if(now>p30) s+=10;
  return clamp(s);
}
function trendRiskScore(close,e20,e50,e200,adxValue){
  let risk=45;
  if(close<e20) risk+=10; else risk-=8;
  if(close<e50) risk+=12; else risk-=7;
  if(close<e200) risk+=14; else risk-=6;
  if(adxValue>28 && close<e50) risk+=10;
  return clamp(risk);
}

function calcBacktest(rows){
  if(!rows || rows.length<160) return {similar:0,success:0,successRate:50,avgReturn:0,avgWait:0};
  const events=[];
  for(let i=80;i<rows.length-22;i+=3){
    const slice=rows.slice(0,i+1);
    try{
      const d=analyzeProfessionalDip(slice,{backtest:false});
      if(d.dipScore>=62){
        const entry=n(rows[i].close);
        const future=rows.slice(i+1,i+22);
        const high=max(future.map(x=>x.high));
        const ret=pct(high,entry);
        events.push({ret,success:ret>=5});
      }
    }catch(e){}
  }
  const similar=events.length;
  const success=events.filter(x=>x.success).length;
  return {
    similar,
    success,
    successRate: similar ? round(success/similar*100,1) : 50,
    avgReturn: similar ? round(avg(events.map(x=>x.ret)),2) : 0,
    avgWait: similar ? 20 : 0
  };
}

export function analyzeProfessionalDip(rows, opts={}){
  rows=(rows||[]).filter(x=>Number.isFinite(Number(x.close)) && Number.isFinite(Number(x.high)) && Number.isFinite(Number(x.low)));
  if(rows.length<60) throw new Error('Dip analizi için yeterli OHLC veri yok.');
  const c=rows.map(x=>n(x.close)), h=rows.map(x=>n(x.high)), l=rows.map(x=>n(x.low)), v=rows.map(x=>n(x.volume,0));
  const close=lastFinite(c), prevClose=n(c[c.length-2],close);
  const e20=lastFinite(ema(c,20)), e50=lastFinite(ema(c,50)), e100=lastFinite(ema(c,100)), e200=lastFinite(ema(c,200));
  const rsi14=lastFinite(rsi(c,14),50);
  const m=macd(c); const hist=lastFinite(m.h), prevHist=n(m.h[m.h.length-2],hist), macdLine=lastFinite(m.m), macdSignal=lastFinite(m.s);
  const atr14=lastFinite(atr(h,l,c,14), close*0.03);
  const atrPct=close ? atr14/close*100 : 0;
  const ma20=sma(c,20), sd20=(()=>{
    if(c.length<20) return 0;
    const s=c.slice(-20); const mean=avg(s);
    return Math.sqrt(avg(s.map(x=>(x-mean)**2)));
  })();
  const bbMid=lastFinite(ma20,close), bbLower=bbMid-2*sd20, bbUpper=bbMid+2*sd20;
  const obvArr=obv(c,v);
  const adxObj=adx(h,l,c,14);
  const adxValue=lastFinite(adxObj?.a || adxObj?.adx || [], 18);
  const low20=min(l.slice(-20)), low60=min(l.slice(-60)), low120=min(l.slice(-120));
  const supportCandidates=[low20,low60,low120,e20,e50,e100,e200,bbLower].filter(x=>Number.isFinite(x) && x>0);
  const below=supportCandidates.filter(x=>x<=close*1.012).sort((a,b)=>Math.abs(close-a)-Math.abs(close-b));
  const nearestSupport=below[0] || low20 || close-atr14;
  const zoneLow=round(Math.max(0.01, nearestSupport - atr14*0.55),2);
  const zoneHigh=round(Math.min(close, nearestSupport + atr14*0.45),2);
  const strongest=round((zoneLow*0.35 + nearestSupport*0.45 + zoneHigh*0.20),2);
  const stop=round(Math.max(0.01, zoneLow - atr14*0.85),2);
  const firstTarget=round(close + atr14*1.8,2);
  const mainTarget=round(close + atr14*3.2,2);
  const rr=round((firstTarget-close)/Math.max(0.01, close-stop),2);

  const scores={
    support: supportScore(close,nearestSupport,atr14),
    rsi: rsiDipScore(rsi14),
    macd: macdScore(hist,prevHist,macdLine,macdSignal),
    ema: clamp(100 - Math.min(100, Math.abs(close-e20)/close*900) + (close>e20?10:0)),
    bollinger: bollingerScore(close,bbLower,bbMid,bbUpper),
    volume: volumeScore(rows),
    money: obvScore(obvArr),
    adx: clamp(70 - Math.min(40,adxValue) + (close>e20?10:0)),
    atr: clamp(100 - Math.min(70,atrPct*12)),
    backtest: 50
  };
  let bt={similar:0,success:0,successRate:50,avgReturn:0,avgWait:0};
  if(opts.backtest!==false){
    bt=calcBacktest(rows);
    scores.backtest=bt.successRate || 50;
  }
  const risk=trendRiskScore(close,e20,e50,e200,adxValue);
  const dipScore=clamp(
    scores.support*.15 + scores.rsi*.13 + scores.macd*.11 + scores.ema*.10 + scores.bollinger*.10 +
    scores.volume*.10 + scores.money*.12 + scores.adx*.07 + scores.atr*.06 + scores.backtest*.06
  );
  const fallingKnife=clamp(risk*.65 + (hist<prevHist?12:0) + (rsi14<25?12:0) - (scores.money>70?10:0));
  const maturity=clamp(dipScore*.70 + (100-fallingKnife)*.15 + scores.backtest*.15);
  const successProbability=clamp(dipScore*.55 + scores.backtest*.25 + (100-risk)*.20);
  const catchBottom=clamp(dipScore*.65 + maturity*.25 + (100-fallingKnife)*.10);
  const duration = maturity>=78 ? '3-8 işlem günü' : maturity>=62 ? '2-6 hafta' : '1-3 ay / teyit bekle';
  const decision = dipScore>=82 && fallingKnife<55 ? 'KADEMELİ AL' : dipScore>=68 ? 'İLK ALIM BÖLGESİ İZLE' : dipScore>=52 ? 'TEYİT BEKLE' : 'ERKEN';
  const aiText = `Son fiyat ${round(close,2)} TL. Dip bölgesi ${zoneLow}-${zoneHigh} TL, en güçlü dip ${strongest} TL. RSI(14) ${round(rsi14,1)}, ATR ${round(atrPct,2)}%, MACD histogram ${round(hist,4)}. Dip skoru ${Math.round(dipScore)}/100, Falling Knife riski ${Math.round(fallingKnife)}/100.`;
  return {
    currentPrice: round(close,2),
    change: round(pct(close,prevClose),2),
    dipScore: round(dipScore,1),
    successProbability: round(successProbability,1),
    catchBottom: round(catchBottom,1),
    fallingKnife: round(fallingKnife,1),
    maturity: round(maturity,1),
    duration,
    decision,
    dipRegion:{low:zoneLow, high:zoneHigh, strongest},
    levels:{firstBuy:zoneHigh, strongBuy:strongest, lastDefense:zoneLow, stop, firstTarget, mainTarget, riskReward:rr},
    indicators:{rsi14:round(rsi14,2), macdHist:round(hist,4), ema20:round(e20,2), ema50:round(e50,2), ema100:round(e100,2), ema200:round(e200,2), bollingerLower:round(bbLower,2), bollingerMid:round(bbMid,2), bollingerUpper:round(bbUpper,2), atr:round(atr14,2), atrPct:round(atrPct,2), adx:round(adxValue,2), support:round(nearestSupport,2)},
    scores: Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,round(v,1)])),
    backtest:bt,
    aiText
  };
}
