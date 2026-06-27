import { analyzeDipPro, makeOhlcv } from '../lib/engine.js';
export default async function handler(req,res){const symbol=String(req.query.symbol||'PAPIL').toUpperCase();res.status(200).json({success:true,symbol,dip:analyzeDipPro(symbol),ohlcv:makeOhlcv(symbol)});}
