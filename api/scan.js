import {getSymbols,getOhlcv} from '../lib/data-provider.js';
import {analyzeSymbol} from '../lib/ai-pro-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const offset=Math.max(0,Number(req.query.offset||0));
  const limit=Math.min(Math.max(1,Number(req.query.limit||4)),6);
  try{
    const all=await getSymbols();
    const slice=all.slice(offset, offset+limit);
    const data=[];
    for(const symbol of slice){
      try{ const rows=await getOhlcv(symbol,'2y','1d'); const a=await analyzeSymbol(symbol,rows); data.push({symbol,close:a.close,change:a.change,decision:a.decision,aiGeneral:a.aiGeneral,probability:a.probability,risk:a.risk,expectedReturn:a.expectedReturn,layers:a.layers,pattern:a.pattern?.name,backtest:a.backtest?.successRate}); }
      catch(e){ data.push({symbol,error:e.message,decision:'VERİ YOK',aiGeneral:0,risk:100}); }
    }
    data.sort((a,b)=>(b.aiGeneral||0)-(a.aiGeneral||0));
    res.status(200).json({success:true,offset,limit,total:all.length,count:data.length,data});
  }catch(e){ res.status(200).json({success:false,error:e.message,data:[]}); }
}
