import { getSymbols } from '../lib/provider.js';
import { getCoreAnalysis, getCoreMeta } from '../lib/core-engine.js';
import { buildMasterStockObject, masterToLegacyRow, normalizeUniverse } from '../lib/data-layer.js';

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const all = normalizeUniverse(await getSymbols());
    const offset = Math.max(0, Number(req.query.offset || 0));
    const requested = req.query.limit === 'all' ? 4 : Number(req.query.limit || 4);
    const limit = Math.max(1, Math.min(requested, 4));
    const symbols = all.slice(offset, offset + limit);
    const masters=[]; const data=[]; const errors=[];
    for(const symbol of symbols){
      try{
        const core = await getCoreAnalysis(symbol,{range:'1y',includeV19:true});
        const master = buildMasterStockObject(core,{symbol});
        masters.push(master);
        data.push(masterToLegacyRow(master));
      }catch(e){
        errors.push({symbol,error:e.message});
        data.push({symbol,decision:'VERİ YOK',error:e.message,finalScore:0,confidence:0,risk:100,quality:0,master:{success:false,symbol,error:e.message,schema:'R1_MASTER_STOCK_OBJECT'}});
      }
    }
    data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    res.status(200).json({success:true,schema:'R1_DATA_LAYER_SCAN',count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data,masters,errors,core:getCoreMeta(),note:'R1: /api/scan legacy row + Master Stock Object birlikte döner.'});
  }catch(e){
    res.status(200).json({success:false,error:e.message,data:[],masters:[],count:0,total:0,offset:0,done:true,schema:'R1_DATA_LAYER_SCAN'});
  }
}
