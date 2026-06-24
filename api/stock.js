import { getOhlcv } from '../lib/data-provider.js';
import { analyze, comments } from '../lib/analysis.js';
export default async function handler(req,res){
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  try{
    const rows = await getOhlcv(symbol, '1y', '1d');
    const a = analyze(rows);
    res.status(200).json({success:true,symbol,analysis:a,comments:comments(symbol,a),ohlcv:rows});
  }catch(e){res.status(200).json({success:false,symbol,error:e.message,analysis:null,comments:null,ohlcv:[]});}
}
