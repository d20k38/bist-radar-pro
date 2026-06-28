const { master } = require('./lib/unified-provider');
async function one(s){ try{return await master(s,{period:'1y'});}catch(e){return {success:false,symbol:s,error:e.message||String(e)}} }
module.exports = async function handler(req,res){
  const symbols = String(req.query.symbols || req.query.symbol || '').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  if(!symbols.length) return res.status(400).json({success:false,error:'symbol veya symbols gerekli'});
  const limited = symbols.slice(0, Math.min(20, Number(req.query.limit||20)));
  const results = await Promise.all(limited.map(one));
  if(symbols.length===1 && !req.query.symbols) return res.status(200).json(results[0]);
  res.status(200).json({success:true, count:results.filter(x=>x.success).length, total:limited.length, results, data:results});
};
