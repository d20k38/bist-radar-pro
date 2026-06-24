export const WATCHLIST = [
  'PAPIL','TEZOL','USAK','MRSHL','VKING','THYAO','TUPRS','FROTO','BIMAS','AKBNK','GARAN','ASELS','KCHOL','EREGL','SISE','PETKM','VESTL','ZOREN','ULKER','YYLGD'
];

function hashCode(str){
  let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
  return Math.abs(h);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function round(n,d=2){ return Number(n.toFixed(d)); }
function ema(values, period){
  const k=2/(period+1); let out=[]; let prev=values[0];
  for(const v of values){ prev = prev + k*(v-prev); out.push(prev); }
  return out;
}
function sma(values, period){
  return values.map((_,i)=>{
    const start=Math.max(0,i-period+1); const arr=values.slice(start,i+1);
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  });
}
function rsi(values, period=14){
  let out=Array(values.length).fill(50);
  for(let i=period;i<values.length;i++){
    let gains=0, losses=0;
    for(let j=i-period+1;j<=i;j++){
      const diff=values[j]-values[j-1];
      if(diff>=0) gains+=diff; else losses-=diff;
    }
    const rs=losses===0?100:gains/losses;
    out[i]=100-(100/(1+rs));
  }
  return out;
}
function macd(values){
  const e12=ema(values,12), e26=ema(values,26);
  const line=values.map((_,i)=>e12[i]-e26[i]);
  const signal=ema(line,9);
  const hist=line.map((v,i)=>v-signal[i]);
  return {line,signal,hist};
}
function atr(high,low,close,period=14){
  const tr=[];
  for(let i=0;i<close.length;i++){
    if(i===0) tr.push(high[i]-low[i]);
    else tr.push(Math.max(high[i]-low[i], Math.abs(high[i]-close[i-1]), Math.abs(low[i]-close[i-1])));
  }
  return sma(tr,period);
}
export function generateSeries(symbol, days=260){
  const seed=hashCode(symbol); let price=8+(seed%9000)/100; const arr=[];
  const trend=((seed%41)-20)/10000;
  for(let i=0;i<days;i++){
    const cyc=Math.sin((i+(seed%50))/13)*0.012 + Math.cos((i+(seed%70))/29)*0.007;
    const noise=(((seed*(i+3))%101)-50)/10000;
    const change=trend+cyc+noise;
    const open=price;
    let close=price*(1+change);
    const high=Math.max(open,close)*(1+0.006+((seed+i)%7)/1000);
    const low=Math.min(open,close)*(1-0.006-((seed+i)%5)/1000);
    const volume=Math.round(200000 + (seed%800000) + Math.abs(change)*60000000 + ((seed*i)%300000));
    arr.push({date:new Date(Date.now()-(days-i)*86400000).toISOString().slice(0,10), open:round(open), high:round(high), low:round(low), close:round(close), volume});
    price=close;
  }
  return arr;
}
export function analyze(symbol, uptoIndex=null){
  const series=generateSeries(symbol);
  const cut=uptoIndex===null?series:series.slice(0,uptoIndex+1);
  const close=cut.map(x=>x.close), high=cut.map(x=>x.high), low=cut.map(x=>x.low), volume=cut.map(x=>x.volume);
  const last=cut.length-1;
  const e20=ema(close,20), e50=ema(close,50), e200=ema(close,200);
  const s50=sma(close,50), s200=sma(close,200), rs=rsi(close), m=macd(close), a=atr(high,low,close);
  const avgVol=sma(volume,20);
  const c=close[last], prev=close[last-1]||c;
  const trendScore=clamp((c>e50[last]?20:0)+(c>e200[last]?20:0)+(e50[last]>e200[last]?20:0)+(c>s50[last]?10:0)+(c>s200[last]?10:0)+(m.hist[last]>0?20:0),0,100);
  const momentumScore=clamp((rs[last]>=45&&rs[last]<=65?30:0)+(rs[last]>rs[last-1]?20:0)+(m.line[last]>m.signal[last]?30:0)+(m.hist[last]>m.hist[last-1]?20:0),0,100);
  const volumeScore=clamp((volume[last]/Math.max(avgVol[last],1))*45 + (c>prev?25:0),0,100);
  const riskScore=clamp((a[last]/Math.max(c,1))*450 + (volume[last]<350000?25:0) + (rs[last]>72?15:0),5,95);
  const safetyScore=clamp(trendScore*0.35 + momentumScore*0.20 + (100-riskScore)*0.35 + volumeScore*0.10,0,100);
  const opportunityScore=clamp(momentumScore*0.35 + volumeScore*0.30 + trendScore*0.20 + (100-riskScore)*0.15,0,100);
  const expectedReturn=clamp((opportunityScore-riskScore/2)/4,0,35);
  const riskReturnScore=clamp((expectedReturn * safetyScore) / Math.max(riskScore,5) * 3.2,0,100);
  let decision='BEKLE';
  if(riskScore>70) decision='RİSKLİ';
  else if(safetyScore>=78 && riskReturnScore>=55) decision='GÜVENLİ AL';
  else if(opportunityScore>=80 && riskScore<60) decision='FIRSAT AL';
  else if(safetyScore>=60 || opportunityScore>=65) decision='İZLE';
  const pattern = detectPattern(cut, e50, e200, rs, m.hist);
  return {
    symbol, price:round(c), changePct:round((c/prev-1)*100),
    rsi:round(rs[last]), macd:round(m.line[last],3), signal:round(m.signal[last],3), macdHist:round(m.hist[last],3),
    ema20:round(e20[last]), ema50:round(e50[last]), ema200:round(e200[last]), sma50:round(s50[last]), sma200:round(s200[last]),
    atr:round(a[last]), volume:volume[last], avgVolume20:Math.round(avgVol[last]),
    trendScore:round(trendScore), momentumScore:round(momentumScore), volumeScore:round(volumeScore), riskScore:round(riskScore),
    safetyScore:round(safetyScore), opportunityScore:round(opportunityScore), riskReturnScore:round(riskReturnScore), expectedReturn:round(expectedReturn),
    decision, pattern, series: cut.slice(-80)
  };
}
export function detectPattern(cut,e50,e200,rs,hist){
  const last=cut.length-1, closes=cut.map(x=>x.close); const c=closes[last];
  const min60=Math.min(...closes.slice(-60)); const max60=Math.max(...closes.slice(-60));
  if(c>e50[last] && c>e200[last] && e50[last]>e200[last]) return 'EMA50/EMA200 güçlü trend';
  if(rs[last]<35 && hist[last]>hist[last-1]) return 'Dipten dönüş adayı';
  if(c>max60*0.96 && c>e50[last]) return 'Çanak kırılım adayı';
  if(c<min60*1.08 && hist[last]>hist[last-1]) return 'İkili dip olasılığı';
  return 'Belirgin formasyon yok';
}
export function scanAll(){
  return WATCHLIST.map(s=>analyze(s)).sort((a,b)=>b.riskReturnScore-a.riskReturnScore);
}
export function backtest(symbol='PAPIL', period=30){
  const series=generateSeries(symbol,260);
  const testIndex=series.length-1-period;
  const then=analyze(symbol,testIndex);
  const now=analyze(symbol);
  const realized=round((now.price/then.price-1)*100);
  const expectedDirection=(then.decision.includes('AL')||then.decision==='İZLE')?'YUKARI/YATAY':'AŞAĞI/RİSK';
  const correct = then.decision==='RİSKLİ' ? realized<=3 : (then.decision.includes('AL') ? realized>0 : Math.abs(realized)<8 || realized>0);
  return { symbol, period, then, now, realizedReturn:realized, expectedDirection, correct, note:'Demo motor sentetik fiyat serisiyle çalışır. Gerçek sonuç için canlı/geçmiş OHLCV verisi bağlanmalıdır.' };
}
