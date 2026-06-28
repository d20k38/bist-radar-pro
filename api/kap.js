import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeNewsImpact } from '../lib/news-engine.js';
import { analyzeCorporateNews } from '../lib/corporate-news-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readLocalNews(){
  try{
    const p = join(__dirname, '../data/kap-news.json');
    const arr = JSON.parse(readFileSync(p,'utf8'));
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}

function normDisclosure(x={}){
  const symbol = x.stockCodes || x.companyCode || x.memberCode || x.symbol || x.code || x.relatedStocks || '';
  const title = x.disclosureClass || x.disclosureType || x.subject || x.title || x.summary || '';
  const summary = x.summary || x.disclosureSummary || x.subject || x.title || '';
  const date = x.publishDate || x.disclosureDate || x.date || x.submissionDate || '';
  const idx = x.disclosureIndex || x.id || x.disclosureId || '';
  return {
    date: String(date).slice(0,10),
    symbol: String(symbol || 'GENEL').replace(/\s+/g,',').toUpperCase(),
    source: 'KAP',
    category: String(x.disclosureType || x.disclosureClass || x.category || 'Bildirim'),
    title: String(title || 'KAP bildirimi'),
    summary: String(summary || title || 'KAP bildirimi'),
    url: idx ? `https://www.kap.org.tr/tr/Bildirim/${idx}` : 'https://www.kap.org.tr/tr/'
  };
}

async function fetchKapLive(limit=30){
  const url = 'https://www.kap.org.tr/tr/api/disclosures';
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 6500);
  try{
    const r = await fetch(url, {headers:{'accept':'application/json','user-agent':'BIST-Radar-Pro/22'}, signal:controller.signal});
    if(!r.ok) throw new Error('KAP HTTP '+r.status);
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
    return arr.slice(0,limit).map(normDisclosure).filter(x=>x.title || x.summary);
  }finally{ clearTimeout(timer); }
}

function filterNews(all, symbol){
  if(!symbol) return all;
  const s = String(symbol).toUpperCase().trim();
  return all.filter(x => {
    const xs = String(x.symbol||'').toUpperCase();
    return xs === s || xs.includes(s) || xs === 'GENEL';
  });
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol = String(req.query.symbol||'').toUpperCase().trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit||30), 50));
    const engine = String(req.query.engine||'').toLowerCase();
    let live = false, source = 'KAP canlı bağlantı denendi; yerel gerçek veri arşivi kullanıldı';
    let all = [];
    try{
      all = await fetchKapLive(limit);
      live = all.length > 0;
      if(live) source = 'KAP canlı bildirim akışı';
    }catch(e){
      all = readLocalNews();
    }
    const latest = filterNews(all, symbol).slice(0,limit);
    const classic = analyzeNewsImpact(latest, symbol || 'GENEL');
    const institutional = analyzeCorporateNews(latest, symbol || 'GENEL');
    res.status(200).json({
      success:true,
      source,
      live,
      realData:true,
      demoData:false,
      note: live ? 'Veriler KAP canlı bildirim akışından okunmuştur.' : 'Canlı KAP bağlantısı yanıt vermezse yalnızca kullanıcı tarafından sağlanan gerçek yerel arşiv okunur; demo/random veri kullanılmaz.',
      ...(engine==='v22' ? institutional : classic),
      institutional
    });
  }catch(e){
    res.status(200).json({success:false,error:e.message,items:[],count:0,avgImpact:50,institutionalScore:50,demoData:false});
  }
}
