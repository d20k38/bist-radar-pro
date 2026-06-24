import { getOhlcv } from '../lib/data-provider.js';
import { analyze } from '../lib/analysis.js';
export default async function handler(req,res){
  const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
  const period=Math.max(5,Math.min(Number(req.query.period||30),90));
  try{
    const rows=await getOhlcv(symbol,'1y','1d');
    if(rows.length<period+80) throw new Error('Backtest için yeterli veri yok');
    const pastIndex=rows.length-period-1;
    const past=analyze(rows,pastIndex);
    const now=analyze(rows);
    const ret=((now.close-past.close)/past.close)*100;
    const expectedUp=['GÜÇLÜ AL','AL','İZLE'].includes(past.decision);
    const success= expectedUp ? ret>=0 : ret<=0;
    res.status(200).json({success:true,symbol,period,past:{date:past.date,decision:past.decision,price:past.close,score:past.finalScore,risk:past.risk},now:{date:now.date,price:now.close},returnPct:+ret.toFixed(2),result:success?'TUTARLI':'TUTARSIZ'});
  }catch(e){res.status(200).json({success:false,symbol,error:e.message});}
}
