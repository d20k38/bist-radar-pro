import { analyze } from './engine.js';

const round=(x,d=2)=>Number.isFinite(Number(x))?+Number(x).toFixed(d):0;
const empty=()=>({count:0,success:0,returns:[],successRate:0,avgReturn:0});
const yearOf=d=>String(d||'').slice(0,4)||'Bilinmiyor';

function add(bucket, ret, success){
  bucket.count++;
  bucket.success += success ? 1 : 0;
  bucket.returns.push(ret);
}
function finalizeBucket(bucket){
  bucket.successRate = bucket.count ? round(bucket.success / bucket.count * 100, 1) : 0;
  bucket.avgReturn = bucket.returns.length ? round(bucket.returns.reduce((s,x)=>s+x,0)/bucket.returns.length, 2) : 0;
  delete bucket.returns;
  return bucket;
}
function activeRules(a){
  const rules=[];
  if((a.close||0)>(a.ema50||Infinity)) rules.push({id:'EMA50_USTU', name:'EMA50 üstü'});
  if((a.close||0)>(a.ema200||Infinity)) rules.push({id:'EMA200_USTU', name:'EMA200 üstü'});
  if((a.macd||0)>(a.signal||0)) rules.push({id:'MACD_POZITIF', name:'MACD pozitif'});
  if((a.rsi||0)>40 && (a.rsi||0)<70) rules.push({id:'RSI_SAGLIKLI', name:'RSI sağlıklı bölge'});
  if((a.adx||0)>25) rules.push({id:'ADX_GUCLU', name:'ADX güçlü trend'});
  if((a.pdi||0)>(a.mdi||0)) rules.push({id:'DI_ALICI', name:'+DI alıcı baskın'});
  if(a.superTrendDir===1) rules.push({id:'SUPERTREND_AL', name:'SuperTrend AL'});
  if((a.volume||0)>(a.volAvg||1)) rules.push({id:'HACIM_USTU', name:'Hacim ortalama üstü'});
  if((a.pattern||0)>=60) rules.push({id:'FORMASYON_DESTEK', name:'Formasyon desteği'});
  if((a.risk||100)<50) rules.push({id:'RISK_KONTROLLU', name:'Risk kontrollü'});
  if((a.money||0)>=60) rules.push({id:'PARA_GIRISI', name:'Para girişi güçlü'});
  return rules;
}
function expected(decision, ret){
  if(['GÜÇLÜ AL','AL'].includes(decision)) return ret>0;
  if(decision==='İZLE') return ret>-3;
  return ret<=2;
}

export function learnFromHistory(rows, opts={}){
  const period=Math.max(5, Math.min(Number(opts.period||30), 90));
  const step=Math.max(5, Math.min(Number(opts.step||10), 30));
  const start=Math.max(220, Number(opts.start||220));
  if(!Array.isArray(rows)||rows.length<start+period+10) throw new Error('Öğrenen AI için yeterli tarihsel veri yok');

  const yearly={};
  const rules={};
  const decisions={};
  const samples=[];

  for(let i=start; i<rows.length-period; i+=step){
    try{
      const pastRows=rows.slice(0,i+1);
      const a=analyze(pastRows);
      const future=rows[i+period];
      if(!future || !a.close) continue;
      const ret=((future.close-a.close)/a.close)*100;
      const y=yearOf(a.date);
      const ok=expected(a.decision, ret);
      if(!yearly[y]) yearly[y]=empty();
      add(yearly[y], ret, ok);
      if(!decisions[a.decision]) decisions[a.decision]=empty();
      add(decisions[a.decision], ret, ok);

      for(const r of activeRules(a)){
        if(!rules[r.id]) rules[r.id]={...empty(), id:r.id, name:r.name};
        add(rules[r.id], ret, ret>0);
      }
      samples.push({date:a.date, decision:a.decision, score:a.finalScore, risk:a.risk, returnPct:round(ret), success:ok, year:y});
    }catch(e){/* geçersiz kesitleri atla */}
  }

  const all=empty();
  samples.forEach(s=>add(all, s.returnPct, s.success));
  finalizeBucket(all);
  Object.keys(yearly).forEach(k=>finalizeBucket(yearly[k]));
  Object.keys(decisions).forEach(k=>finalizeBucket(decisions[k]));
  Object.keys(rules).forEach(k=>finalizeBucket(rules[k]));

  const topRules=Object.values(rules)
    .filter(r=>r.count>=3)
    .sort((a,b)=>(b.successRate*0.7+b.avgReturn*0.3)-(a.successRate*0.7+a.avgReturn*0.3))
    .slice(0,8);
  const weakRules=Object.values(rules)
    .filter(r=>r.count>=3)
    .sort((a,b)=>(a.successRate*0.7+a.avgReturn*0.3)-(b.successRate*0.7+b.avgReturn*0.3))
    .slice(0,5);

  const bestYear=Object.entries(yearly).sort((a,b)=>b[1].successRate-a[1].successRate)[0];
  const worstYear=Object.entries(yearly).sort((a,b)=>a[1].successRate-b[1].successRate)[0];

  return {
    period,
    summary:{...all, totalSamples:samples.length, bestYear:bestYear?bestYear[0]:null, worstYear:worstYear?worstYear[0]:null},
    yearly,
    decisions,
    topRules,
    weakRules,
    recentSamples:samples.slice(-40),
    comment: buildLearningComment(all, yearly, topRules, weakRules)
  };
}

function buildLearningComment(summary, yearly, topRules, weakRules){
  const years=Object.keys(yearly).sort();
  const best=topRules[0];
  const weak=weakRules[0];
  let txt=`Öğrenen AI, geçmiş sinyalleri ${years.join(', ')} yıllarına göre değerlendirdi. Genel başarı oranı %${summary.successRate}, ortalama getiri %${summary.avgReturn}.`;
  if(best) txt+=` En iyi çalışan kural: ${best.name} (%${best.successRate}, ort. getiri %${best.avgReturn}).`;
  if(weak) txt+=` En zayıf kural: ${weak.name} (%${weak.successRate}). Bu kural tek başına kullanılmamalı.`;
  return txt;
}
