const { SYMBOLS, master } = require('./lib/unified-provider');
async function one(s){ try{return await master(s,{period:'1y'});}catch(e){return {success:false,symbol:s,error:e.message||String(e)}} }
module.exports = async function handler(req,res){
  const offset = Math.max(0, Number(req.query.offset || 0));
  const limit = Math.max(1, Math.min(30, Number(req.query.limit || 12)));
  const explicit = String(req.query.symbols||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  const universe = explicit.length ? explicit : SYMBOLS.slice(offset, offset+limit);
  const results = await Promise.all(universe.slice(0,limit).map(one));
  const ok = results.filter(x=>x.success).sort((a,b)=>(b.score||0)-(a.score||0));
  res.status(200).json({success:true,total:SYMBOLS.length,offset,limit,done:offset+limit>=SYMBOLS.length,results:ok,data:ok,errors:results.filter(x=>!x.success)});
};
