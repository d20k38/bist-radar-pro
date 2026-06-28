import { getSymbols } from '../lib/provider.js';
import { getMasterStockObjects } from '../lib/master-stock-engine.js';
import { getCoreMeta } from '../lib/core-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all=await getSymbols();
    const offset=Math.max(0,Number(req.query.offset||0));
    const requested=req.query.limit==='all'?6:Number(req.query.limit||6);
    const limit=Math.max(1,Math.min(requested,6));
    const symbols=all.slice(offset,offset+limit);
    const result=await getMasterStockObjects(symbols,{range:req.query.range||'1y',concurrency:3});
    const data=result.rows.map(m=>({
      symbol:m.symbol, close:m.price, change:m.change, decision:m.decision,
      finalScore:m.aiFinal, confidence:m.confidencePct, risk:m.risk,
      trend:m.raw?.core?.trend||0, money:m.institutional, momentum:m.raw?.core?.momentum||0,
      pattern:m.dipScore, formation:m.raw?.core?.formation||'V33 Master',
      quality:m.iqs, dayTrading:m.dayTrading, swing:m.swing, position:m.position,
      institutional:m.institutional, kap:m.kap, financial:m.financial, backtest:m.backtest,
      master:m
    }));
    return res.status(200).json({success:true,count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data,errors:result.errors,core:{...getCoreMeta(),schemaVersion:'V33_MASTER_STOCK_OBJECT_LIST'}});
  }catch(e){return res.status(200).json({success:false,error:e.message,data:[],count:0,total:0,offset:0,done:true});}
}
