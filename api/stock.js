import { getOhlcv, getLiveQuote } from '../lib/data-provider.js';
import { analyze, comments } from '../lib/analysis.js';
export default async function handler(req,res){
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  try{
    const rows = await getOhlcv(symbol, '1y', '1d');
    const a = analyze(rows);
    let liveQuote = null;
    try{ liveQuote = await getLiveQuote(symbol); }catch{}
    if(liveQuote && Number.isFinite(Number(liveQuote.price))){
      a.livePrice = Number(liveQuote.price);
      a.liveChange = Number.isFinite(Number(liveQuote.change)) ? Number(liveQuote.change) : (a.close ? ((Number(liveQuote.price)-a.close)/a.close)*100 : a.change);
      a.liveSource = liveQuote.source;
      a.liveTime = liveQuote.time;
      a.yahooClose = a.close;
      a.priceDiffPct = a.close ? ((Number(liveQuote.price)-a.close)/a.close)*100 : 0;
    }
    res.status(200).json({success:true,symbol,analysis:a,comments:comments(symbol,a),quote:liveQuote,ohlcv:rows});
  }catch(e){res.status(200).json({success:false,symbol,error:e.message,analysis:null,comments:null,ohlcv:[]});}
}
