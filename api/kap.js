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

async function fetchJson(url, options={}, timeoutMs=2800){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(new Error('KAP istek zaman aşımı')), timeoutMs);
  try{
    const r = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0 BIST-Radar-Pro/25.2',
        'referer': 'https://www.kap.org.tr/tr/',
        ...(options.headers || {})
      }
    });
    const txt = await r.text();
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    try{ return JSON.parse(txt); }
    catch(e){ throw new Error('KAP JSON döndürmedi'); }
  }finally{ clearTimeout(timer); }
}

function arrFromKapResponse(j){
  if(Array.isArray(j)) return j;
  if(Array.isArray(j?.data)) return j.data;
  if(Array.isArray(j?.disclosures)) return j.disclosures;
  if(Array.isArray(j?.result)) return j.result;
  if(Array.isArray(j?.items)) return j.items;
  return [];
}

function isoDateOffset(days){
  const d = new Date(Date.now() + days*86400000);
  return d.toISOString().slice(0,10);
}

function getKapCache(){
  const g = globalThis;
  if(!g.__BIST_RADAR_KAP_CACHE__) g.__BIST_RADAR_KAP_CACHE__ = {ts:0, items:[], error:''};
  return g.__BIST_RADAR_KAP_CACHE__;
}

async function tryFetchKapByCriteria(limit){
  const j = await fetchJson('https://www.kap.org.tr/tr/api/disclosure/members/byCriteria', {
    method:'POST',
    headers:{'content-type':'application/json','referer':'https://www.kap.org.tr/tr/bildirim-sorgu'},
    body: JSON.stringify({
      fromDate: isoDateOffset(-7),
      toDate: isoDateOffset(0),
      mkkMemberOidList: [],
      subjectList: [],
      disclosureClass: '',
      index: '',
      market: '',
      sector: ''
    })
  }, 3000);
  return arrFromKapResponse(j).map(normDisclosure).filter(x => x.title || x.summary).slice(0, limit);
}

async function tryFetchKapLatest(limit){
  const j = await fetchJson('https://www.kap.org.tr/tr/api/disclosures?afterDisclosureIndex=0', {}, 2500);
  return arrFromKapResponse(j).map(normDisclosure).filter(x => x.title || x.summary).slice(0, limit);
}

async function fetchKapLive(limit=20){
  const cache = getKapCache();
  const ttlMs = 5 * 60 * 1000;
  if(cache.items.length && Date.now() - cache.ts < ttlMs){
    return {items:cache.items.slice(0, limit), cached:true, error:cache.error||''};
  }

  const errors = [];
  const attempts = [tryFetchKapLatest, tryFetchKapByCriteria];
  for(const fn of attempts){
    try{
      const out = await fn(Math.max(limit, 20));
      if(out.length){
        cache.ts = Date.now();
        cache.items = out;
        cache.error = '';
        return {items:out.slice(0, limit), cached:false, error:''};
      }
      errors.push('KAP listesi boş döndü');
    }catch(e){
      errors.push(e?.name === 'AbortError' ? 'KAP istek zaman aşımı' : (e.message || String(e)));
    }
  }

  if(cache.items.length){
    cache.error = errors.join(' | ');
    return {items:cache.items.slice(0, limit), cached:true, error:cache.error};
  }
  return {items:[], cached:false, error:errors.join(' | ') || 'KAP canlı bağlantı kurulamadı'};
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
      const liveResult = await fetchKapLive(Math.max(limit, 20));
      all = liveResult.items || [];
      if(!all.length){
        all = readLocalNews().map(normDisclosure);
        live = false;
        source = all.length ? 'Yerel gerçek KAP arşivi' : 'KAP bağlantısı yok / yerel arşiv boş';
        note = (liveResult.error || 'KAP canlı bağlantı kurulamadı') + '. Yerel arşiv boşsa haber listesi boş döner; demo/random haber kullanılmaz.';
      }else{
        live = !liveResult.cached;
        source = liveResult.cached ? 'KAP önbellek bildirim akışı' : 'KAP canlı bildirim akışı';
        note = liveResult.error ? ('KAP canlı istek kısa zaman aşımına takıldı; önbellek/yerel arşiv kullanıldı. Ayrıntı: ' + liveResult.error) : 'Veriler Vercel sunucu tarafı KAP proxy üzerinden kısa zaman aşımı ve önbellek ile okunmuştur.';
      }
    }catch(e){
      all = readLocalNews().map(normDisclosure);
      note = (e.message || 'KAP canlı bağlantı kurulamadı') + '. Yerel arşiv boşsa haber listesi boş döner; demo/random haber kullanılmaz.';
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
