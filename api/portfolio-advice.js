import {getOhlcv} from '../lib/data-provider.js';
import {analyzeSymbol} from '../lib/ai-pro-engine.js';
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const symbols=String(req.query.symbols||'MRSHL,PAPIL,TEZOL,USAK,VKING').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
  const data=[];
  for(const symbol of symbols){try{const rows=await getOhlcv(symbol,'2y','1d'); const a=await analyzeSymbol(symbol,rows); data.push({symbol,decision:a.decision,aiGeneral:a.aiGeneral,risk:a.risk,probability:a.probability,expectedReturn:a.expectedReturn,stop:a.stop,target:a.target,comment:a.aiComment});}catch(e){data.push({symbol,error:e.message});}}
  const health=Math.round(data.filter(x=>x.aiGeneral).reduce((s,x)=>s+x.aiGeneral-(x.risk||0)*.25,0)/Math.max(1,data.filter(x=>x.aiGeneral).length));
  const strongest=[...data].filter(x=>x.aiGeneral).sort((a,b)=>b.aiGeneral-a.aiGeneral)[0];
  const weakest=[...data].filter(x=>x.aiGeneral).sort((a,b)=>a.aiGeneral-b.aiGeneral)[0];
  res.status(200).json({success:true,health,summary:`Portföy sağlık skoru ${health}/100. En güçlü görünüm ${strongest?.symbol||'-'}, en zayıf görünüm ${weakest?.symbol||'-'}.`,data});
}
