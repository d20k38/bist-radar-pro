import { ema, atr, obv, rsi } from './indicators.js';

const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const round=(x,d=2)=>Number.isFinite(Number(x))?Number(Number(x).toFixed(d)):0;
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):0));
const avg=a=>{const b=(a||[]).map(Number).filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:0};
const last=a=>{for(let i=(a?.length||0)-1;i>=0;i--)if(Number.isFinite(Number(a[i])))return Number(a[i]);return 0};
const pct=(a,b)=>b?((a-b)/b)*100:0;
function cmf(high,low,close,volume,period=20){
  const out=Array(close.length).fill(null);
  for(let i=period-1;i<close.length;i++){
    let mfv=0,vol=0;
    for(let j=i-period+1;j<=i;j++){
      const range=(high[j]-low[j])||1;
      const mfm=((close[j]-low[j])-(high[j]-close[j]))/range;
      mfv+=mfm*(volume[j]||0); vol+=(volume[j]||0);
    }
    out[i]=vol?mfv/vol:0;
  }
  return out;
}
function mfi(high,low,close,volume,period=14){
  const out=Array(close.length).fill(null);
  const tp=close.map((_,i)=>(high[i]+low[i]+close[i])/3);
  for(let i=period;i<close.length;i++){
    let pos=0,neg=0;
    for(let j=i-period+1;j<=i;j++){
      const mf=tp[j]*(volume[j]||0);
      if(tp[j]>tp[j-1]) pos+=mf; else if(tp[j]<tp[j-1]) neg+=mf;
    }
    out[i]=neg===0?100:100-(100/(1+pos/neg));
  }
  return out;
}
function rollingVwap(high,low,close,volume,period=20){
  const out=Array(close.length).fill(null);
  for(let i=period-1;i<close.length;i++){
    let pv=0,vol=0;
    for(let j=i-period+1;j<=i;j++){
      const tp=(high[j]+low[j]+close[j])/3;
      pv+=tp*(volume[j]||0); vol+=(volume[j]||0);
    }
    out[i]=vol?pv/vol:null;
  }
  return out;
}
function slopeScore(arr,lookback=5){
  if(!arr || arr.length<lookback+2) return 50;
  const now=last(arr), prev=n(arr[arr.length-1-lookback],now);
  return clamp(50+pct(now,Math.abs(prev)||1)*4);
}
function rvolScore(rvol){
  if(rvol>=4) return 100;
  if(rvol>=3) return 92;
  if(rvol>=2) return 78;
  if(rvol>=1.5) return 64;
  if(rvol>=1) return 48;
  if(rvol>=0.8) return 35;
  return 20;
}
function rsScore(stock5,bench5,stock20,bench20){
  const rel5=stock5-bench5, rel20=stock20-bench20;
  return clamp(50+rel5*4+rel20*1.6);
}
export function analyzeDayTrading(rows, benchmarkRows=[]){
  rows=(rows||[]).filter(x=>Number.isFinite(Number(x.close))&&Number.isFinite(Number(x.high))&&Number.isFinite(Number(x.low)));
  if(rows.length<60) throw new Error('Day Trading AI için yeterli gerçek OHLC/hacim verisi yok.');
  const c=rows.map(x=>n(x.close)), h=rows.map(x=>n(x.high)), l=rows.map(x=>n(x.low)), v=rows.map(x=>n(x.volume));
  const close=last(c), prev=n(c[c.length-2],close), volume=last(v);
  const avgVol20=avg(v.slice(-21,-1)), avgVol5=avg(v.slice(-6,-1));
  const rvol20=avgVol20?volume/avgVol20:0, rvol5=avgVol5?volume/avgVol5:0;
  const vwap20=last(rollingVwap(h,l,c,v,20))||close;
  const cmf20=last(cmf(h,l,c,v,20))||0, mfi14=last(mfi(h,l,c,v,14))||50;
  const obvArr=obv(c,v), obvScore=slopeScore(obvArr,5);
  const atr14=last(atr(h,l,c,14))||close*.03, atrPct=pct(atr14,close);
  const rsi14=last(rsi(c,14))||50;
  const e8=last(ema(c,8)), e21=last(ema(c,21));
  const stock5=pct(close,n(c[c.length-6],close)), stock20=pct(close,n(c[c.length-21],close));
  let bench5=0, bench20=0, benchmarkStatus='BIST100 verisi yok; RS hisse içi momentumla desteklendi';
  if((benchmarkRows||[]).length>=25){
    const bc=benchmarkRows.map(x=>n(x.close)).filter(Number.isFinite);
    bench5=pct(last(bc),n(bc[bc.length-6],last(bc))); bench20=pct(last(bc),n(bc[bc.length-21],last(bc)));
    benchmarkStatus='BIST100/XU100 göreceli performansı kullanıldı';
  }
  const scores={
    rvol:rvolScore(rvol20),
    rvol5:rvolScore(rvol5),
    vwap:clamp(52+pct(close,vwap20)*7+(close>vwap20?18:-12)),
    relativeStrength:rsScore(stock5,bench5,stock20,bench20),
    obv:obvScore,
    cmf:clamp(50+cmf20*180),
    mfi:clamp(mfi14>80?55:mfi14<35?42:50+(mfi14-50)*1.4),
    atr:clamp(45+Math.min(45,atrPct*8)),
    momentum:clamp(50+stock5*5+(e8>e21?14:-8)+(close>prev?8:-5)),
    liquidity:clamp(30+Math.log10(Math.max(1,volume))*8)
  };
  const score=clamp(scores.rvol*.25+scores.rvol5*.08+scores.vwap*.12+scores.relativeStrength*.13+scores.obv*.10+scores.cmf*.09+scores.mfi*.06+scores.atr*.07+scores.momentum*.08+scores.liquidity*.02);
  const stop=round(close-atr14*0.85,2), target1=round(close+atr14*1.25,2), target2=round(close+atr14*2.05,2);
  const rr=round((target1-close)/Math.max(0.01,close-stop),2);
  const action=score>=85?'YARIN İLK EKRAN':score>=72?'GÜÇLÜ İZLE':score>=60?'İZLE':score>=48?'TEYİT BEKLE':'ZAYIF';
  const openBias=clamp(score*.55+scores.rvol*.18+scores.relativeStrength*.12+scores.vwap*.10+(close>prev?5:-5));
  const reasons=[];
  if(rvol20>=2) reasons.push(`RVOL20 ${round(rvol20,2)} ile hacim ortalamanın belirgin üstünde`);
  if(close>vwap20) reasons.push('Kapanış VWAP üzerinde');
  if(cmf20>0) reasons.push(`CMF pozitif (${round(cmf20,3)})`);
  if(obvScore>=60) reasons.push('OBV son günlerde yükseliş eğiliminde');
  if(scores.relativeStrength>=60) reasons.push('BIST100/eş benchmarka göre göreceli güç pozitif');
  if(atrPct>=2) reasons.push(`ATR ${round(atrPct,2)}% ile gün içi hareket potansiyeli var`);
  if(!reasons.length) reasons.push('Güçlü day trading teyidi sınırlı; açılış hacmi beklenmeli');
  return {score:round(score,1),action,openBias:round(openBias,1),currentPrice:round(close,2),change:round(pct(close,prev),2),rvol20:round(rvol20,2),rvol5:round(rvol5,2),volume,avgVol20:round(avgVol20,0),vwap20:round(vwap20,2),cmf20:round(cmf20,4),mfi14:round(mfi14,2),rsi14:round(rsi14,2),obvScore:round(obvScore,1),atr:round(atr14,2),atrPct:round(atrPct,2),relative:{stock5:round(stock5,2),bench5:round(bench5,2),stock20:round(stock20,2),bench20:round(bench20,2),status:benchmarkStatus},scores:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,round(v,1)])),plan:{entryLow:round(Math.max(stop,close-atr14*.25),2),entryHigh:round(close+atr14*.18,2),stop,target1,target2,riskReward:rr},reasons,source:'real_ohlcv_volume_no_random'};
}
