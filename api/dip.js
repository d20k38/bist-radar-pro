import { getOhlcv } from '../lib/provider.js';
import { analyzeV19Institutional } from '../lib/v19-institutional-engine.js';

function legacyDipShape(a){
  return {
    ...a,
    dipScore: a.ai?.dipScore ?? 0,
    successProbability: a.ai?.successProbability ?? 0,
    fallingKnife: a.ai?.fallingKnife ?? 0,
    maturity: a.ai?.maturity ?? 0,
    duration: a.ai?.duration ?? '',
    decision: a.ai?.decision ?? '',
    catchBottom: a.ai?.reactionPower ?? 0,
    institutional: a.ai?.institutional ?? 0,
    random:false
  };
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace('.IS','');
    const rows=await getOhlcv(symbol,'2y','1d');
    const analysis=analyzeV19Institutional(rows);
    // analysis: V19.1 yeni şema, dip: V18 ekranlarını kırmayan geriye uyumlu şema.
    res.status(200).json({success:true,symbol,analysis,dip:legacyDipShape(analysis),random:false,source:'Yahoo OHLC + V19.1 Institutional Engine'});
  }catch(e){
    res.status(200).json({success:false,error:e.message,analysis:null,dip:null,random:false});
  }
}
