import { BIST_SYMBOLS, normalizeSymbol } from './lib/symbols.js';
import { fetchYahooHistory, analyze } from './lib/market.js';
async function one(symbol){ try{ const h=await fetchYahooHistory(symbol,'1y','1d'); return analyze(symbol,h); }catch(e){ return {symbol, error:e.message, aiScore:0, risk:100, decision:'VERİ YOK'}; } }
export default async function handler(req,res){
  try{
    const q=(req.query.symbols||'').toString().trim();
    let list=q ? q.split(',').map(normalizeSymbol).filter(Boolean) : BIST_SYMBOLS;
    const limit=Math.min(Number(req.query.limit || list.length), Number(req.query.max || 180));
    list=list.slice(0, limit);
    const results=[]; const batch=Number(req.query.batch || 8);
    for(let i=0;i<list.length;i+=batch){
      const part=await Promise.all(list.slice(i,i+batch).map(one)); results.push(...part);
    }
    const ok=results.filter(x=>!x.error).sort((a,b)=>b.aiScore-a.aiScore);
    res.status(200).json({success:true, source:'Yahoo Finance chart endpoint', count:ok.length, failed:results.length-ok.length, data:ok, errors:results.filter(x=>x.error).slice(0,20)});
  }catch(e){ res.status(500).json({success:false,error:e.message}); }
}
