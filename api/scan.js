import { getSymbols, getOhlcv } from '../lib/provider.js';
import { analyze } from '../lib/engine.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all = await getSymbols();
    const offset = Math.max(0, Number(req.query.offset || 0));
    // Vercel timeout riskini azaltmak için tek istekte en fazla 4 hisse.
    const requested = req.query.limit === 'all' ? 4 : Number(req.query.limit || 4);
    const limit = Math.max(1, Math.min(requested, 4));
    const symbols = all.slice(offset, offset + limit);
    const data = [];

    for(const symbol of symbols){
      try{
        const rows = await getOhlcv(symbol,'1y','1d');
        const a = analyze(rows);
        data.push({
          symbol,
          close:Number(a?.close)||0,
          change:Number(a?.change)||0,
          decision:a?.decision||'VERİ YOK',
          finalScore:Number(a?.finalScore)||0,
          confidence:Number(a?.confidence)||0,
          risk:Number(a?.risk)||100,
          trend:Number(a?.trend)||0,
          money:Number(a?.money)||0,
          momentum:Number(a?.momentum)||0,
          pattern:Number(a?.pattern)||0,
          formation:a?.formation?.name||'Belirgin formasyon yok',
          formationConfidence:Number(a?.formation?.confidence)||0,
          targetPct:Number(a?.formation?.targetPct)||0,
          multiLayer:a?.multiLayer||null,
          aiGeneral:Number(a?.multiLayer?.aiGeneral)||Number(a?.finalScore)||0
        });
      }catch(e){
        data.push({symbol,decision:'VERİ YOK',error:e.message,finalScore:0,confidence:0,risk:100,pattern:0,formation:'Veri yok',change:0});
      }
    }
    data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    res.status(200).json({success:true,count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data});
  }catch(e){
    res.status(200).json({success:false,error:e.message,data:[],count:0,total:0,offset:0,done:true});
  }
}
