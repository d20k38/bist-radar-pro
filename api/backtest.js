const today = {
 PAPIL:{price:34.50,rsi:48,macd:1.24,signal:.72,ema20:33.2,ema50:31.2,ema200:27.8,adx:28,supertrend:'AL',aroon:72,mfi:64,obv:82,vpt:70,atrPct:4.2,volumeRel:1.8,formation:'Çanak-Kulp',formationScore:86},
 TEZOL:{price:21.80,rsi:54,macd:.34,signal:.22,ema20:21.2,ema50:20.7,ema200:19.9,adx:24,supertrend:'AL',aroon:63,mfi:58,obv:61,vpt:60,atrPct:2.6,volumeRel:1.2,formation:'Yükselen Kanal',formationScore:62},
 USAK:{price:3.18,rsi:39,macd:.03,signal:.01,ema20:3.09,ema50:3.01,ema200:3.22,adx:18,supertrend:'İZLE',aroon:51,mfi:49,obv:45,vpt:48,atrPct:7.5,volumeRel:2.4,formation:'İkili Dip',formationScore:74},
 MRSHL:{price:2510,rsi:61,macd:18,signal:15,ema20:2460,ema50:2380,ema200:2180,adx:31,supertrend:'AL',aroon:77,mfi:69,obv:75,vpt:72,atrPct:3.1,volumeRel:1.1,formation:'Trend Devam',formationScore:58},
 VKING:{price:56.4,rsi:44,macd:-.12,signal:-.18,ema20:55.1,ema50:57.0,ema200:61.0,adx:16,supertrend:'BEKLE',aroon:42,mfi:46,obv:40,vpt:43,atrPct:6.8,volumeRel:1.6,formation:'Dip Arayışı',formationScore:65}
};
const past30 = {
 PAPIL:{price:29.10,rsi:42,macd:.42,signal:.55,ema20:28.6,ema50:30.1,ema200:27.2,adx:19,supertrend:'İZLE',aroon:54,mfi:52,obv:59,vpt:57,atrPct:5.2,volumeRel:1.15,formation:'Çanak Başlangıcı',formationScore:68},
 TEZOL:{price:20.90,rsi:49,macd:.16,signal:.12,ema20:20.6,ema50:20.1,ema200:19.7,adx:21,supertrend:'AL',aroon:58,mfi:55,obv:57,vpt:55,atrPct:2.7,volumeRel:1.05,formation:'Güvenli Trend',formationScore:55},
 USAK:{price:3.42,rsi:62,macd:.04,signal:.02,ema20:3.36,ema50:3.12,ema200:3.20,adx:22,supertrend:'İZLE',aroon:61,mfi:60,obv:56,vpt:52,atrPct:8.4,volumeRel:2.8,formation:'Sahte Kırılım Riski',formationScore:42},
 MRSHL:{price:2300,rsi:54,macd:11,signal:9,ema20:2250,ema50:2190,ema200:2060,adx:24,supertrend:'AL',aroon:63,mfi:57,obv:65,vpt:63,atrPct:3.4,volumeRel:1.0,formation:'Trend Devam',formationScore:54},
 VKING:{price:60.2,rsi:37,macd:-.35,signal:-.28,ema20:61.0,ema50:63.1,ema200:66.0,adx:14,supertrend:'BEKLE',aroon:31,mfi:41,obv:34,vpt:38,atrPct:7.1,volumeRel:1.4,formation:'Zayıf Dip',formationScore:46}
};
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function enrich(symbol,s){
 const trend = clamp((s.adx*1.3)+(s.supertrend==='AL'?20:0)+(s.aroon*.35)+(s.price>s.ema50?10:0)+(s.price>s.ema200?10:0));
 const momentum = clamp((s.rsi>=45&&s.rsi<=65?30:s.rsi<35?18:12)+(s.macd>s.signal?35:5)+(s.mfi*.25)+(s.price>s.ema20?10:0));
 const volume = clamp((s.volumeRel*28)+(s.obv*.35)+(s.vpt*.25));
 const risk = clamp((s.atrPct*7)+(s.volumeRel>3?18:0)+(s.price<s.ema200?15:0)+(s.adx<18?10:0));
 const opportunity = clamp(trend*.25+momentum*.25+volume*.25+s.formationScore*.25-risk*.15+15);
 const safe = clamp(trend*.35+momentum*.2+volume*.15+(100-risk)*.3);
 const ai = clamp(trend*.25+momentum*.2+volume*.2+s.formationScore*.15+(100-risk)*.2);
 const riskReward = Math.round((Math.max(opportunity,safe)*(100-risk))/100);
 const decision = ai>=80?'GÜÇLÜ AL':ai>=68?'AL / İZLE':ai>=55?'İZLE':'BEKLE';
 const expected = ai>=68 ? 'YUKARI' : ai>=55 ? 'YATAY / HAFİF YUKARI' : 'ZAYIF';
 return {...s,symbol,trendScore:Math.round(trend),momentumScore:Math.round(momentum),volumeScore:Math.round(volume),riskScore:Math.round(risk),opportunityScore:Math.round(opportunity),safeScore:Math.round(safe),aiScore:Math.round(ai),riskRewardScore:riskReward,decision,expected};
}
function evaluate(pred, change){
 if((pred.includes('YUKARI') || pred.includes('AL')) && change >= 3) return 'DOĞRU';
 if(pred.includes('YATAY') && change > -3 && change < 5) return 'DOĞRU';
 if(pred.includes('ZAYIF') && change <= 0) return 'DOĞRU';
 return 'YANILDI / ZAYIF';
}
export default async function handler(req,res){
 const symbol = (req.query.symbol || 'PAPIL').toUpperCase();
 const p = past30[symbol] || past30.PAPIL;
 const t = today[symbol] || today.PAPIL;
 const past = enrich(symbol,p);
 const now = enrich(symbol,t);
 const changePct = ((now.price - past.price) / past.price) * 100;
 const result = evaluate(past.expected, changePct);
 res.status(200).json({success:true,source:'demo-backtest',symbol,periodDays:30,pastDate:'30 gün önce demo snapshot',todayDate:'bugün demo snapshot',past,now,changePct:Number(changePct.toFixed(2)),result,comment:`${symbol} için 30 gün önceki sinyal ${past.decision} / ${past.expected}. Bugünkü fiyatla değişim %${changePct.toFixed(2)}.`,note:'Bu demo backtesttir. Canlı kullanımda bu route geçmiş OHLCV verisini veri sağlayıcıdan çekip aynı motoru geçmiş tarihe uygular.'});
}
