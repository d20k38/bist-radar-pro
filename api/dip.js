
import {getOhlcv} from '../lib/data-provider.js';import {analyzeDip} from '../lib/dip-engine.js';
export default async function handler(req,res){const symbol=String(req.query.symbol||'PAPIL').toUpperCase();try{const rows=await getOhlcv(symbol,280);const dip=analyzeDip(rows);res.status(200).json({success:true,symbol,dip,ohlcv:rows.slice(-120)});}catch(e){res.status(200).json({success:false,symbol,error:e.message});}}
