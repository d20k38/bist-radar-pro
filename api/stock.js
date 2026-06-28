const { master } = require('./lib/unified-provider');
module.exports = async function handler(req,res){
  try{
    const symbol = String(req.query.symbol||'').toUpperCase().trim();
    if(!symbol) return res.status(400).json({success:false,error:'symbol gerekli'});
    const period = req.query.range || req.query.period || '1y';
    const m = await master(symbol,{period});
    res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ ...m, rows:m.ohlcv });
  }catch(e){ res.status(200).json({success:false,error:e.message||String(e),provider:'R12 unified'}); }
};
