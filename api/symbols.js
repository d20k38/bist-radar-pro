const { SYMBOLS } = require('./lib/unified-provider');
module.exports = async function handler(req,res){
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit || SYMBOLS.length)));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const slice = SYMBOLS.slice(offset, offset+limit);
  res.setHeader('Cache-Control','s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({ success:true, total:SYMBOLS.length, offset, limit, symbols:slice });
};
