import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getOhlcv } from '../lib/provider.js';
import { analyze } from '../lib/engine.js';
import { analyzeNewsImpact } from '../lib/news-engine.js';
import { learnFromHistory } from '../lib/learning-engine.js';
import { buildLayeredConfidence } from '../lib/confidence-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
function localNews(symbol){
  try{
    const all=JSON.parse(readFileSync(join(__dirname,'../data/kap-news.json'),'utf8'));
    const s=String(symbol||'').toUpperCase();
    return all.filter(x=>String(x.symbol||'').toUpperCase()===s || String(x.symbol||'').toUpperCase()==='GENEL').slice(0,10);
  }catch(e){return []}
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase();
    const rows=await getOhlcv(symbol,'5y','1d');
    const analysis=analyze(rows);
    const news=analyzeNewsImpact(localNews(symbol), symbol);
    let learningScore=50, learning=null;
    try{
      learning=learnFromHistory(rows,{period:30,step:15});
      learningScore=learning?.summary?.successRate || 50;
    }catch(e){ learning={error:e.message, summary:{successRate:50}}; }
    const multiLayer=buildLayeredConfidence({analysis, kapImpact:news.avgImpact, learningScore});
    res.status(200).json({success:true,symbol,multiLayer,analysis:{decision:analysis.decision,finalScore:analysis.finalScore,risk:analysis.risk},news,learning:{summary:learning.summary||{},topRules:learning.topRules||[],weakRules:learning.weakRules||[]}});
  }catch(e){
    res.status(200).json({success:false,error:e.message});
  }
}
