
import {getOhlcv} from '../lib/provider.js';
import {analyzeDip} from '../lib/dip-engine.js';
export default async function handler(req,res){
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const rows=await getOhlcv(symbol,'1y','1d');
    const dip=analyzeDip(rows);
    res.status(200).json({success:true,symbol,dip,ohlcv:rows.slice(-120)});
  }catch(e){res.status(200).json({success:false,error:e.message})}
}
