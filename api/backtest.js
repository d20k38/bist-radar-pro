import { backtest } from './engine.js';
export default function handler(req,res){
  const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const period=Math.max(5, Math.min(120, Number(req.query.period||30)));
  res.status(200).json({success:true, data:backtest(symbol,period)});
}
