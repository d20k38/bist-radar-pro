import { getOhlcv, getLiveQuote } from '../lib/data-provider.js';
import { analyze, comments } from '../lib/analysis.js';
export default async function handler(req,res){
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  try{
    const rows = await getOhlcv(symbol, '1y', '1d');
    const a = analyze(rows);
    let liveQuote = null;
    try{ liveQuote = await getLiveQuote(symbol); }catch{}
    // Mynet HTML parse bazen sayfadaki farklı bir fiyatı yakalayabilir.
    // Canlı fiyat teknik kapanışa aşırı uzaksa güvenli şekilde yok sayılır.
    if(liveQuote && Number.isFinite(Number(liveQuote.price))){
      const livePrice = Number(liveQuote.price);
      const diffPct = a.close ? ((livePrice-a.close)/a.close)*100 : 0;
      const plausible = a.close > 0 && Math.abs(diffPct) <= 35;
      if(plausible){
        a.livePrice = livePrice;
        a.liveChange = Number.isFinite(Number(liveQuote.change)) ? Number(liveQuote.change) : (a.close ? diffPct : a.change);
        a.liveSource = liveQuote.source;
        a.liveTime = liveQuote.time;
        a.yahooClose = a.close;
        a.priceDiffPct = diffPct;
        a.quoteWarning = '';
      }else{
        a.livePrice = a.close;
        a.liveChange = a.change;
        a.liveSource = 'Yahoo Finance kapanış';
        a.liveTime = new Date().toISOString();
        a.yahooClose = a.close;
        a.priceDiffPct = 0;
        a.quoteWarning = `Mynet fiyatı tutarsız göründüğü için kullanılmadı: ${livePrice}`;
        liveQuote.warning = a.quoteWarning;
      }
    }
    res.status(200).json({success:true,symbol,analysis:a,comments:comments(symbol,a),quote:liveQuote,ohlcv:rows});
  }catch(e){res.status(200).json({success:false,symbol,error:e.message,analysis:null,comments:null,ohlcv:[]});}
}
