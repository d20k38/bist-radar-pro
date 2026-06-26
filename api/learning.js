import { getOhlcv } from '../lib/provider.js';
import { learnFromHistory } from '../lib/learning-engine.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const period=Math.max(5,Math.min(Number(req.query.period||30),90));
    const rows=await getOhlcv(symbol,'5y','1d');
    const learning=learnFromHistory(rows,{period,step:10});
    res.status(200).json({success:true,symbol,learning});
  }catch(e){
    res.status(200).json({success:false,error:e.message});
  }
}
