import { getSymbols, getOhlcv } from '../lib/provider.js';
import { analyzeV19Institutional } from '../lib/v19-institutional-engine.js';
import { analyzeDayTrading } from '../lib/day-trading-engine.js';
import { analyzeInstitutionalScanner } from '../lib/institutional-scanner-engine.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all = await getSymbols();
    const offset = Math.max(0, Number(req.query.offset || 0));
    const requested = req.query.limit === 'all' ? 3 : Number(req.query.limit || 3);
    const limit = Math.max(1, Math.min(requested, 3));
    const symbols = all.slice(offset, offset + limit);
    let benchmarkRows = [];
    try{ benchmarkRows = await getOhlcv('XU100','1y','1d'); }catch(e){}
    const data = [];
    for(const symbol of symbols){
      try{
        const rows = await getOhlcv(symbol,'2y','1d');
        const analysis = analyzeV19Institutional(rows);
        const dayTrading = analyzeDayTrading(rows, benchmarkRows);
        const merged = { symbol, ...analysis, dayTrading, ok:true };
        merged.institutionalScanner = analyzeInstitutionalScanner(merged);
        data.push(merged);
      }catch(e){ data.push({ symbol, ok:false, error:e.message }); }
    }
    const ok = data.filter(x=>x.ok).sort((a,b)=>(b.institutionalScanner?.score||0)-(a.institutionalScanner?.score||0));
    res.status(200).json({ success:true, count:ok.length, attempted:data.length, total:all.length, offset, limit, nextOffset:offset+symbols.length, done:offset+symbols.length>=all.length, data:ok, errors:data.filter(x=>!x.ok) });
  }catch(e){ res.status(200).json({ success:false, error:e.message, data:[], count:0, total:0, offset:0, done:true }); }
}
