import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getSymbols } from '../lib/provider.js';
import { getMasterStockObject, getMasterStockObjects } from '../lib/master-stock-engine.js';
const __filename=fileURLToPath(import.meta.url); const __dirname=dirname(__filename);
function readJson(p,fallback){try{return JSON.parse(readFileSync(p,'utf8'))}catch(e){return fallback}}
function cleanSymbol(s){return String(s||'').toUpperCase().replace('.IS','').trim()}
function findFinancialData(sym){const arr=readJson(join(__dirname,'../data/financials.json'),[]); if(Array.isArray(arr)) return arr.find(x=>cleanSymbol(x.symbol)===sym)||null; if(arr&&typeof arr==='object') return arr[sym]||arr[sym+'.IS']||null; return null;}
function normKap(x={}){const d=x.basic||x||{};return {date:d.date||d.publishDate||d.disclosureDate||'',symbol:String(d.symbol||d.stockCodes||d.stockCode||d.relatedStocks||'').toUpperCase(),title:String(d.title||d.subject||d.summary||''),summary:String(d.summary||d.subject||d.title||''),category:String(d.category||d.disclosureType||d.disclosureClass||'')}}
function filterKap(items,sym){return (items||[]).map(normKap).filter(x=>{const ss=String(x.symbol||'').toUpperCase();const txt=[x.title,x.summary,x.category].join(' ').toUpperCase();return !sym||ss===sym||ss.split(',').includes(sym)||txt.includes(sym);});}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const range=req.query.range||'1y';
    const kapAll=readJson(join(__dirname,'../data/kap-news.json'),[]);
    const financialResolver=(sym)=>findFinancialData(sym);
    const common={range, financialResolver};
    const symbolsParam=String(req.query.symbols||'').trim();
    const mode=String(req.query.mode||'single');
    if(symbolsParam || mode==='batch' || mode==='list'){
      let symbols=symbolsParam ? symbolsParam.split(',').map(cleanSymbol).filter(Boolean) : [];
      if(!symbols.length){ const all=await getSymbols(); const offset=Math.max(0,Number(req.query.offset||0)); const limit=Math.max(1,Math.min(Number(req.query.limit||6),6)); symbols=all.slice(offset,offset+limit); }
      symbols=symbols.slice(0,6);
      const result=await getMasterStockObjects(symbols,{...common, kapItems:kapAll, concurrency:3});
      return res.status(200).json({success:true,mode:'batch',...result, data:result.rows, random:false});
    }
    const symbol=cleanSymbol(req.query.symbol||'PAPIL');
    const kapItems=filterKap(kapAll,symbol);
    const master=await getMasterStockObject(symbol,{...common, kapItems});
    return res.status(200).json({success:true,symbol:master.symbol,master,decision:master.raw.decision,explainable:master.raw.explainable,financialAI:master.raw.financialAI,analysis:master.raw.core,dayTrading:{score:master.dayTrading},institutional:{score:master.institutional,components:{kap:master.kap,backtest:master.backtest}},quality:{score:master.iqs},core:{source:'V33 Data Architecture',schemaVersion:master.schemaVersion,random:false}});
  }catch(e){return res.status(200).json({success:false,error:e.message,mode:req.query.mode||'single',data:[]});}
}
