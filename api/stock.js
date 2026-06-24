import { fetchYahooHistory, analyze } from './lib/market.js';
import { normalizeSymbol } from './lib/symbols.js';
export default async function handler(req,res){
  try{
    const symbol=normalizeSymbol(req.query.symbol || 'PAPIL');
    const range=req.query.range || '1y';
    const interval=req.query.interval || '1d';
    const history=await fetchYahooHistory(symbol, range, interval);
    const result=analyze(symbol, history);
    res.status(200).json({success:true, source:'Yahoo Finance chart endpoint', range, interval, history, analysis:result});
  }catch(e){ res.status(500).json({success:false, error:e.message}); }
}
