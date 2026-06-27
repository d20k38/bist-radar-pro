import {getOhlcv} from '../lib/provider.js';
import {analyze} from '../lib/engine.js';
import {buildDipPro,committee2} from '../lib/dip-pro-engine.js';
export default async function handler(req,res){try{const symbol=String(req.query.symbol||'PAPIL').toUpperCase();const rows=await getOhlcv(symbol,'1y','1d');const a=analyze(rows);const dip=buildDipPro(symbol,a);res.status(200).json({success:true,symbol,committee:committee2(symbol,a,dip),dip})}catch(e){res.status(200).json({success:false,error:e.message})}}
