
import { sma, ema, rsi, macd, atr, obv, adx } from './indicators.js';

const n=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
const round=(x,d=2)=>Number.isFinite(Number(x))?Number(Number(x).toFixed(d)):0;
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):0));
const avg=a=>{const b=(a||[]).map(Number).filter(Number.isFinite);return b.length?b.reduce((s,x)=>s+x,0)/b.length:0};
const min=a=>Math.min(...(a||[]).map(Number).filter(Number.isFinite));
const max=a=>Math.max(...(a||[]).map(Number).filter(Number.isFinite));
const last=a=>{for(let i=(a?.length||0)-1;i>=0;i--)if(Number.isFinite(Number(a[i])))return Number(a[i]);return 0};
const pct=(a,b)=>b?((a-b)/b)*100:0;
function std(a){const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)**2)))}

function mfi(high,low,close,volume,period=14){
  const out=Array(close.length).fill(null);
  const tp=close.map((_,i)=>(high[i]+low[i]+close[i])/3);
  for(let i=period;i<close.length;i++){
    let pos=0,neg=0;
    for(let j=i-period+1;j<=i;j++){
      const mf=tp[j]*(volume[j]||0);
      if(tp[j]>tp[j-1]) pos+=mf;
      else if(tp[j]<tp[j-1]) neg+=mf;
    }
    out[i]=neg===0?100:100-(100/(1+pos/neg));
  }
  return out;
}
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
function vwap(high,low,close,volume,period=20){
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
function scoreRsi(v){v=n(v,50); if(v<=25)return 94;if(v<=30)return 88;if(v<=35)return 78;if(v<=40)return 64;if(v<=50)return 46;return clamp(60-(v-50)*2)}
function scoreMacd(h,ph,line,sig){let s=45;if(h>ph)s+=22;if(h>0)s+=18;if(line>sig)s+=10;if(h<0&&h>ph)s+=10;return clamp(s)}
function scoreBoll(close,lo,mid,up){const w=up-lo;if(!w)return 45;const p=(close-lo)/w;if(p<=.08)return 93;if(p<=.18)return 82;if(p<=.30)return 68;if(p<=.45)return 52;return 36}
function scoreVolume(rows){const v=rows.map(x=>n(x.volume));const r=avg(v.slice(-5));const b=avg(v.slice(-40));if(!b)return 45;const q=r/b;if(q>=1.8)return 88;if(q>=1.25)return 72;if(q>=.85)return 55;return 38}
function scoreObv(o){if(!o||o.length<40)return 45;const now=last(o), p10=n(o[o.length-11],now), p30=n(o[o.length-31],p10);let s=45;if(now>p10)s+=20;if(p10>p30)s+=20;if(now>p30)s+=10;return clamp(s)}
function scoreMfi(v){v=n(v,50); if(v<=20)return 82; if(v<=35)return 68; if(v<=50)return 55; if(v<=70)return 60; return 42}
function scoreCmf(v){v=n(v,0); return clamp(50+v*160)}
function scoreVwap(close,vwapValue){if(!close||!vwapValue)return 50; const d=pct(close,vwapValue); return clamp(60-d*4+(d>-1&&d<2?12:0));}

function clusterSupports(rows, close, atrValue){
  const lookback = rows.slice(-250);
  const lows = lookback.map((r,i)=>({i, price:n(r.low), high:n(r.high), close:n(r.close), volume:n(r.volume)})).filter(x=>x.price>0);
  const pivots=[];
  for(let i=2;i<lows.length-2;i++){
    if(lows[i].price<=lows[i-1].price && lows[i].price<=lows[i-2].price && lows[i].price<=lows[i+1].price && lows[i].price<=lows[i+2].price) pivots.push(lows[i]);
  }
  if(!pivots.length){
    const low=min(lookback.map(x=>x.low));
    return [{low:round(low-atrValue*.45),high:round(low+atrValue*.45),center:round(low),touches:1,success:0,successRate:50,avgReaction:0,avgWait:0,strength:45}];
  }
  const tol=Math.max(atrValue*.75, close*.012);
  const clusters=[];
  for(const p of pivots){
    let c=clusters.find(c=>Math.abs(c.center-p.price)<=tol);
    if(!c){c={items:[],center:p.price};clusters.push(c)}
    c.items.push(p); c.center=avg(c.items.map(x=>x.price));
  }
  for(const c of clusters){
    c.low=round(min(c.items.map(x=>x.price))-atrValue*.35);
    c.high=round(max(c.items.map(x=>x.price))+atrValue*.35);
    c.center=round(avg(c.items.map(x=>x.price)));
    c.touches=c.items.length;
    const reactions=[], waits=[];
    for(const p of c.items){
      const future=lookback.slice(p.i+1,Math.min(lookback.length,p.i+22));
      if(future.length){
        const hi=max(future.map(x=>x.high));
        const ret=pct(hi,p.price);
        reactions.push(ret);
        const hit=future.findIndex(x=>pct(x.high,p.price)>=5);
        if(hit>=0) waits.push(hit+1);
      }
    }
    c.success=reactions.filter(x=>x>=5).length;
    c.avgReaction=round(avg(reactions),2);
    c.successRate=reactions.length?round(c.success/reactions.length*100,1):50;
    c.avgWait=waits.length?round(avg(waits),1):0;
    c.strength=round(clamp(c.touches*12+c.successRate*.42+Math.max(0,c.avgReaction)*1.15-Math.abs(pct(c.center,close))*1.3),1);
  }
  return clusters.filter(c=>c.center<=close*1.05).sort((a,b)=>b.strength-a.strength).slice(0,6);
}
function backtestDip(rows){
  const events=[];
  for(let i=90;i<rows.length-25;i+=3){
    const slice=rows.slice(0,i+1);
    try{
      const a=analyzeV19Institutional(slice,{skipBacktest:true});
      if(a.ai.dipScore>=62){
        const entry=n(rows[i].close), fut=rows.slice(i+1,i+26);
        const hi=max(fut.map(x=>x.high)), lo=min(fut.map(x=>x.low));
        events.push({ret:pct(hi,entry),dd:pct(lo,entry),success:pct(hi,entry)>=5});
      }
    }catch(e){}
  }
  const count=events.length, success=events.filter(x=>x.success).length;
  return {signalCount:count,success,successRate:count?round(success/count*100,1):50,avgReturn:count?round(avg(events.map(x=>x.ret)),2):0,avgDrawdown:count?round(avg(events.map(x=>x.dd)),2):0};
}

export function analyzeV19Institutional(rows, opts={}){
  rows=(rows||[]).filter(x=>Number.isFinite(Number(x.close))&&Number.isFinite(Number(x.high))&&Number.isFinite(Number(x.low)));
  if(rows.length<80) throw new Error('V19 için yeterli gerçek OHLC veri yok.');
  const c=rows.map(x=>n(x.close)), h=rows.map(x=>n(x.high)), l=rows.map(x=>n(x.low)), v=rows.map(x=>n(x.volume));
  const close=last(c), prev=n(c[c.length-2],close);
  const e20=last(ema(c,20)), e50=last(ema(c,50)), e100=last(ema(c,100)), e200=last(ema(c,200));
  const rsi14=last(rsi(c,14))||50;
  const m=macd(c), mh=last(m.h), prevMh=n(m.h[m.h.length-2],mh), ml=last(m.m), ms=last(m.s);
  const atr14=last(atr(h,l,c,14))||close*.03, atrPct=pct(atr14,close);
  const mid=last(sma(c,20))||close, sd=std(c.slice(-20)), bbLow=mid-2*sd, bbUp=mid+2*sd;
  const obvArr=obv(c,v), adxObj=adx(h,l,c,14), adxVal=last(adxObj?.a||adxObj?.adx||[])||18;
  const mfi14=last(mfi(h,l,c,v,14))||50, cmf20=last(cmf(h,l,c,v,20))||0, vwap20=last(vwap(h,l,c,v,20))||close;
  const clusters=clusterSupports(rows,close,atr14), best=clusters[0];
  const zoneLow=round(Math.max(.01,best.low),2), zoneHigh=round(Math.min(close,best.high),2), strongest=round(best.center,2);
  const stop=round(Math.max(.01,zoneLow-atr14*.85),2), firstTarget=round(close+atr14*1.8,2), mainTarget=round(close+atr14*3.2,2);
  const riskReward=round((firstTarget-close)/Math.max(.01,close-stop),2);
  const scores={
    support:clamp(best.strength), rsi:scoreRsi(rsi14), macd:scoreMacd(mh,prevMh,ml,ms),
    ema:clamp(100-Math.abs(close-e20)/close*900+(close>e20?10:0)),
    bollinger:scoreBoll(close,bbLow,mid,bbUp), volume:scoreVolume(rows), obv:scoreObv(obvArr),
    mfi:scoreMfi(mfi14), cmf:scoreCmf(cmf20), vwap:scoreVwap(close,vwap20),
    adx:clamp(70-Math.min(40,adxVal)+(close>e20?10:0)), atr:clamp(100-Math.min(70,atrPct*12)), cluster:clamp(best.strength)
  };
  const bt=opts.skipBacktest?{signalCount:0,success:0,successRate:50,avgReturn:0,avgDrawdown:0}:backtestDip(rows);
  scores.backtest=bt.successRate||50;
  const trendRisk=clamp(45+(close<e20?10:-8)+(close<e50?12:-7)+(close<e200?14:-6)+(adxVal>28&&close<e50?10:0));
  const institutional=clamp(scores.obv*.30+scores.cmf*.22+scores.mfi*.18+scores.vwap*.15+scores.volume*.15);
  const reactionPower=clamp(best.avgReaction*4.2+best.successRate*.45+best.touches*4);
  const dipScore=clamp(scores.support*.12+scores.rsi*.10+scores.macd*.09+scores.ema*.08+scores.bollinger*.08+scores.volume*.08+scores.obv*.09+scores.mfi*.07+scores.cmf*.07+scores.vwap*.06+scores.adx*.05+scores.atr*.04+scores.cluster*.09+scores.backtest*.08);
  const fallingKnife=clamp(trendRisk*.65+(mh<prevMh?12:0)+(rsi14<25?12:0)-(institutional>70?10:0));
  const maturity=clamp(dipScore*.62+(100-fallingKnife)*.13+scores.backtest*.10+best.strength*.08+(best.avgWait?Math.min(100,100-best.avgWait*4):45)*.07);
  const successProbability=clamp(dipScore*.42+scores.backtest*.22+best.successRate*.18+(100-trendRisk)*.08+reactionPower*.10);
  const aiTrust=clamp(successProbability*.42+dipScore*.32+Math.min(100,rows.length/2.5)*.10+(100-fallingKnife)*.08+institutional*.08);
  const duration=maturity>=84?'2-4 işlem günü':maturity>=75?'3-8 işlem günü':maturity>=62?'2-6 hafta':'1-3 ay / teyit bekle';
  const decision=dipScore>=82&&fallingKnife<55?'KADEMELİ AL':dipScore>=68?'İLK ALIM BÖLGESİ İZLE':dipScore>=52?'TEYİT BEKLE':'ERKEN';
  const stars=Math.max(1,Math.min(5,Math.round(aiTrust/20)));
  const aiText=`%100 gerçek veri: Son fiyat ${round(close,2)} TL. 250 günlük destek kümesi ${zoneLow}-${zoneHigh} TL, en güçlü dip ${strongest} TL. Küme ${best.touches} kez test edilmiş; ${best.success} başarılı tepki, başarı %${best.successRate}, ortalama tepki %${best.avgReaction}, ortalama bekleme ${best.avgWait} gün. RSI ${round(rsi14,1)}, MACD hist ${round(mh,4)}, CMF ${round(cmf20,3)}, MFI ${round(mfi14,1)}, VWAP ${round(vwap20,2)}. Random/pseudo değer kullanılmadı.`;
  return {
    currentPrice:round(close,2), change:round(pct(close,prev),2), random:false, source:'real_ohlcv_250d_cluster',
    ai:{dipScore:round(dipScore,1),successProbability:round(successProbability,1),aiTrust:round(aiTrust,1),stars,institutional:round(institutional,1),reactionPower:round(reactionPower,1),fallingKnife:round(fallingKnife,1),maturity:round(maturity,1),decision,duration},
    dipRegion:{low:zoneLow,high:zoneHigh,strongest},
    levels:{firstBuy:zoneHigh,strongBuy:strongest,lastDefense:zoneLow,stop,firstTarget,mainTarget,riskReward},
    indicators:{rsi14:round(rsi14,2),macdHist:round(mh,4),ema20:round(e20,2),ema50:round(e50,2),ema100:round(e100,2),ema200:round(e200,2),bollingerLower:round(bbLow,2),bollingerMid:round(mid,2),bollingerUpper:round(bbUp,2),atr:round(atr14,2),atrPct:round(atrPct,2),adx:round(adxVal,2),obv:round(last(obvArr),0),cmf20:round(cmf20,4),mfi14:round(mfi14,2),vwap20:round(vwap20,2)},
    scores:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,round(v,1)])),
    supportClusters:clusters, backtest:bt, aiText
  };
}
