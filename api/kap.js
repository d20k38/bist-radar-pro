import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeNewsImpact } from '../lib/news-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readLocalNews(){
  try{
    const p = join(__dirname, '../data/kap-news.json');
    return JSON.parse(readFileSync(p,'utf8'));
  }catch(e){
    return [];
  }
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol = String(req.query.symbol||'').toUpperCase().trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit||10), 30));
    const all = readLocalNews();
    const filtered = symbol
      ? all.filter(x => String(x.symbol||'').toUpperCase()===symbol || String(x.symbol||'').toUpperCase()==='GENEL')
      : all;
    const latest = filtered.slice(0,limit);
    const impact = analyzeNewsImpact(latest, symbol || 'GENEL');
    res.status(200).json({
      success:true,
      source:'KAP/Haber altyapısı - güvenli yerel veri + AI etki analizi',
      live:false,
      note:'Bu sürüm canlı KAP kazıma yapmaz; KAP/Haber verisi data/kap-news.json üzerinden okunur. Canlı kaynak bağlanınca aynı API sözleşmesi korunur.',
      ...impact
    });
  }catch(e){
    res.status(200).json({success:false,error:e.message,items:[],count:0,avgImpact:50});
  }
}
