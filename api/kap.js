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

function parseKapDate(v){
  const s = String(v || '').trim();
  if(!s) return new Date().toISOString().slice(0,10);
  // KAP list API can return DD.MM.YYYY HH:mm:ss, detail API can return YYYY.MM.DD HH:mm:ss
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s.slice(0,10) : d.toISOString().slice(0,10);
}

function cleanSymbol(v){
  const s = String(v || '').replace(/[;\s]+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '').toUpperCase();
  return s || 'GENEL';
}

function normDisclosure(x={}){
  // Current KAP live list usually returns { basic:{...} }; byCriteria returns fields at root.
  const d = x?.basic || x?.disclosure?.disclosureBasic || x?.disclosureBasic || x || {};
  const symbol = cleanSymbol(d.stockCodes || d.stockCode || d.relatedStocks || d.companyCode || d.memberCode || d.symbol || d.code || x.stockCodes || x.relatedStocks);
  const title = d.title || d.subject || d.summary || d.disclosureClass || d.disclosureType || x.title || x.subject || x.summary || '';
  const summary = d.summary || d.subject || d.title || x.summary || x.subject || x.title || '';
  const idx = d.disclosureIndex || d.disclosureId || d.id || x.disclosureIndex || x.id || x.disclosureId || '';
  const category = d.disclosureType || d.disclosureCategory || d.disclosureClass || x.disclosureType || x.disclosureClass || x.category || 'Bildirim';
  const company = d.companyName || d.companyTitle || d.kapTitle || x.kapTitle || '';
  return {
    date: parseKapDate(d.publishDate || d.disclosureDate || d.submissionDate || x.publishDate || x.date),
    symbol,
    source: 'KAP',
    company,
    category: String(category || 'Bildirim'),
    title: String(title || 'KAP bildirimi'),
    summary: String(summary || title || 'KAP bildirimi'),
    url: idx ? `https://www.kap.org.tr/tr/Bildirim/${idx}` : 'https://www.kap.org.tr/tr/'
  };
}

async function fetchJson(url, options={}, timeoutMs=8000){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0 BIST-Radar-Pro/25.1',
        'referer': 'https://www.kap.org.tr/tr/',
        ...(options.headers || {})
      }
    });
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  }finally{ clearTimeout(timer); }
}

function arrFromKapResponse(j){
  if(Array.isArray(j)) return j;
  if(Array.isArray(j?.data)) return j.data;
  if(Array.isArray(j?.disclosures)) return j.disclosures;
  if(Array.isArray(j?.result)) return j.result;
  return [];
}

function isoDateOffset(days){
  const d = new Date(Date.now() + days*86400000);
  return d.toISOString().slice(0,10);
}

async function fetchKapLive(limit=30){
  const errors = [];
  const endpoints = [
    async()=> fetchJson('https://www.kap.org.tr/tr/api/disclosures', {}, 8000),
    async()=> fetchJson('https://www.kap.org.tr/tr/api/disclosures?afterDisclosureIndex=0', {}, 8000),
    async()=> fetchJson('https://www.kap.org.tr/tr/api/disclosure/members/byCriteria', {
      method:'POST',
      headers:{'content-type':'application/json','referer':'https://www.kap.org.tr/tr/bildirim-sorgu'},
      body: JSON.stringify({fromDate: isoDateOffset(-15), toDate: isoDateOffset(0), mkkMemberOidList: [], subjectList: []})
    }, 9000)
  ];

  for(const call of endpoints){
    try{
      const j = await call();
      const arr = arrFromKapResponse(j);
      const out = arr.map(normDisclosure).filter(x => x.title || x.summary).slice(0, limit);
      if(out.length) return out;
    }catch(e){ errors.push(e.message); }
  }
  throw new Error('KAP canlı bağlantı kurulamadı: ' + errors.join(' | '));
}

function filterNews(all, symbol){
  if(!symbol) return all;
  const s = String(symbol).toUpperCase().trim();
  return all.filter(x => {
    const xs = String(x.symbol||'').toUpperCase();
    const txt = [x.title,x.summary,x.company].join(' ').toUpperCase();
    return xs === s || xs.split(',').includes(s) || txt.includes(s);
  });
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
    const symbol = String(req.query.symbol||'').toUpperCase().trim();
    const limit = Math.max(1, Math.min(Number(req.query.limit||30), 50));
    const engine = String(req.query.engine||'').toLowerCase();
    let live = false;
    let source = 'KAP canlı bağlantısı kurulamadı';
    let note = '';
    let all = [];
    try{
      all = await fetchKapLive(Math.max(limit, 30));
      live = all.length > 0;
      source = 'KAP canlı bildirim akışı';
      note = 'Veriler Vercel sunucu tarafı KAP proxy üzerinden okunmuştur; tarayıcı CORS engeline takılmaz.';
    }catch(e){
      all = readLocalNews().map(normDisclosure);
      note = e.message + '. Yerel arşiv boşsa haber listesi boş döner; demo/random haber kullanılmaz.';
      source = all.length ? 'Yerel gerçek KAP arşivi' : 'KAP bağlantısı yok / yerel arşiv boş';
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
      note,
      ...(engine==='v22' ? institutional : classic),
      institutional
    });
  }catch(e){
    res.status(200).json({success:false,error:e.message,items:[],count:0,avgImpact:50,institutionalScore:50,demoData:false,live:false});
  }
}
