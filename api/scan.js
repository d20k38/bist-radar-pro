import { getSymbols, getOhlcv } from '../lib/data-provider.js';
import { analyze } from '../lib/analysis.js';
export default async function handler(req,res){
  const limit = Math.min(Number(req.query.limit || 40), 120);
  const symbols = (await getSymbols()).slice(0, limit);
  const data=[];
  for(const symbol of symbols){
    try{ const rows=await getOhlcv(symbol,'1y','1d'); const a=analyze(rows); data.push({symbol,close:Number(a?.close)||0,change:Number(a?.change)||0,decision:a?.decision||'VERİ YOK',finalScore:Number(a?.finalScore)||0,confidence:Number(a?.confidence)||0,risk:Number(a?.risk)||100,trend:Number(a?.trend)||0,money:Number(a?.money)||0,momentum:Number(a?.momentum)||0,potential:Number(a?.potential)||0}); }
    catch(e){ data.push({symbol,error:e.message,change:0,finalScore:0,confidence:0,risk:100,decision:'VERİ YOK'}); }
  }
  data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
  res.status(200).json({success:true,count:data.length,data});
res.status(200).json({
  success: true,
  count: data.length,
  symbols,
  data
});
