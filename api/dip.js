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

async function analyzeOne(symbol){
  const clean=String(symbol||'').toUpperCase().replace('.IS','').trim();
  const rows=await getOhlcv(clean,'2y','1d');
  const analysis=analyzeV19Institutional(rows);
  return {success:true,symbol:clean,analysis,dip:legacyDipShape(analysis),random:false,source:'Yahoo OHLC + V19.1 Institutional Engine'};
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    // R5: Aynı /api/dip endpoint'i küçük batch de destekler. Yeni API eklenmez.
    // Tarayıcı artık ilk 60 sembolde kalmadan tüm BIST evrenini 5-6'lı partilerle tarayabilir.
    const rawSymbols = String(req.query.symbols||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(rawSymbols.length){
      const maxBatch = Math.max(1, Math.min(Number(req.query.limit||6), 8));
      const symbols = rawSymbols.slice(0,maxBatch);
      const settled = await Promise.allSettled(symbols.map(analyzeOne));
      const data=[]; const errors=[];
      settled.forEach((r,i)=>{
        if(r.status==='fulfilled') data.push(r.value);
        else errors.push({symbol:symbols[i],error:r.reason?.message||String(r.reason)});
      });
      return res.status(200).json({success:true,batch:true,count:data.length,total:rawSymbols.length,data,errors,random:false,source:'R5 batch /api/dip + Yahoo OHLC'});
    }
    const symbol=String(req.query.symbol||'PAPIL').toUpperCase().replace('.IS','');
    const result=await analyzeOne(symbol);
    // analysis: V19.1 yeni şema, dip: V18 ekranlarını kırmayan geriye uyumlu şema.
    res.status(200).json(result);
  }catch(e){
    res.status(200).json({success:false,error:e.message,analysis:null,dip:null,random:false});
  }
}
