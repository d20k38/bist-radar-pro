import { getSymbols } from '../lib/provider.js';
import { getCoreAnalysis, getCoreMeta } from '../lib/core-engine.js';
import { buildMasterStockObject, normalizeUniverse } from '../lib/data-layer.js';
import { buildDecisionFromMaster, decisionToRow, summarizeDecisions } from '../lib/decision-layer.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all = normalizeUniverse(await getSymbols());
    const offset = Math.max(0, Number(req.query.offset || 0));
    const requested = req.query.limit === 'all' ? 8 : Number(req.query.limit || 8);
    // R10.1: Vercel Hobby timeout riskini azaltmak için orta boy batch + sembol başına güvenli zaman aşımı.
    // Benchmark fetch taramada kapatılır; ayrıntılı tekil analizde tekrar kullanılabilir.
    const limit = Math.max(1, Math.min(requested, 10));
    const symbols = all.slice(offset, offset + limit);
    const masters=[]; const decisions=[]; const data=[]; const errors=[];
    const withTimeout = (promise, ms, symbol) => Promise.race([promise, new Promise((_,rej)=>setTimeout(()=>rej(new Error(symbol+' OHLC zaman aşımı')), ms))]);
    const jobs = symbols.map(async (symbol) => {
      try{
        const core = await withTimeout(getCoreAnalysis(symbol,{range:'1y',includeV19:true, benchmark:false}), 7600, symbol);
        const master = buildMasterStockObject(core,{symbol});
        const r2Decision = buildDecisionFromMaster(master);
        return {symbol, ok:true, master, r2Decision, row:decisionToRow(r2Decision)};
      }catch(e){
        return {symbol, ok:false, error:e.message, row:{symbol,decision:'VERİ YOK',error:e.message,finalScore:0,confidence:0,risk:100,quality:0,master:{success:false,symbol,error:e.message,schema:'R1_MASTER_STOCK_OBJECT'},r2Decision:{success:false,symbol,action:'VERİ YOK',score:0,confidence:0,risk:100}}};
      }
    });
    const results = await Promise.allSettled(jobs);
    for(const rr of results){
      const r = rr.status === 'fulfilled' ? rr.value : {symbol:'?', ok:false, error:rr.reason?.message||String(rr.reason), row:{symbol:'?',decision:'VERİ YOK',finalScore:0,confidence:0,risk:100}};
      if(r.ok){ masters.push(r.master); decisions.push(r.r2Decision); data.push(r.row); }
      else { errors.push({symbol:r.symbol,error:r.error}); data.push(r.row); }
    }
    data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    const summary=summarizeDecisions(decisions);
    res.status(200).json({success:true,schema:'R2_DECISION_SCAN',count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data,masters,decisions,summary,errors,core:getCoreMeta(),note:'R10.1: batch completion fix; başarısız semboller hata satırı olarak döner, tarama takılı kalmaz.'});
  }catch(e){
    res.status(200).json({success:false,error:e.message,data:[],masters:[],decisions:[],count:0,total:0,offset:0,done:true,schema:'R2_DECISION_SCAN'});
  }
}
