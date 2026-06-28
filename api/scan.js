import { getSymbols } from '../lib/provider.js';
import { getCoreAnalysis, compactCoreResult, getCoreMeta } from '../lib/core-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all = await getSymbols();
    const offset = Math.max(0, Number(req.query.offset || 0));
    const requested = req.query.limit === 'all' ? 4 : Number(req.query.limit || 4);
    const limit = Math.max(1, Math.min(requested, 4));
    const symbols = all.slice(offset, offset + limit);
    const data = [];
    for(const symbol of symbols){
      try{
        const core = await getCoreAnalysis(symbol,{range:'1y'});
        const x=compactCoreResult(core);
        data.push({symbol:x.symbol,close:x.close,change:x.change,decision:x.decision,finalScore:x.finalScore,confidence:x.confidence,risk:x.risk,trend:x.trend,money:x.money,momentum:x.momentum,pattern:core.analysis.pattern||0,formation:x.formation,formationConfidence:Number(core.analysis?.formation?.confidence)||0,targetPct:Number(core.analysis?.formation?.targetPct)||0,multiLayer:core.analysis?.multiLayer||null,aiGeneral:Number(core.analysis?.multiLayer?.aiGeneral)||Number(x.finalScore)||0,quality:x.quality?.score||0});
      }catch(e){data.push({symbol,decision:'VERİ YOK',error:e.message,finalScore:0,confidence:0,risk:100,pattern:0,formation:'Veri yok',change:0});}
    }
    data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    res.status(200).json({success:true,count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data,core:getCoreMeta()});
  }catch(e){res.status(200).json({success:false,error:e.message,data:[],count:0,total:0,offset:0,done:true});}
}
