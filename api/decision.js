import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {getCoreAnalysis} from '../lib/core-engine.js';
import {buildDecisionPayload} from '../lib/ai-decision-engine.js';
import {buildExplainableAI} from '../lib/explainable-ai-engine.js';
import {analyzeFinancialAI} from '../lib/financial-ai-engine.js';
const __filename=fileURLToPath(import.meta.url); const __dirname=dirname(__filename);
function readJson(p,fallback){try{return JSON.parse(readFileSync(p,'utf8'))}catch(e){return fallback}}
function cleanSymbol(s){return String(s||'').toUpperCase().replace('.IS','').trim()}
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
export default async function handler(req,res){res.setHeader('Content-Type','application/json; charset=utf-8');try{const symbol=cleanSymbol(req.query.symbol||'PAPIL');const core=await getCoreAnalysis(symbol,{range:'1y',includeV19:true});const decision=buildDecisionPayload(core.symbol,core.analysis);let explainable=buildExplainableAI(core.symbol,core,decision);const financialData=findFinancialData(symbol);const kapItems=filterKap(readJson(join(__dirname,'../data/kap-news.json'),[]),symbol);const financialAI=analyzeFinancialAI({symbol,core,financialData,kapItems});explainable=applyFinancialToExplainable(explainable,financialAI);res.status(200).json({success:true,symbol:core.symbol,decision,explainable,financialAI,analysis:core.analysis,dayTrading:core.dayTrading,institutional:core.institutional,quality:core.quality,core:core.meta});}catch(e){res.status(200).json({success:false,error:e.message});}}
