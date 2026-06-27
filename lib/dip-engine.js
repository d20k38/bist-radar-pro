
import {sma,ema,rsi,macd,atr,obv,roc,adx,supertrend,avg} from './indicators.js';
const clamp=x=>Math.max(0,Math.min(100,Math.round(Number(x)||0)));
const pct=(a,b)=>b?((a-b)/b)*100:0;
const min=a=>Math.min(...a.filter(Number.isFinite));
const max=a=>Math.max(...a.filter(Number.isFinite));
const last=a=>a?.[a.length-1];
const round=(x,d=2)=>Number(Number(x||0).toFixed(d));

function bollinger(c,n=20,m=2){
  const mid=sma(c,n); return c.map((_,i)=>{ if(i<n-1)return {mid:null,upper:null,lower:null,width:null}; const sl=c.slice(i-n+1,i+1); const av=mid[i]; const sd=Math.sqrt(avg(sl.map(x=>(x-av)**2))||0); return {mid:av,upper:av+m*sd,lower:av-m*sd,width:av?((2*m*sd)/av)*100:0}; });
}
function vwap(rows,n=20){return rows.map((_,i)=>{const s=rows.slice(Math.max(0,i-n+1),i+1);const pv=s.reduce((a,r)=>a+((r.high+r.low+r.close)/3)*(r.volume||0),0);const vv=s.reduce((a,r)=>a+(r.volume||0),0);return vv?pv/vv:null;});}
function mfi(rows,n=14){const tp=rows.map(r=>(r.high+r.low+r.close)/3),mf=rows.map((r,i)=>tp[i]*(r.volume||0));return rows.map((_,i)=>{if(i<n)return null;let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){if(tp[j]>tp[j-1])pos+=mf[j];else if(tp[j]<tp[j-1])neg+=mf[j];}return neg?100-(100/(1+pos/neg)):100;});}

export function analyzeDip(rows){
  if(!Array.isArray(rows)||rows.length<70) throw new Error('Dip analizi için yeterli veri yok');
  const c=rows.map(x=>x.close),h=rows.map(x=>x.high),l=rows.map(x=>x.low),v=rows.map(x=>x.volume||0),n=c.length-1;
  const close=c[n], prev=c[n-1]||close;
  const e20=ema(c,20), e50=ema(c,50), e200=ema(c,200), rs=rsi(c), mc=macd(c), at=atr(h,l,c), ob=obv(c,v), di=adx(h,l,c), sup=supertrend(h,l,c), bb=bollinger(c), vw=vwap(rows), mf=mfi(rows), ro=roc(c);
  const volAvg=avg(v.slice(Math.max(0,n-20),n+1))||1, volumeRatio=v[n]/volAvg;
  const low60=min(l.slice(Math.max(0,n-60),n+1)), high60=max(h.slice(Math.max(0,n-60),n+1));
  const low120=min(l.slice(Math.max(0,n-120),n+1));
  const recentRange=Math.max(high60-low60,0.0001);
  const bounce=pct(close,low60), nearLow=clamp(100-Math.abs(bounce)*8);
  const closeStrength=(close-l[n])/Math.max(0.0001,h[n]-l[n]);
  const rsiNow=rs[n]??50, rsiPrev=rs[n-1]??rsiNow, hist=mc.h[n]??0, histPrev=mc.h[n-1]??hist;
  const obSlope=(ob[n]-(ob[Math.max(0,n-8)]||ob[n]));
  const lowerTouch=bb[n]?.lower ? l[n] <= bb[n].lower*1.025 : false;
  const atrPct=((at[n]||0)/close)*100;
  const pdi=di.pdi[n]||0, mdi=di.mdi[n]||0, adxNow=di.adx[n]||0;

  const trendTired=clamp((rsiNow<35?9:0)+(rsiNow>rsiPrev?5:0)+(hist>histPrev?5:0)+((ro[n]||0)>ro[n-1]?3:0));
  const volumeScore=clamp((volumeRatio-1)*28 + closeStrength*18);
  const moneyScore=clamp((obSlope>0?9:0)+((mf[n]||50)>45?5:0)+(vw[n]&&close>vw[n]?5:0)+(volumeRatio>1.3?4:0));
  const patternScore=clamp((nearLow>65?5:0)+(lowerTouch?5:0)+(bounce>2?4:0)+(Math.abs(pct(low60,low120))<4?3:0));
  const trendChange=clamp((close>e20[n]?5:0)+(adxNow>20&&pdi>mdi?5:0)+(sup.dir[n]===1?5:0)+(hist>0?3:0));
  const newsKap=7;
  const dipProbability=clamp(trendTired+volumeScore+moneyScore+patternScore+trendChange+newsKap);
  const fallingKnifeRisk=clamp((close<e20[n]?18:0)+(close<e50[n]?14:0)+(rsiNow<24?16:0)+(hist<histPrev?12:0)+(volumeRatio<.85?8:0)+(mdi>pdi?14:0)+(close<low60*1.01?12:0));
  const earlyEntryRisk=clamp(100-dipProbability+(close<e20[n]?12:0)+(fallingKnifeRisk>60?10:0));
  const reactionPotential=clamp(atrPct*4 + (bb[n]?.mid?pct(bb[n].mid,close):6) + (high60-close)/close*25 + (bounce<3?8:0));
  const confidence=clamp(dipProbability*.62+(100-fallingKnifeRisk)*.24+trendChange*.8+moneyScore*.35);
  const reasons=[];
  if(rsiNow<35&&rsiNow>rsiPrev)reasons.push('RSI aşırı satım bölgesinden yukarı dönüyor.');
  if(hist>histPrev)reasons.push('MACD histogram toparlanıyor.');
  if(volumeRatio>1.4)reasons.push('Hacim ortalamanın belirgin üzerinde.');
  if(obSlope>0)reasons.push('OBV para girişini destekliyor.');
  if(lowerTouch)reasons.push('Fiyat Bollinger alt bandında tepki arıyor.');
  if(adxNow>20&&pdi>mdi)reasons.push('ADX/+DI tarafı dönüşü destekliyor.');
  if(close>e20[n])reasons.push('Fiyat EMA20 üzerine çıktı.');
  const warnings=[];
  if(close<e50[n])warnings.push('Fiyat EMA50 altında; ana trend teyidi zayıf olabilir.');
  if(fallingKnifeRisk>60)warnings.push('Falling Knife riski yüksek; güçlü teyit beklemek daha güvenli olabilir.');
  if(volumeRatio<1)warnings.push('Hacim teyidi zayıf.');
  const label=confidence>=80?'Güçlü Dip Adayı':confidence>=65?'Dip Adayı':confidence>=50?'İzlenebilir Dip':'Teyit Bekle';
  return {date:rows[n].date,close,change:pct(close,prev),dipProbability,earlyEntryRisk,fallingKnifeRisk,reactionPotential:round(reactionPotential,1),confidence,label,estimatedWaitDays:confidence>=75?'3-8 gün':confidence>=55?'5-15 gün':'Teyit beklenmeli',target1:close*(1+reactionPotential/100*.55),target2:close*(1+reactionPotential/100),stop:Math.min(low60,close*(1-Math.max(3,atrPct*1.4)/100)),layers:{trendTired,volume:volumeScore,money:moneyScore,pattern:patternScore,trendChange,newsKap},indicators:{rsi:rsiNow,macdHist:hist,ema20:e20[n],ema50:e50[n],ema200:e200[n],adx:adxNow,pdi,mdi,mfi:mf[n],volRatio,vwap:vw[n],atrPct},reasons,warnings,ohlcv:rows};
}
