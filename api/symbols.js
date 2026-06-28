import {getSymbols,getSymbolMeta} from '../lib/provider.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const all=await getSymbols();
  const page=Number(req.query.page||0);
  const limitRaw=req.query.limit;
  if(page>0 || limitRaw){
    const limit=Math.max(1,Math.min(Number(limitRaw||60),200));
    const offset=Math.max(0,(page>0?(page-1)*limit:Number(req.query.offset||0)));
    const symbols=all.slice(offset,offset+limit);
    return res.status(200).json({success:true,symbols,count:symbols.length,total:all.length,offset,limit,page:page||Math.floor(offset/limit)+1,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,meta:getSymbolMeta(),note:'R5 paginated symbols; default call still returns all symbols.'});
  }
  res.status(200).json({success:true,symbols:all,count:all.length,total:all.length,meta:getSymbolMeta()})
}
