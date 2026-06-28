const { master } = require('./lib/unified-provider');
async function dip(s){
  try{ const m=await master(s,{period:'1y'}); const ind=m.indicators||{}; const dipScore = Math.max(0, Math.min(100, 100-(ind.dipDistance||0)*3)); return {success:true,symbol:s,price:m.price,last:m.price,dipScore,score:dipScore,strongestDip:ind.low250,dipDistance:ind.dipDistance,decision:m.decision,aiScore:m.score,rvol:ind.rvol20, vwap:ind.vwap, cmf:ind.cmf, mfi:ind.mfi}; }
  catch(e){return {success:false,symbol:s,error:e.message||String(e)}}
}
module.exports = async function handler(req,res){
  const symbols=String(req.query.symbols||req.query.symbol||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean).slice(0,20);
  if(!symbols.length) return res.status(400).json({success:false,error:'symbol gerekli'});
  const results=await Promise.all(symbols.map(dip));
  if(symbols.length===1 && !req.query.symbols) return res.status(200).json(results[0]);
  res.status(200).json({success:true,results,data:results.filter(x=>x.success)});
};
