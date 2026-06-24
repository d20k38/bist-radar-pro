import { getSymbols, getOhlcv } from '../lib/data-provider.js';
import { analyze } from '../lib/analysis.js';

async function mapLimit(items, limit, fn){
  const out = new Array(items.length);
  let idx = 0;
  async function worker(){
    while(idx < items.length){
      const current = idx++;
      out[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return out;
}

export default async function handler(req,res){
  const allSymbols = await getSymbols();
  const rawLimit = String(req.query.limit || 'all').toLowerCase();
  const limit = rawLimit === 'all' ? allSymbols.length : Math.min(Math.max(Number(rawLimit)||allSymbols.length,1), allSymbols.length);
  const symbols = allSymbols.slice(0, limit);
  const concurrency = Math.min(Math.max(Number(req.query.concurrency || 10), 1), 25);
  const data = await mapLimit(symbols, concurrency, async (symbol)=>{
    try{
      const rows = await getOhlcv(symbol,'1y','1d');
      const a = analyze(rows);
      return {symbol,close:Number(a?.close)||0,change:Number(a?.change)||0,decision:a?.decision||'VERİ YOK',finalScore:Number(a?.finalScore)||0,confidence:Number(a?.confidence)||0,risk:Number(a?.risk)||100,trend:Number(a?.trend)||0,money:Number(a?.money)||0,momentum:Number(a?.momentum)||0,potential:Number(a?.potential)||0,pattern:Number(a?.pattern)||0,safeScore:Number(a?.safeScore)||0,opportunityScore:Number(a?.opportunityScore)||0,riskReward:Number(a?.riskReward)||0,formation:a?.formation?.name||'',adx:Number(a?.adx)||0,pdi:Number(a?.pdi)||0,mdi:Number(a?.mdi)||0,superTrendDir:Number(a?.superTrendDir)||0};
    }catch(e){
      return {symbol,error:e.message,change:0,finalScore:0,confidence:0,risk:100,decision:'VERİ YOK'};
    }
  });
  const ok = data.filter(x=>!x.error);
  ok.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
  const errors = data.filter(x=>x.error);
  res.status(200).json({success:true,totalSymbols:allSymbols.length,requested:symbols.length,count:ok.length,errorCount:errors.length,data:ok,errors:errors.slice(0,25)});
}
