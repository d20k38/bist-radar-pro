
import { getOhlcv } from '../lib/provider.js';
import { analyzeProfessionalDip } from '../lib/dip-professional-engine.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace('.IS','');
    const range=String(req.query.range||'2y');
    const rows=await getOhlcv(symbol,range,'1d');
    const dip=analyzeProfessionalDip(rows);
    res.status(200).json({success:true, symbol, source:'real-ohlcv-yahoo', random:false, dip, ohlcv:rows.slice(-160)});
  }catch(e){
    res.status(200).json({success:false, error:e.message, random:false});
  }
}
