import { getSymbols, getOhlcv } from '../lib/provider.js';
import { analyze } from '../lib/engine.js';
export default async function handler(req,res){
  const all=await getSymbols();
  const limit=req.query.limit==='all'?all.length:Math.min(Number(req.query.limit||20),60);
  const offset=Number(req.query.offset||0);
  const symbols=all.slice(offset,offset+limit);
  const data=[];
  for(const symbol of symbols){
    try{
      const rows=await getOhlcv(symbol,'1y','1d');
      const a=analyze(rows);
      data.push({symbol,close:a.close,change:a.change,decision:a.decision,finalScore:a.finalScore,confidence:a.confidence,risk:a.risk,trend:a.trend,money:a.money,momentum:a.momentum,pattern:a.pattern,formation:a.formation?.name||'Belirgin formasyon yok',formationConfidence:a.formation?.confidence||0,targetPct:a.formation?.targetPct||0});
    }catch(e){data.push({symbol,decision:'VERİ YOK',error:e.message,finalScore:0,confidence:0,risk:100,pattern:0,formation:'Veri yok'});}
  }
  data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
  res.status(200).json({success:true,count:data.length,total:all.length,offset,data});
}
