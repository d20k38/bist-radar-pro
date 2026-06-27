import { analyzeStock, makeOhlcv } from '../lib/engine.js';
export default async function handler(req,res){const symbol=String(req.query.symbol||'PAPIL').toUpperCase();res.status(200).json({success:true,symbol,analysis:analyzeStock(symbol),ohlcv:makeOhlcv(symbol)});}
