import {getOhlcv} from '../lib/provider.js';
import {analyze} from '../lib/engine.js';
import {buildDecisionPayload} from '../lib/ai-decision-engine.js';
export default async function handler(req,res){
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const rows=await getOhlcv(symbol,'1y','1d');
    const analysis=analyze(rows);
    const decision=buildDecisionPayload(symbol,analysis);
    res.status(200).json({success:true,symbol,decision,analysis});
  }catch(e){
    res.status(200).json({success:false,error:e.message});
  }
}
