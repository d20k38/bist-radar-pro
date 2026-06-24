const demo = [
 {symbol:'PAPIL',price:34.5,rsi:48,macd:1.24,signal:.72,ema20:33.2,ema50:31.2,ema200:27.8,adx:28,supertrend:'AL',aroon:72,mfi:64,obv:82,vpt:70,atrPct:4.2,volumeRel:1.8,formation:'Çanak-Kulp',formationScore:86,kapScore:55},
 {symbol:'TEZOL',price:21.8,rsi:54,macd:.34,signal:.22,ema20:21.2,ema50:20.7,ema200:19.9,adx:24,supertrend:'AL',aroon:63,mfi:58,obv:61,vpt:60,atrPct:2.6,volumeRel:1.2,formation:'Yükselen Kanal',formationScore:62,kapScore:50},
 {symbol:'USAK',price:3.18,rsi:39,macd:.03,signal:.01,ema20:3.09,ema50:3.01,ema200:3.22,adx:18,supertrend:'İZLE',aroon:51,mfi:49,obv:45,vpt:48,atrPct:7.5,volumeRel:2.4,formation:'İkili Dip',formationScore:74,kapScore:45},
 {symbol:'MRSHL',price:2510,rsi:61,macd:18,signal:15,ema20:2460,ema50:2380,ema200:2180,adx:31,supertrend:'AL',aroon:77,mfi:69,obv:75,vpt:72,atrPct:3.1,volumeRel:1.1,formation:'Trend Devam',formationScore:58,kapScore:50},
 {symbol:'VKING',price:56.4,rsi:44,macd:-.12,signal:-.18,ema20:55.1,ema50:57.0,ema200:61.0,adx:16,supertrend:'BEKLE',aroon:42,mfi:46,obv:40,vpt:43,atrPct:6.8,volumeRel:1.6,formation:'Dip Arayışı',formationScore:65,kapScore:40},
 {symbol:'THYAO',price:315.2,rsi:57,macd:2.8,signal:2.1,ema20:309,ema50:298,ema200:272,adx:29,supertrend:'AL',aroon:81,mfi:66,obv:78,vpt:76,atrPct:2.4,volumeRel:1.4,formation:'Kırılım',formationScore:70,kapScore:60},
 {symbol:'TUPRS',price:172.6,rsi:52,macd:1.1,signal:.8,ema20:169,ema50:163,ema200:151,adx:25,supertrend:'AL',aroon:68,mfi:60,obv:69,vpt:65,atrPct:2.1,volumeRel:1.0,formation:'Güvenli Trend',formationScore:55,kapScore:58}
];
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v));}
function enrich(s){
 const trend = clamp((s.adx*1.3)+(s.supertrend==='AL'?20:0)+(s.aroon*.35)+(s.price>s.ema50?10:0)+(s.price>s.ema200?10:0));
 const momentum = clamp((s.rsi>=45&&s.rsi<=65?30:s.rsi<35?18:12)+(s.macd>s.signal?35:5)+(s.mfi*.25)+(s.price>s.ema20?10:0));
 const volume = clamp((s.volumeRel*28)+(s.obv*.35)+(s.vpt*.25));
 const risk = clamp((s.atrPct*7)+(s.volumeRel>3?18:0)+(s.price<s.ema200?15:0)+(s.adx<18?10:0));
 const opportunity = clamp(trend*.25+momentum*.25+volume*.25+s.formationScore*.25-risk*.15+15);
 const safe = clamp(trend*.35+momentum*.2+volume*.15+(100-risk)*.3);
 const ai = clamp(trend*.25+momentum*.2+volume*.2+s.formationScore*.15+(100-risk)*.2);
 const riskReward = Math.round((Math.max(opportunity,safe)*(100-risk))/100);
 return {...s,trendScore:Math.round(trend),momentumScore:Math.round(momentum),volumeScore:Math.round(volume),riskScore:Math.round(risk),opportunityScore:Math.round(opportunity),safeScore:Math.round(safe),aiScore:Math.round(ai),riskRewardScore:riskReward,decision: ai>=80?'GÜÇLÜ AL':ai>=68?'AL / İZLE':ai>=55?'İZLE':'BEKLE'};
}
export default async function handler(req,res){
 const data = demo.map(enrich).sort((a,b)=>b.aiScore-a.aiScore);
 res.status(200).json({success:true,source:'demo-api-route',note:'Canlı TradingView/Mynet/KAP bağlantısı için bu route içine veri çekme kodu eklenebilir. HTML API anahtarı içermez.',updatedAt:new Date().toISOString(),data});
}
