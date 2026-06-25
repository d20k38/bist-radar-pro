import {getOhlcv} from '../lib/provider.js';
import {analyze} from '../lib/engine.js';

const UP_DECISIONS = ['GÜÇLÜ AL','AL'];
const WATCH_DECISIONS = ['İZLE'];
const DOWN_DECISIONS = ['BEKLE','RİSKLİ'];

function round(x,d=2){return Number.isFinite(Number(x))?+Number(x).toFixed(d):0}
function emptyBucket(){return {count:0,success:0,returns:[],drawdowns:[],holdingDays:[],riskRewards:[],successRate:0,avgReturn:0,avgDrawdown:0,avgHoldingDays:0,avgRiskReward:0}}
function expectedSuccess(decision, ret){
  if(UP_DECISIONS.includes(decision)) return ret > 0;
  if(WATCH_DECISIONS.includes(decision)) return ret > -3;
  if(DOWN_DECISIONS.includes(decision)) return ret <= 2;
  return false;
}
function daysBetween(a,b){
  const d1=new Date(a), d2=new Date(b);
  const diff=(d2-d1)/(1000*60*60*24);
  return Number.isFinite(diff)?Math.max(1,Math.round(diff)):0;
}
function maxDrawdownAfter(rows,startIndex,endIndex,entryPrice){
  const slice=rows.slice(startIndex+1,endIndex+1);
  if(!slice.length || !entryPrice) return 0;
  const minLow=Math.min(...slice.map(x=>Number(x.low)).filter(Number.isFinite));
  return round(((minLow-entryPrice)/entryPrice)*100,2);
}
function riskReward(past,futureReturn,drawdown){
  const risk=Math.abs(Number(drawdown)||0);
  const reward=Math.max(0,Number(futureReturn)||0);
  if(risk===0 && reward>0) return 9.99;
  if(risk===0) return 0;
  return round(reward/risk,2);
}
function finalizeBucket(b){
  b.successRate=b.count?round(b.success/b.count*100,1):0;
  b.avgReturn=b.returns.length?round(b.returns.reduce((s,x)=>s+x,0)/b.returns.length,2):0;
  b.avgDrawdown=b.drawdowns.length?round(b.drawdowns.reduce((s,x)=>s+x,0)/b.drawdowns.length,2):0;
  b.avgHoldingDays=b.holdingDays.length?round(b.holdingDays.reduce((s,x)=>s+x,0)/b.holdingDays.length,1):0;
  b.avgRiskReward=b.riskRewards.length?round(b.riskRewards.reduce((s,x)=>s+x,0)/b.riskRewards.length,2):0;
  delete b.returns; delete b.drawdowns; delete b.holdingDays; delete b.riskRewards;
  return b;
}
function calcStats(rows, period=30){
  const samples=[]; const byDecision={}; const byYear={};
  const start=Math.max(120, Math.floor(rows.length*0.05));
  const end=rows.length-period-1;
  const step=Math.max(3, Math.round(period/6));
  for(let i=start;i<=end;i+=step){
    try{
      const past=analyze(rows.slice(0,i+1));
      const future=rows[i+period];
      if(!future || !past.close) continue;
      const ret=((future.close-past.close)/past.close)*100;
      const dd=maxDrawdownAfter(rows,i,i+period,past.close);
      const hold=daysBetween(past.date,future.date) || period;
      const rr=riskReward(past,ret,dd);
      const success=expectedSuccess(past.decision,ret);
      const row={
        date:past.date,
        year:String(past.date||'').slice(0,4),
        decision:past.decision,
        price:round(past.close),
        futureDate:future.date,
        futurePrice:round(future.close),
        holdingDays:hold,
        returnPct:round(ret),
        maxDrawdownPct:dd,
        riskReward:rr,
        success,
        score:past.finalScore,
        risk:past.risk
      };
      samples.push(row);
      const d=past.decision||'BİLİNMİYOR';
      if(!byDecision[d]) byDecision[d]=emptyBucket();
      byDecision[d].count++; byDecision[d].success+=success?1:0; byDecision[d].returns.push(ret); byDecision[d].drawdowns.push(dd); byDecision[d].holdingDays.push(hold); byDecision[d].riskRewards.push(rr);
      const y=row.year||'Yıl yok';
      if(!byYear[y]) byYear[y]=emptyBucket();
      byYear[y].count++; byYear[y].success+=success?1:0; byYear[y].returns.push(ret); byYear[y].drawdowns.push(dd); byYear[y].holdingDays.push(hold); byYear[y].riskRewards.push(rr);
    }catch(e){/* ignore insufficient local slices */}
  }
  const returns=samples.map(x=>x.returnPct);
  const drawdowns=samples.map(x=>x.maxDrawdownPct);
  const holdings=samples.map(x=>x.holdingDays);
  const riskRewards=samples.map(x=>x.riskReward);
  const successCount=samples.filter(x=>x.success).length;
  for(const k of Object.keys(byDecision)) byDecision[k]=finalizeBucket(byDecision[k]);
  for(const k of Object.keys(byYear)) byYear[k]=finalizeBucket(byYear[k]);
  const avg=(a,d=2)=>a.length?round(a.reduce((s,x)=>s+x,0)/a.length,d):0;
  return {
    samples,
    byDecision,
    byYear,
    summary:{
      totalSignals:samples.length,
      successCount,
      successRate:samples.length?round(successCount/samples.length*100,1):0,
      avgReturn:avg(returns,2),
      avgHoldingDays:avg(holdings,1),
      maxDrawdown:drawdowns.length?round(Math.min(...drawdowns),2):0,
      avgDrawdown:avg(drawdowns,2),
      riskReward:avg(riskRewards,2),
      bestReturn:returns.length?round(Math.max(...returns),2):0,
      worstReturn:returns.length?round(Math.min(...returns),2):0,
      startDate:samples[0]?.date||null,
      endDate:samples[samples.length-1]?.futureDate||null
    }
  };
}
export default async function handler(req,res){
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const period=Math.max(5,Math.min(Number(req.query.period||30),120));
    const years=Math.max(3,Math.min(Number(req.query.years||10),10));
    let rows=[];
    try{ rows=await getOhlcv(symbol,years+'y','1d'); }
    catch(e){ rows=await getOhlcv(symbol,'5y','1d'); }
    if(rows.length<period+140) throw new Error('Backtest için yeterli veri yok');
    const stats=calcStats(rows,period);
    const past=analyze(rows.slice(0,rows.length-period));
    const now=analyze(rows);
    const ret=((now.close-past.close)/past.close)*100;
    const dd=maxDrawdownAfter(rows,rows.length-period-1,rows.length-1,past.close);
    res.status(200).json({
      success:true,
      symbol,
      period,
      years,
      past:{date:past.date,decision:past.decision,price:round(past.close),score:past.finalScore,risk:past.risk},
      now:{date:now.date,price:round(now.close),decision:now.decision,score:now.finalScore},
      returnPct:round(ret),
      maxDrawdownPct:dd,
      riskReward:riskReward(past,ret,dd),
      result:expectedSuccess(past.decision,ret)?'TUTARLI':'TUTARSIZ',
      summary:stats.summary,
      byDecision:stats.byDecision,
      byYear:stats.byYear,
      samples:stats.samples.slice(-80)
    });
  }catch(e){
    res.status(200).json({success:false,error:e.message});
  }
}
