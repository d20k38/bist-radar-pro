import { getOhlcv } from '../lib/provider.js';
import { analyzeV19Institutional } from '../lib/v19-institutional-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace('.IS','');
    const rows=await getOhlcv(symbol,'2y','1d');
    const analysis=analyzeV19Institutional(rows);
    res.status(200).json({success:true,symbol,analysis,random:false,source:'Yahoo OHLC + V19 Institutional Engine'});
  }catch(e){res.status(200).json({success:false,error:e.message,random:false});}
}
