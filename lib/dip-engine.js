
import {ema,rsi,macd,atr,obv,adx,sma,avg} from './indicators.js';

const clamp=x=>Math.max(0,Math.min(100,Math.round(Number(x)||0)));
const last=a=>a?.length?a[a.length-1]:null;
const pct=(a,b)=>b?((a-b)/b)*100:0;
const min=a=>Math.min(...a.filter(Number.isFinite));
const max=a=>Math.max(...a.filter(Number.isFinite));
const round=(x,d=2)=>Number(Number(x||0).toFixed(d));

function mfiLite(h,l,c,v,n=14){
  const tp=c.map((_,i)=>(h[i]+l[i]+c[i])/3), mf=tp.map((x,i)=>x*(v[i]||0)), out=Array(c.length).fill(null);
  for(let i=n;i<c.length;i++){
    let pos=0,neg=0;
    for(let j=i-n+1;j<=i;j++){ if(tp[j]>tp[j-1]) pos+=mf[j]; else if(tp[j]<tp[j-1]) neg+=mf[j]; }
    out[i]=neg===0?100:100-100/(1+pos/neg);
  }
  return out;
}
function boll(c,n=20){
  const mid=sma(c,n);
  return c.map((_,i)=>{
    if(i<n-1)return{mid:null,upper:null,lower:null,width:null};
    const s=c.slice(i-n+1,i+1), m=mid[i], sd=Math.sqrt(avg(s.map(x=>(x-m)**2)));
    return {mid:m,upper:m+2*sd,lower:m-2*sd,width:m?((4*sd)/m)*100:0};
  });
}
function vwapLite(rows,n=20){
  return rows.map((_,i)=>{
    const s=rows.slice(Math.max(0,i-n+1),i+1);
    const pv=s.reduce((a,r)=>a+((r.high+r.low+r.close)/3)*(r.volume||0),0);
    const vv=s.reduce((a,r)=>a+(r.volume||0),0);
    return vv?pv/vv:null;
  });
}

export function analyzeDip(rows){
  rows=(rows||[]).filter(r=>Number.isFinite(Number(r.close))).map(r=>({date:r.date,open:+r.open,high:+r.high,low:+r.low,close:+r.close,volume:+(r.volume||0)}));
  if(rows.length<60) throw new Error('Dip analizi için en az 60 günlük veri gerekir.');
  const c=rows.map(r=>r.close), h=rows.map(r=>r.high), l=rows.map(r=>r.low), v=rows.map(r=>r.volume||0), n=c.length-1;
  const close=c[n], prev=c[n-1];
  const r= rsi(c), rnow=last(r)??50, rprev=r[r.length-2]??rnow;
  const mc=macd(c), hist=last(mc.h)??0, histPrev=mc.h[mc.h.length-2]??hist;
  const e20=last(ema(c,20)), e50=last(ema(c,50)), e200=last(ema(c,200));
  const bb=last(boll(c,20));
  const at=last(atr(h,l,c,14))||0;
  const ob=obv(c,v), obSlope=last(ob)-(ob[ob.length-8]??last(ob));
  const mf=last(mfiLite(h,l,c,v))??50;
  const ad=adx(h,l,c), adxNow=last(ad.adx)??15, pdi=last(ad.pdi)??0, mdi=last(ad.mdi)??0;
  const vw=last(vwapLite(rows));
  const low60=min(l.slice(-60)), high60=max(h.slice(-60));
  const volAvg=avg(v.slice(-20))||1, volRatio=v[n]/volAvg;
  const lowerBandTouch=bb?.lower ? l[n] <= bb.lower*1.02 : false;
  const closeStrength=(close-l[n])/Math.max(.01,h[n]-l[n]);
  const bounceFromLow=pct(close,low60);
  const nearLow=clamp(100-Math.abs(bounceFromLow)*8);

  const trendTired=clamp((rnow<35?10:0)+(rnow>rprev?6:0)+(hist>histPrev?5:0));
  const volume=clamp((volRatio-1)*28+closeStrength*25);
  const money=clamp((obSlope>0?10:0)+(mf>45?5:0)+(vw&&close>vw?5:0));
  const pattern=clamp((nearLow>65?6:0)+(lowerBandTouch?5:0)+(bounceFromLow>2?4:0));
  const trendChange=clamp((close>e20?5:0)+(adxNow>20&&pdi>mdi?5:0)+(hist>0?5:0));
  const newsKap=7;
  const dipProbability=clamp(trendTired+volume+money+pattern+trendChange+newsKap);
  const fallingKnifeRisk=clamp((close<e20?20:0)+(close<e50?14:0)+(rnow<25?20:0)+(hist<histPrev?15:0)+(volRatio<.8?10:0)+(mdi>pdi?15:0));
  const earlyEntryRisk=clamp(100-dipProbability+(close<e20?12:0));
  const reactionPotential=clamp((at/close)*100*4+(bb?.mid?pct(bb.mid,close):5)+(bounceFromLow<3?10:0));
  const confidence=clamp(dipProbability*.65+(100-fallingKnifeRisk)*.25+trendChange*.7);

  const reasons=[];
  if(rnow<35&&rnow>rprev) reasons.push('RSI aşırı satım bölgesinden yukarı dönüyor.');
  if(hist>histPrev) reasons.push('MACD histogram toparlanıyor.');
  if(volRatio>1.4) reasons.push('Hacim ortalamanın üzerinde.');
  if(obSlope>0) reasons.push('OBV para girişini destekliyor.');
  if(lowerBandTouch) reasons.push('Bollinger alt bandında tepki ihtimali var.');
  if(adxNow>20&&pdi>mdi) reasons.push('ADX/+DI toparlanmayı destekliyor.');
  if(close>e20) reasons.push('Fiyat EMA20 üzerine çıkmış.');

  const warnings=[];
  if(close<e50) warnings.push('Fiyat EMA50 altında; orta trend teyidi zayıf.');
  if(fallingKnifeRisk>60) warnings.push('Falling knife riski yüksek; teyit beklemek daha güvenli.');
  if(volRatio<1) warnings.push('Hacim teyidi zayıf.');

  return {
    date:rows[n].date,close:round(close),dipProbability,earlyEntryRisk,fallingKnifeRisk,reactionPotential,
    confidence,estimatedWaitDays:confidence>75?'3-8 gün':confidence>55?'5-15 gün':'Teyit beklenmeli',
    target1:round(close*(1+reactionPotential/100*.55)),target2:round(close*(1+reactionPotential/100)),
    stop:round(Math.min(low60,close*(1-Math.max(3,at/close*100*1.4)/100))),
    layers:{trendTired,volume,money,pattern,trendChange,newsKap},
    indicators:{rsi:round(rnow),macdHist:round(hist,4),ema20:round(e20),ema50:round(e50),ema200:round(e200),adx:round(adxNow),pdi:round(pdi),mdi:round(mdi),mfi:round(mf),volRatio:round(volRatio),vwap:round(vw)},
    reasons,warnings,
    label:confidence>80?'Güçlü Dip Adayı':confidence>65?'Dip Adayı':confidence>50?'İzlenebilir Dip':'Teyit Bekle'
  };
}
