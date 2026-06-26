
import { getOhlcv } from '../lib/provider.js';
import { analyze } from '../lib/engine.js';
import { learnFromHistory } from '../lib/learning-engine.js';
import { buildInvestmentCommittee } from '../lib/committee-engine.js';
import { analyzeNewsImpact } from '../lib/news-engine.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename=fileURLToPath(import.meta.url); const __dirname=dirname(__filename);
function loadKap(symbol){
  try{
    const txt=readFileSync(join(__dirname,'../data/kap-news.json'),'utf8');
    const all=JSON.parse(txt);
    const items=(Array.isArray(all)?all:[]).filter(x=>!symbol || !x.symbol || String(x.symbol).toUpperCase()===symbol);
    return analyzeNewsImpact(items.slice(0,12), symbol);
  }catch(e){return analyzeNewsImpact([], symbol)}
}
export default async function handler(req,res){
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace('.IS','');
    const rows=await getOhlcv(symbol,'5y','1d').catch(()=>getOhlcv(symbol,'2y','1d'));
    const analysis=analyze(rows);
    let learning=null;
    try{learning=learnFromHistory(rows,{period:30,step:10,start:220});}catch(e){learning={summary:{successRate:50},confidenceAdjustment:0,comment:'Yeterli öğrenme verisi yok.'};}
    const kap=loadKap(symbol);
    const committee=buildInvestmentCommittee({symbol,analysis,learning,kap});
    res.status(200).json({success:true,symbol,committee,analysis,learning,kap});
  }catch(e){res.status(200).json({success:false,error:e.message});}
}
