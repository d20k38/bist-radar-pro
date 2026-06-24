import { getLiveQuote } from '../lib/data-provider.js';
export default async function handler(req,res){
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  try{
    const quote = await getLiveQuote(symbol);
    res.status(200).json({success:true, ...quote});
  }catch(e){
    res.status(200).json({success:false, symbol, error:e.message});
  }
}
