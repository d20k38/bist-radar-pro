import { analyze } from './engine.js';
export default function handler(req,res){
  const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace(/[^A-Z0-9]/g,'');
  res.status(200).json({success:true, data:analyze(symbol)});
}
