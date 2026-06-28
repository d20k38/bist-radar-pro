import { analyze } from './engine.js';
import { sma, rsi, obv } from './indicators.js';

const round=(x,d=2)=>Number.isFinite(Number(x))?+Number(x).toFixed(d):0;
const clamp=(x,min=-20,max=20)=>Math.max(min,Math.min(max,round(x,1)));
const empty=()=>({count:0,success:0,returns:[],drawdowns:[],holding:[],successRate:0,avgReturn:0,bestReturn:null,worstReturn:null,maxDrawdown:0,avgHoldingDays:0});
const yearOf=d=>String(d||'').slice(0,4)||'Bilinmiyor';
function add(bucket, ret, success, dd=0, hold=0){
  bucket.count++; bucket.success += success ? 1 : 0; bucket.returns.push(ret); bucket.drawdowns.push(dd); bucket.holding.push(hold);
  bucket.bestReturn = bucket.bestReturn===null ? ret : Math.max(bucket.bestReturn, ret);
  bucket.worstReturn = bucket.worstReturn===null ? ret : Math.min(bucket.worstReturn, ret);
}
function finalizeBucket(bucket){
  bucket.successRate = bucket.count ? round(bucket.success / bucket.count * 100, 1) : 0;
  bucket.avgReturn = bucket.returns.length ? round(bucket.returns.reduce((s,x)=>s+x,0)/bucket.returns.length, 2) : 0;
  bucket.bestReturn = bucket.bestReturn===null ? 0 : round(bucket.bestReturn,2);
  bucket.worstReturn = bucket.worstReturn===null ? 0 : round(bucket.worstReturn,2);
  bucket.maxDrawdown = bucket.drawdowns.length ? round(Math.min(...bucket.drawdowns),2) : 0;
  bucket.avgHoldingDays = bucket.holding.length ? round(bucket.holding.reduce((s,x)=>s+x,0)/bucket.holding.length,1) : 0;
  delete bucket.returns; delete bucket.drawdowns; delete bucket.holding; return bucket;
}
function vwapAt(rows, i, n=20){
  const start=Math.max(0,i-n+1); let pv=0,vol=0;
  for(let k=start;k<=i;k++){const tp=((rows[k].high||0)+(rows[k].low||0)+(rows[k].close||0))/3; const v=rows[k].volume||0; pv+=tp*v; vol+=v;}
  return vol?pv/vol:null;
}
function cmfAt(rows, i, n=20){
  const start=Math.max(0,i-n+1); let mfv=0,vol=0;
  for(let k=start;k<=i;k++){const h=rows[k].high||0,l=rows[k].low||0,c=rows[k].close||0,v=rows[k].volume||0; const mfm=(h-l)?(((c-l)-(h-c))/(h-l)):0; mfv+=mfm*v; vol+=v;}
  return vol?mfv/vol:0;
}
function contextArrays(rows){
  const c=rows.map(x=>x.close), v=rows.map(x=>x.volume||0);
  return { c, v, rsi:rsi(c,14), obv:obv(c,v), vol20:sma(v,20), vol5:sma(v,5) };
}
function forwardStats(rows, i, horizon){
  const entry=rows[i]?.close||0; if(!entry) return {ret:0,dd:0,best:0,hold:horizon};
  let minRet=0,best=0,exit=entry,hit=0;
  for(let k=i+1;k<=Math.min(rows.length-1,i+horizon);k++){
    const lo=rows[k].low||rows[k].close||entry, hi=rows[k].high||rows[k].close||entry;
    minRet=Math.min(minRet, ((lo-entry)/entry)*100); best=Math.max(best, ((hi-entry)/entry)*100); exit=rows[k].close||exit; hit=k-i;
  }
  return {ret:((exit-entry)/entry)*100, dd:minRet, best, hold:hit||horizon};
}
function activeRules(a, rows=null, i=null, ctx=null){
  const rules=[];
  if((a.close||0)>(a.ema20||Infinity)) rules.push({id:'EMA20_USTU', name:'EMA20 üstü'});
  if((a.close||0)>(a.ema50||Infinity)) rules.push({id:'EMA50_USTU', name:'EMA50 üstü'});
  if((a.close||0)>(a.ema200||Infinity)) rules.push({id:'EMA200_USTU', name:'EMA200 üstü'});
  if((a.macd||0)>(a.signal||0)) rules.push({id:'MACD_POZITIF', name:'MACD pozitif'});
  if((a.rsi||0)>40 && (a.rsi||0)<70) rules.push({id:'RSI_SAGLIKLI', name:'RSI 40-70 sağlıklı bölge'});
  if((a.adx||0)>25) rules.push({id:'ADX_GUCLU', name:'ADX güçlü trend'});
  if((a.pdi||0)>(a.mdi||0)) rules.push({id:'DI_ALICI', name:'+DI alıcı baskın'});
  if(a.superTrendDir===1) rules.push({id:'SUPERTREND_AL', name:'SuperTrend AL'});
  if((a.volume||0)>(a.volAvg||1)) rules.push({id:'HACIM_USTU', name:'Hacim ortalama üstü'});
  if((a.pattern||0)>=60) rules.push({id:'FORMASYON_DESTEK', name:'Formasyon desteği'});
  if((a.risk||100)<50) rules.push({id:'RISK_KONTROLLU', name:'Risk kontrollü'});
  if((a.money||0)>=60) rules.push({id:'PARA_GIRISI', name:'Para girişi güçlü'});
  if((a.finalScore||0)>=65) rules.push({id:'AI_SKOR_GUCLU', name:'AI skoru güçlü'});
  if(rows && i!==null && ctx){
    const rvol20=(rows[i].volume||0)/(ctx.vol20[i]||1), rvol5=(rows[i].volume||0)/(ctx.vol5[i]||1), vw=vwapAt(rows,i,20), cmf=cmfAt(rows,i,20);
    const obvUp=(ctx.obv[i]||0)>(ctx.obv[Math.max(0,i-5)]||0);
    if(rvol20>=2) rules.push({id:'RVOL20_2_USTU', name:'RVOL20 > 2'});
    if(rvol5>=1.5) rules.push({id:'RVOL5_15_USTU', name:'RVOL5 > 1.5'});
    if(cmf>0) rules.push({id:'CMF_POZITIF', name:'CMF pozitif'});
    if(obvUp) rules.push({id:'OBV_YUKSELEN', name:'OBV yükseliyor'});
    if(vw && rows[i].close>vw) rules.push({id:'VWAP_USTU', name:'VWAP üstü'});
    if((ctx.rsi[i]||0)>=45 && (ctx.rsi[i]||0)<=70) rules.push({id:'RSI_45_70', name:'RSI 45-70'});
  }
  return rules;
}
const comboDefs=[
  {id:'DAY_TRADING_CORE', name:'RVOL>2 + CMF+ + OBV↑ + VWAP üstü', rules:['RVOL20_2_USTU','CMF_POZITIF','OBV_YUKSELEN','VWAP_USTU']},
  {id:'RADAR_LAB_DEFAULT', name:'RVOL>2 + CMF+ + OBV↑ + VWAP üstü + RSI45-70', rules:['RVOL20_2_USTU','CMF_POZITIF','OBV_YUKSELEN','VWAP_USTU','RSI_45_70']},
  {id:'INSTITUTIONAL_FLOW', name:'Para girişi + RVOL + VWAP', rules:['PARA_GIRISI','RVOL20_2_USTU','VWAP_USTU']},
  {id:'TREND_MOMENTUM', name:'EMA50 üstü + MACD+ + SuperTrend', rules:['EMA50_USTU','MACD_POZITIF','SUPERTREND_AL']},
  {id:'LOW_RISK_AI', name:'AI güçlü + risk kontrollü', rules:['AI_SKOR_GUCLU','RISK_KONTROLLU']}
];
function expected(decision, ret){ if(['GÜÇLÜ AL','AL'].includes(decision)) return ret>0; if(decision==='İZLE') return ret>-3; return ret<=2; }
function scoreRuleBucket(rule){ return (rule.successRate||0)*0.55 + (rule.avgReturn||0)*2.2 + Math.min(rule.count||0,50)*0.12 + Math.max(rule.maxDrawdown||0,-20)*0.35; }
function confidenceAdjustment(summary){ const adj = ((summary.successRate||0)-55)*0.22 + (summary.avgReturn||0)*0.85 + Math.max(summary.maxDrawdown||0,-12)*0.18; return clamp(adj,-12,12); }
function confidenceLabel(adj){ if(adj>=6) return 'Geçmiş performans güçlü: güven puanı artırılabilir.'; if(adj>=2) return 'Geçmiş performans olumlu: küçük güven artışı uygun.'; if(adj<=-6) return 'Geçmiş performans zayıf: güven puanı düşürülmeli.'; if(adj<=-2) return 'Geçmiş performans sınırlı: temkinli güven düzeltmesi gerekir.'; return 'Geçmiş performans nötr: mevcut güven puanı korunabilir.'; }
function buildHorizon(rows, horizon, step, start){
  const yearly={}, rules={}, decisions={}, combos={}, samples=[]; const ctx=contextArrays(rows);
  for(const c of comboDefs) combos[c.id]={...empty(), id:c.id, name:c.name, rules:c.rules};
  for(let i=start; i<rows.length-horizon; i+=step){
    try{
      const a=analyze(rows.slice(0,i+1)); const fs=forwardStats(rows,i,horizon); const y=yearOf(a.date); const ok=expected(a.decision, fs.ret);
      if(!yearly[y]) yearly[y]=empty(); add(yearly[y], fs.ret, ok, fs.dd, fs.hold);
      if(!decisions[a.decision]) decisions[a.decision]=empty(); add(decisions[a.decision], fs.ret, ok, fs.dd, fs.hold);
      const ar=activeRules(a, rows, i, ctx); const ids=new Set(ar.map(x=>x.id));
      for(const r of ar){ if(!rules[r.id]) rules[r.id]={...empty(), id:r.id, name:r.name}; add(rules[r.id], fs.ret, fs.ret>0, fs.dd, fs.hold); }
      for(const c of comboDefs){ if(c.rules.every(r=>ids.has(r))) add(combos[c.id], fs.ret, fs.ret>0, fs.dd, fs.hold); }
      samples.push({date:a.date, decision:a.decision, score:a.finalScore, risk:a.risk, returnPct:round(fs.ret), maxDrawdown:round(fs.dd), success:ok, year:y, horizon, matchedRules:[...ids].slice(0,10)});
    }catch(e){/* geçersiz kesitleri atla */}
  }
  const all=empty(); samples.forEach(s=>add(all, s.returnPct, s.success, s.maxDrawdown, horizon)); finalizeBucket(all);
  Object.keys(yearly).forEach(k=>finalizeBucket(yearly[k])); Object.keys(decisions).forEach(k=>finalizeBucket(decisions[k])); Object.keys(rules).forEach(k=>finalizeBucket(rules[k])); Object.keys(combos).forEach(k=>finalizeBucket(combos[k]));
  const topRules=Object.values(rules).filter(r=>r.count>=3).sort((a,b)=>scoreRuleBucket(b)-scoreRuleBucket(a)).slice(0,10);
  const weakRules=Object.values(rules).filter(r=>r.count>=3).sort((a,b)=>scoreRuleBucket(a)-scoreRuleBucket(b)).slice(0,6);
  const topCombos=Object.values(combos).filter(r=>r.count>=2).sort((a,b)=>scoreRuleBucket(b)-scoreRuleBucket(a)).slice(0,8);
  const adj=confidenceAdjustment(all);
  return {horizon, summary:{...all,totalSamples:samples.length,confidenceAdjustment:adj,confidenceLabel:confidenceLabel(adj)}, yearly, decisions, topRules, weakRules, topCombos, recentSamples:samples.slice(-50)};
}
export function learnFromHistory(rows, opts={}){
  const period=Math.max(5, Math.min(Number(opts.period||30), 90)); const step=Math.max(3, Math.min(Number(opts.step||10), 30)); const start=Math.max(180, Number(opts.start||220));
  if(!Array.isArray(rows)||rows.length<start+period+10) throw new Error('Öğrenen AI için yeterli tarihsel veri yok');
  const h5=buildHorizon(rows,5,step,start), h20=buildHorizon(rows,20,step,start), hp=buildHorizon(rows,period,step,start);
  const bestYear=Object.entries(hp.yearly).sort((a,b)=>b[1].successRate-a[1].successRate)[0]; const worstYear=Object.entries(hp.yearly).sort((a,b)=>a[1].successRate-b[1].successRate)[0]; hp.summary.bestYear=bestYear?bestYear[0]:null; hp.summary.worstYear=worstYear?worstYear[0]:null;
  const signature={
    name:'Bugünkü sinyal kombinasyonu',
    matched: hp.topCombos[0]?.name || 'Yeterli tekrar eden kombinasyon yok',
    successRate: hp.topCombos[0]?.successRate || hp.summary.successRate,
    avgReturn: hp.topCombos[0]?.avgReturn || hp.summary.avgReturn,
    maxDrawdown: hp.topCombos[0]?.maxDrawdown || hp.summary.maxDrawdown,
    samples: hp.topCombos[0]?.count || hp.summary.count
  };
  
  const v30 = buildV30LearningLayer(h5.summary, h20.summary, hp.summary, hp.yearly, hp.topRules, hp.weakRules, hp.topCombos, signature);
  return {version:'V30 AI Learning Engine', period, horizons:{'5g':h5.summary,'20g':h20.summary,[period+'g']:hp.summary}, summary:hp.summary, yearly:hp.yearly, decisions:hp.decisions, topRules:hp.topRules, weakRules:hp.weakRules, topCombos:hp.topCombos, signalSignature:signature, v30, recentSamples:hp.recentSamples, confidenceAdjustment:hp.summary.confidenceAdjustment, confidenceLabel:hp.summary.confidenceLabel, comment: buildLearningComment(hp.summary, hp.yearly, hp.topRules, hp.weakRules, hp.topCombos, h5.summary, h20.summary, v30)};
}

function stabilityFromHorizons(h5,h20,hp){
  const vals=[h5.successRate||0,h20.successRate||0,hp.successRate||0];
  const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  const dev=vals.reduce((a,b)=>a+Math.abs(b-avg),0)/vals.length;
  return round(Math.max(0, Math.min(100, avg - dev*1.4)),1);
}
function gradeFromScore(score){
  if(score>=85) return 'A+';
  if(score>=75) return 'A';
  if(score>=65) return 'B';
  if(score>=55) return 'C';
  return 'D';
}
function buildV30LearningLayer(h5,h20,hp,yearly,topRules,weakRules,topCombos,signature){
  const stability=stabilityFromHorizons(h5,h20,hp);
  const consistency=Math.max(0, Math.min(100, 100-Math.abs((h5.successRate||0)-(h20.successRate||0))*1.2-Math.abs((h20.successRate||0)-(hp.successRate||0))*0.8));
  const edge=round((hp.avgReturn||0)*8 + ((hp.successRate||0)-50)*0.9 + Math.max(hp.maxDrawdown||0,-20)*0.7,1);
  const learningScore=round(Math.max(0, Math.min(100, stability*0.35 + consistency*0.25 + Math.max(0,Math.min(100,50+edge))*0.25 + Math.min(hp.count||0,120)/120*100*0.15)),1);
  const years=Object.entries(yearly||{}).sort((a,b)=>b[1].successRate-a[1].successRate);
  const positiveYears=years.filter(([_,r])=>(r.successRate||0)>=55).length;
  const totalYears=years.length||1;
  const regime=positiveYears/totalYears>=0.7?'Geniş piyasa dönemlerinde dayanıklı':positiveYears/totalYears>=0.45?'Seçici piyasa dönemlerinde çalışıyor':'Sadece belirli dönemlerde çalışıyor';
  const iqsPreview={trend:Math.round((topRules||[]).some(r=>/EMA|SuperTrend|ADX/.test(r.id||''))?14:10), volume:Math.round((topCombos||[]).length?18:12), momentum:Math.round((topRules||[]).some(r=>/MACD|RSI/.test(r.id||''))?13:9), backtest:Math.round(Math.min(15,Math.max(0,(hp.successRate||0)/100*15))), risk:Math.round(Math.min(10,Math.max(0,10+((hp.maxDrawdown||0)/3)))), learning:Math.round(learningScore/10)};
  iqsPreview.total=Math.round(iqsPreview.trend+iqsPreview.volume+iqsPreview.momentum+iqsPreview.backtest+iqsPreview.risk+iqsPreview.learning);
  const action=learningScore>=75?'Bu sinyal grubu güçlü; AI güven puanını artırarak izlenebilir.':learningScore>=60?'Sinyal grubu orta-güçlü; ek KAP/finansal teyit beklenmeli.':learningScore>=45?'Sinyal grubu kararsız; pozisyon küçük tutulmalı.':'Sinyal grubu zayıf; tek başına işlem nedeni olmamalı.';
  return {learningScore, grade:gradeFromScore(learningScore), stability, consistency:round(consistency,1), edgeScore:round(edge,1), regime, positiveYears, totalYears, iqsPreview, recommendedAction:action, bestPattern:signature, explain:`V30, farklı zaman ufuklarını birlikte ölçerek sinyalin istikrarını ${stability}/100 ve öğrenme skorunu ${learningScore}/100 hesapladı.`};
}
function buildLearningComment(summary, yearly, topRules, weakRules, topCombos, h5, h20, v30=null){
  const years=Object.keys(yearly).sort(); const best=topRules[0], weak=weakRules[0], combo=topCombos[0];
  let txt=`V30 AI Learning Engine, geçmiş sinyalleri ${years.join(', ')} yıllarına göre değerlendirdi. ${summary.avgHoldingDays||summary.count} işlem gününe kadar ana başarı oranı %${summary.successRate}, ortalama getiri %${summary.avgReturn}, maksimum düşüş %${summary.maxDrawdown}.`;
  txt+=` 5 günlük başarı %${h5.successRate}, 20 günlük başarı %${h20.successRate}.`;
  txt+=` Güven düzeltmesi: ${summary.confidenceAdjustment>=0?'+':''}${summary.confidenceAdjustment} puan. ${summary.confidenceLabel}`;
  if(combo) txt+=` En iyi çalışan kombinasyon: ${combo.name} (${combo.count} örnek, başarı %${combo.successRate}, ort. getiri %${combo.avgReturn}, max düşüş %${combo.maxDrawdown}).`;
  if(best) txt+=` En güçlü tek kural: ${best.name} (%${best.successRate}, ort. getiri %${best.avgReturn}).`;
  if(weak) txt+=` Zayıf kural: ${weak.name} (%${weak.successRate}). Bu kural tek başına kullanılmamalı.`;
  if(v30) txt+=` V30 öğrenme skoru ${v30.learningScore}/100 (${v30.grade}). ${v30.recommendedAction}`;
  return txt;
}
