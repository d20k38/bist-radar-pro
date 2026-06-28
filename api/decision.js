import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSymbols } from '../lib/provider.js';
import { getCoreAnalysis, getCoreMeta } from '../lib/core-engine.js';
import { buildDecisionPayload } from '../lib/ai-decision-engine.js';
import { buildExplainableAI } from '../lib/explainable-ai-engine.js';
import { analyzeFinancialAI } from '../lib/financial-ai-engine.js';
import { buildMasterStockObject, cleanSymbol, normalizeUniverse } from '../lib/data-layer.js';
import { buildDecisionFromMaster, decisionToRow, summarizeDecisions } from '../lib/decision-layer.js';

const __filename=fileURLToPath(import.meta.url); const __dirname=dirname(__filename);
function readJson(p,fallback){try{return JSON.parse(readFileSync(p,'utf8'))}catch(e){return fallback}}
function normKap(x={}){const d=x.basic||x||{};return {date:d.date||d.publishDate||d.disclosureDate||'',symbol:String(d.symbol||d.stockCodes||d.stockCode||d.relatedStocks||'').toUpperCase(),title:String(d.title||d.subject||d.summary||''),summary:String(d.summary||d.subject||d.title||''),category:String(d.category||d.disclosureType||d.disclosureClass||'')}}
function filterKap(items,sym){return (items||[]).map(normKap).filter(x=>{const ss=String(x.symbol||'').toUpperCase();const txt=[x.title,x.summary,x.category].join(' ').toUpperCase();return !sym||ss===sym||ss.split(',').includes(sym)||txt.includes(sym);});}
function findFinancialData(sym){const arr=readJson(join(__dirname,'../data/financials.json'),[]); if(Array.isArray(arr)) return arr.find(x=>cleanSymbol(x.symbol)===sym)||null; if(arr&&typeof arr==='object') return arr[sym]||arr[sym+'.IS']||null; return null;}
function applyFinancialToExplainable(x,financialAI){
  if(!x||!financialAI) return x;
  const score=Number(financialAI.score||50);
  const contribution=Number(((score-50)/50*9).toFixed(2));
  const layer={key:'financial',label:'Financial AI',value:Math.max(0,Math.min(100,Math.round(score))),weight:9,contribution,status:score>=70?'green':score>=45?'yellow':'red',impact:score>=70?'Pozitif':score>=45?'Nötr':'Negatif',explain:`${financialAI.source||'Financial AI'} • ${financialAI.polarity||'Nötr'} • Skor ${Math.round(score)}/100.`};
  const layers=Array.isArray(x.layers)?x.layers:[];
  const idx=layers.findIndex(l=>l.key==='financial');
  if(idx>=0) layers[idx]=layer; else layers.push(layer);
  x.layers=layers.sort((a,b)=>(b.weight||0)-(a.weight||0));
  x.financialAI=financialAI;
  const reason=`Financial AI: ${financialAI.polarity||'Nötr'} / ${Math.round(score)}/100`;
  if(score>=66) x.positives=[reason,...(x.positives||[])];
  else if(score<=44) x.negatives=[reason,...(x.negatives||[])];
  x.trace=[...(x.trace||[]),`Financial AI katmanı eklendi: katkı ${contribution>0?'+':''}${contribution} puan.`];
  x.shortComment=(x.shortComment||'')+' Financial AI yorumu: '+(financialAI.comment||'');
  x.traffic={green:x.layers.filter(l=>l.status==='green').length,yellow:x.layers.filter(l=>l.status==='yellow').length,red:x.layers.filter(l=>l.status==='red').length};
  return x;
}
async function buildOne(symbol, withExplain=false){
  const sym=cleanSymbol(symbol);
  const core=await getCoreAnalysis(sym,{range:'1y',includeV19:true});
  const kapItems=filterKap(readJson(join(__dirname,'../data/kap-news.json'),[]),sym);
  const financialData=findFinancialData(sym);
  const financialAI=analyzeFinancialAI({symbol:sym,core,financialData,kapItems});
  const master=buildMasterStockObject(core,{symbol:sym,financialScore:financialAI?.score});
  const r2Decision=buildDecisionFromMaster(master);
  const row=decisionToRow(r2Decision);
  if(!withExplain) return {master,r2Decision,row,core};
  const decision=buildDecisionPayload(core.symbol,core.analysis);
  let explainable=buildExplainableAI(core.symbol,core,decision);
  explainable=applyFinancialToExplainable(explainable,financialAI);
  return {master,r2Decision,row,core,decision,explainable,financialAI};
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const requestedSymbol=cleanSymbol(req.query.symbol||'');
    if(requestedSymbol){
      const r=await buildOne(requestedSymbol,true);
      return res.status(200).json({success:true,schema:'R2_DECISION_SINGLE',symbol:r.master.symbol,master:r.master,r2Decision:r.r2Decision,row:r.row,decision:r.decision,explainable:r.explainable,financialAI:r.financialAI,analysis:r.core.analysis,dayTrading:r.core.dayTrading,institutional:r.core.institutional,quality:r.core.quality,core:r.core.meta});
    }
    const all=normalizeUniverse(await getSymbols());
    const offset=Math.max(0,Number(req.query.offset||0));
    const limit=Math.max(1,Math.min(Number(req.query.limit||4),6));
    const symbols=all.slice(offset,offset+limit);
    const masters=[]; const decisions=[]; const data=[]; const errors=[];
    const jobs=symbols.map(async symbol=>{
      try{const r=await buildOne(symbol,false); return {symbol,ok:true,...r};}
      catch(e){return {symbol,ok:false,error:e.message};}
    });
    const results=await Promise.allSettled(jobs);
    for(const rr of results){
      const r=rr.status==='fulfilled'?rr.value:{symbol:'?',ok:false,error:rr.reason?.message||String(rr.reason)};
      if(r.ok){masters.push(r.master); decisions.push(r.r2Decision); data.push(r.row);}
      else {errors.push({symbol:r.symbol,error:r.error});}
    }
    data.sort((a,b)=>(b.finalScore||0)-(a.finalScore||0));
    const summary=summarizeDecisions(decisions);
    return res.status(200).json({success:true,schema:'R2_DECISION_BATCH',count:data.length,total:all.length,offset,limit,nextOffset:offset+symbols.length,done:offset+symbols.length>=all.length,data,masters,decisions,summary,errors,core:getCoreMeta(),note:'R4: küçük parça + paralel karar hesaplama; Master Stock Object -> tek AI Final Decision kararı üretir.'});
  }catch(e){
    res.status(200).json({success:false,schema:'R2_DECISION',error:e.message,data:[],masters:[],decisions:[],count:0,total:0,done:true});
  }
}
