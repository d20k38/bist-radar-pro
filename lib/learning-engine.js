import { analyze } from './engine.js';

const round=(x,d=2)=>Number.isFinite(Number(x))?+Number(x).toFixed(d):0;
const clamp=(x,min=-20,max=20)=>Math.max(min,Math.min(max,round(x,1)));
const empty=()=>({count:0,success:0,returns:[],successRate:0,avgReturn:0,bestReturn:null,worstReturn:null});
const yearOf=d=>String(d||'').slice(0,4)||'Bilinmiyor';

function add(bucket, ret, success){
  bucket.count++;
  bucket.success += success ? 1 : 0;
  bucket.returns.push(ret);
  bucket.bestReturn = bucket.bestReturn===null ? ret : Math.max(bucket.bestReturn, ret);
  bucket.worstReturn = bucket.worstReturn===null ? ret : Math.min(bucket.worstReturn, ret);
}
function finalizeBucket(bucket){
  bucket.successRate = bucket.count ? round(bucket.success / bucket.count * 100, 1) : 0;
  bucket.avgReturn = bucket.returns.length ? round(bucket.returns.reduce((s,x)=>s+x,0)/bucket.returns.length, 2) : 0;
  bucket.bestReturn = bucket.bestReturn===null ? 0 : round(bucket.bestReturn,2);
  bucket.worstReturn = bucket.worstReturn===null ? 0 : round(bucket.worstReturn,2);
  delete bucket.returns;
  return bucket;
}
function activeRules(a){
  const rules=[];
  if((a.close||0)>(a.ema20||Infinity)) rules.push({id:'EMA20_USTU', name:'EMA20 üstü'});
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
  if((a.finalScore||0)>=65) rules.push({id:'AI_SKOR_GUCLU', name:'AI skoru güçlü'});
  return rules;
}
function expected(decision, ret){
  if(['GÜÇLÜ AL','AL'].includes(decision)) return ret>0;
  if(decision==='İZLE') return ret>-3;
  return ret<=2;
}
function scoreRuleBucket(rule){
  return (rule.successRate||0)*0.65 + (rule.avgReturn||0)*2.0 + Math.min(rule.count||0,30)*0.15;
}
function confidenceAdjustment(summary){
  // Lite öğrenme: geçmiş başarı ve ortalama getiriyi güven puanına küçük bir düzeltme olarak uygular.
  const adj = ((summary.successRate||0)-55)*0.22 + (summary.avgReturn||0)*0.85;
  return clamp(adj,-12,12);
}
function confidenceLabel(adj){
  if(adj>=6) return 'Geçmiş performans güçlü: güven puanı artırılabilir.';
  if(adj>=2) return 'Geçmiş performans olumlu: küçük güven artışı uygun.';
  if(adj<=-6) return 'Geçmiş performans zayıf: güven puanı düşürülmeli.';
  if(adj<=-2) return 'Geçmiş performans sınırlı: temkinli güven düzeltmesi gerekir.';
  return 'Geçmiş performans nötr: mevcut güven puanı korunabilir.';
}
function buildHorizon(rows, horizon, step, start){
  const yearly={}, rules={}, decisions={}, samples=[];
  for(let i=start; i<rows.length-horizon; i+=step){
    try{
      const a=analyze(rows.slice(0,i+1));
      const future=rows[i+horizon];
      if(!future || !a.close) continue;
      const ret=((future.close-a.close)/a.close)*100;
      const y=yearOf(a.date);
      const ok=expected(a.decision, ret);
      if(!yearly[y]) yearly[y]=empty(); add(yearly[y], ret, ok);
      if(!decisions[a.decision]) decisions[a.decision]=empty(); add(decisions[a.decision], ret, ok);
      for(const r of activeRules(a)){
        if(!rules[r.id]) rules[r.id]={...empty(), id:r.id, name:r.name};
        add(rules[r.id], ret, ret>0);
      }
      samples.push({date:a.date, decision:a.decision, score:a.finalScore, risk:a.risk, returnPct:round(ret), success:ok, year:y, horizon});
    }catch(e){/* geçersiz kesitleri atla */}
  }
  const all=empty(); samples.forEach(s=>add(all, s.returnPct, s.success)); finalizeBucket(all);
  Object.keys(yearly).forEach(k=>finalizeBucket(yearly[k]));
  Object.keys(decisions).forEach(k=>finalizeBucket(decisions[k]));
  Object.keys(rules).forEach(k=>finalizeBucket(rules[k]));
  const topRules=Object.values(rules).filter(r=>r.count>=3).sort((a,b)=>scoreRuleBucket(b)-scoreRuleBucket(a)).slice(0,8);
  const weakRules=Object.values(rules).filter(r=>r.count>=3).sort((a,b)=>scoreRuleBucket(a)-scoreRuleBucket(b)).slice(0,5);
  const adj=confidenceAdjustment(all);
  return {horizon, summary:{...all,totalSamples:samples.length,confidenceAdjustment:adj,confidenceLabel:confidenceLabel(adj)}, yearly, decisions, topRules, weakRules, recentSamples:samples.slice(-40)};
}
export function learnFromHistory(rows, opts={}){
  const period=Math.max(5, Math.min(Number(opts.period||30), 90));
  const step=Math.max(5, Math.min(Number(opts.step||10), 30));
  const start=Math.max(220, Number(opts.start||220));
  if(!Array.isArray(rows)||rows.length<start+period+10) throw new Error('Öğrenen AI için yeterli tarihsel veri yok');

  const h5=buildHorizon(rows,5,step,start);
  const h20=buildHorizon(rows,20,step,start);
  const hp=buildHorizon(rows,period,step,start);
  const bestYear=Object.entries(hp.yearly).sort((a,b)=>b[1].successRate-a[1].successRate)[0];
  const worstYear=Object.entries(hp.yearly).sort((a,b)=>a[1].successRate-b[1].successRate)[0];
  hp.summary.bestYear=bestYear?bestYear[0]:null;
  hp.summary.worstYear=worstYear?worstYear[0]:null;
  return {
    period,
    horizons:{'5g':h5.summary,'20g':h20.summary,[period+'g']:hp.summary},
    summary:hp.summary,
    yearly:hp.yearly,
    decisions:hp.decisions,
    topRules:hp.topRules,
    weakRules:hp.weakRules,
    recentSamples:hp.recentSamples,
    confidenceAdjustment:hp.summary.confidenceAdjustment,
    confidenceLabel:hp.summary.confidenceLabel,
    comment: buildLearningComment(hp.summary, hp.yearly, hp.topRules, hp.weakRules, h5.summary, h20.summary)
  };
}
function buildLearningComment(summary, yearly, topRules, weakRules, h5, h20){
  const years=Object.keys(yearly).sort();
  const best=topRules[0];
  const weak=weakRules[0];
  let txt=`Öğrenen AI, geçmiş sinyalleri ${years.join(', ')} yıllarına göre değerlendirdi. 30 günlük genel başarı oranı %${summary.successRate}, ortalama getiri %${summary.avgReturn}.`;
  txt+=` 5 günlük başarı %${h5.successRate}, 20 günlük başarı %${h20.successRate}.`;
  txt+=` Güven düzeltmesi: ${summary.confidenceAdjustment>=0?'+':''}${summary.confidenceAdjustment} puan. ${summary.confidenceLabel}`;
  if(best) txt+=` En iyi çalışan kural: ${best.name} (%${best.successRate}, ort. getiri %${best.avgReturn}).`;
  if(weak) txt+=` En zayıf kural: ${weak.name} (%${weak.successRate}). Bu kural tek başına kullanılmamalı.`;
  return txt;
}
