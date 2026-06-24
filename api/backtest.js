import {getOhlcv} from '../lib/provider.js';
import {analyze} from '../lib/engine.js';

const UP_DECISIONS = ['GÜÇLÜ AL','AL'];
const WATCH_DECISIONS = ['İZLE'];
const DOWN_DECISIONS = ['BEKLE','RİSKLİ'];
function round(x,d=2){return Number.isFinite(Number(x))?+Number(x).toFixed(d):0}
function emptyBucket(){return {count:0,success:0,returns:[],successRate:0,avgReturn:0}}
function expectedSuccess(decision, ret){
  if(UP_DECISIONS.includes(decision)) return ret > 0;
  if(WATCH_DECISIONS.includes(decision)) return ret > -3;
  if(DOWN_DECISIONS.includes(decision)) return ret <= 2;
  return false;
}
function calcStats(rows, period=30){
  const samples=[]; const byDecision={};
  const start=120, end=rows.length-period-1;
  for(let i=start;i<=end;i+=5){
    try{
      const past=analyze(rows.slice(0,i+1));
      const future=rows[i+period];
      if(!future || !past.close) continue;
      const ret=((future.close-past.close)/past.close)*100;
      const success=expectedSuccess(past.decision,ret);
      const row={date:past.date,decision:past.decision,price:round(past.close),futureDate:future.date,futurePrice:round(future.close),returnPct:round(ret),success,score:past.finalScore,risk:past.risk};
      samples.push(row);
      if(!byDecision[past.decision]) byDecision[past.decision]=emptyBucket();
      byDecision[past.decision].count++;
      byDecision[past.decision].success+=success?1:0;
      byDecision[past.decision].returns.push(ret);
    }catch(e){/* ignore insufficient local slices */}
  }
  const returns=samples.map(x=>x.returnPct);
  const successCount=samples.filter(x=>x.success).length;
  for(const k of Object.keys(byDecision)){
    const b=byDecision[k];
    b.successRate=b.count?round(b.success/b.count*100,1):0;
    b.avgReturn=b.returns.length?round(b.returns.reduce((s,x)=>s+x,0)/b.returns.length,2):0;
    delete b.returns;
  }
  return {
    samples,
    byDecision,
    summary:{
      totalSignals:samples.length,
      successCount,
      successRate:samples.length?round(successCount/samples.length*100,1):0,
      avgReturn:returns.length?round(returns.reduce((s,x)=>s+x,0)/returns.length,2):0,
      bestReturn:returns.length?round(Math.max(...returns),2):0,
      worstReturn:returns.length?round(Math.min(...returns),2):0
    }
  };
}
export default async function handler(req,res){
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const period=Math.max(5,Math.min(Number(req.query.period||30),90));
    const rows=await getOhlcv(symbol,'5y','1d');
    if(rows.length<period+140) throw new Error('Backtest için yeterli veri yok');
    const stats=calcStats(rows,period);
    const past=analyze(rows.slice(0,rows.length-period));
    const now=analyze(rows);
    const ret=((now.close-past.close)/past.close)*100;
    res.status(200).json({
      success:true,
      symbol,
      period,
      past:{date:past.date,decision:past.decision,price:round(past.close),score:past.finalScore,risk:past.risk},
      now:{date:now.date,price:round(now.close),decision:now.decision,score:now.finalScore},
      returnPct:round(ret),
      result:expectedSuccess(past.decision,ret)?'TUTARLI':'TUTARSIZ',
      summary:stats.summary,
      byDecision:stats.byDecision,
      samples:stats.samples.slice(-60)
    });
  }catch(e){res.status(200).json({success:false,error:e.message});}
}
