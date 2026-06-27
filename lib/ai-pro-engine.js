import {avg,clamp,last,pct,sma,ema} from './math.js';
import {rsi,macd,atr,obv,mfi,roc,cci,bollinger,donchian,adx,superTrend} from './indicators.js';
import {detectPatterns} from './pattern-engine.js';
import {loadMemory,learningScore,bestRules} from './learning-engine.js';
import {quickBacktest} from './backtest-engine.js';

export async function analyzeSymbol(symbol, rows){
  const c=rows.map(x=>x.close), h=rows.map(x=>x.high), l=rows.map(x=>x.low), v=rows.map(x=>x.volume||0), n=c.length-1;
  const close=c[n], prev=c[n-1]||close;
  const em20=ema(c,20), em50=ema(c,50), em200=ema(c,200), ma20=sma(c,20), vol20=sma(v,20);
  const rs=rsi(c), mc=macd(c), at=atr(h,l,c), ob=obv(c,v), mf=mfi(h,l,c,v), ro=roc(c), cc=cci(h,l,c), bb=bollinger(c), dc=donchian(h,l), dx=adx(h,l,c), st=superTrend(h,l,c);
  const pattern=detectPatterns(rows);
  const memory=await loadMemory();
  const atrPct=((at[n]||0)/close)*100;
  const volumeRatio=(v[n]||0)/Math.max(1,vol20[n]||1);
  const trend=clamp((close>(em20[n]||Infinity)?15:0)+(close>(em50[n]||Infinity)?20:0)+(close>(em200[n]||Infinity)?20:0)+((em50[n]||0)>(em200[n]||0)?15:0)+((dx.adx[n]||0)>25?15:0)+(st.dir[n]===1?15:0));
  const momentum=clamp(((rs[n]||0)>45&&(rs[n]||0)<68?25:0)+((mc.macd[n]||0)>(mc.signal[n]||0)?30:0)+((mc.hist[n]||0)>(mc.hist[n-1]||0)?20:0)+((ro[n]||0)>0?25:0));
  const money=clamp((volumeRatio>1.5?30:volumeRatio>1.1?15:0)+((mf[n]||0)>50&&(mf[n]||0)<80?25:0)+(ob[n]>(ob[Math.max(0,n-20)]||0)?25:0)+(close>(ma20[n]||Infinity)?20:0));
  const volatility=clamp(100-(atrPct>8?80:atrPct>5?55:atrPct>3?35:18));
  const risk=clamp(100-volatility + ((rs[n]||0)>75?15:0) + (Math.abs(pct(close,prev))>7?15:0));
  const backtest=quickBacktest(rows, trend*0.4+momentum*0.3+money*0.3);
  const kapNews=55; // v17.1'de gerçek KAP endpointine bağlanacak alan
  const financial=60; // temel veri yoksa nötr
  const sector=60; // sektör rotasyonu yoksa nötr
  const learning=learningScore(memory);
  const layers={trend,momentum,money,volatility,pattern:pattern.score,backtest:backtest.successRate,kapNews,financial,sector,learning};
  const w=memory.weights;
  const aiGeneral=clamp(Object.entries(layers).reduce((s,[k,val])=>s+val*(w[k]??0),0));
  const probability=clamp(aiGeneral*0.72 + backtest.successRate*0.28 - risk*0.10);
  const expectedReturn=+(Math.max(3, pattern.targetPct*0.45 + (aiGeneral-50)/4 + backtest.avgReturn*0.35)).toFixed(2);
  const stop=+(Math.max(dc[n].lower, close*(1-(4+risk/25)/100))).toFixed(2);
  const target=+(close*(1+expectedReturn/100)).toFixed(2);
  const decision=aiGeneral>=82?'GÜÇLÜ AL':aiGeneral>=68?'AL':aiGeneral>=55?'İZLE':aiGeneral>=42?'BEKLE':'RİSKLİ';
  const positives=[]; const negatives=[];
  const add=(cond,txt)=>cond?positives.push(txt):negatives.push(txt);
  add(close>(em20[n]||Infinity),'EMA20 üzerinde'); add(close>(em50[n]||Infinity),'EMA50 üzerinde'); add(close>(em200[n]||Infinity),'EMA200 üzerinde'); add((dx.adx[n]||0)>25,'ADX trend gücü yeterli'); add(st.dir[n]===1,'SuperTrend AL'); add((mc.macd[n]||0)>(mc.signal[n]||0),'MACD pozitif'); add(volumeRatio>1.1,'Hacim ortalamanın üstünde'); add(risk<45,'Risk kabul edilebilir'); add(backtest.successRate>65,'Benzer sinyaller geçmişte başarılı');
  const aiComment = `${symbol} için AI Pro motoru ${decision} sonucunu üretiyor. Güven ${aiGeneral}/100, olasılık %${probability}, risk ${risk}/100. En güçlü katmanlar: ${Object.entries(layers).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(', ')}. ${positives.length?'Olumlu gerekçeler: '+positives.slice(0,4).join('; ')+'.':''} ${negatives.length?'Zayıf noktalar: '+negatives.slice(0,3).join('; ')+'.':''}`;
  return {symbol,date:rows[n].date,close,prev,change:pct(close,prev),open:rows[n].open,high:rows[n].high,low:rows[n].low,volume:v[n], volumeRatio, ema20:em20[n],ema50:em50[n],ema200:em200[n],rsi:rs[n],macd:mc.macd[n],signal:mc.signal[n],hist:mc.hist[n],atr:at[n],atrPct,obv:ob[n],mfi:mf[n],roc:ro[n],cci:cc[n],adx:dx.adx[n],pdi:dx.pdi[n],mdi:dx.mdi[n],superTrend:st.line[n],superTrendDir:st.dir[n],bollinger:bb[n],donchian:dc[n],pattern,backtest,layers,aiGeneral,probability,expectedReturn,stop,target,risk,decision,positives,negatives,aiComment,bestRules:bestRules(memory),ohlcv:rows.slice(-180)};
}
