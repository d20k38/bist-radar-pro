import {getOhlcv} from '../lib/data-provider.js';
import {analyzeSymbol} from '../lib/ai-pro-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace(/[^A-Z0-9]/g,'');
  try{
    const rows=await getOhlcv(symbol, req.query.range||'2y', req.query.interval||'1d');
    const analysis=await analyzeSymbol(symbol, rows);
    res.status(200).json({success:true,analysis});
  }catch(e){
    res.status(200).json({success:false,symbol,error:e.message});
  }
}
