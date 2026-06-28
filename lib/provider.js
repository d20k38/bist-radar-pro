// V17+ provider: tek veri kapısı. Random/pseudo veri üretmez.
// Önce gerçek KAP/BIST sembol listesini dener; başarısız olursa paket içindeki son doğrulanmış symbols.json kullanılır.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedSymbols = null;
let cachedSymbolMeta = { source: 'not_loaded', dynamicCount: 0, localCount: 0, updatedAt: null };

function uniq(arr){ return [...new Set((arr||[]).map(x=>String(x||'').toUpperCase().replace(/\.IS$/,'').trim()).filter(x=>/^[A-Z]{2,6}[A-Z0-9]?$/.test(x)))].sort(); }
function localSymbols(){
  try{
    const p = join(__dirname, '../data/symbols.json');
    const arr = JSON.parse(readFileSync(p, 'utf8'));
    return uniq(Array.isArray(arr) ? arr : []);
  }catch(e){ return []; }
}
function emergencySymbols(){
  // Bunlar demo değildir; yalnızca symbols.json okunamazsa uygulamanın açılması için gerçek BIST kodlarından acil liste.
  return ['AEFES','AKSA','AKSEN','AKBNK','ALARK','ARCLK','ASELS','BIMAS','DOAS','EKGYO','EREGL','FROTO','GARAN','HEKTS','ISCTR','KCHOL','KOZAL','PETKM','PGSUS','SAHOL','SASA','SISE','TAVHL','TCELL','THYAO','TOASO','TUPRS','YKBNK','PAPIL','MRSHL','TEZOL','USAK','VKING'];
}
async function dynamicKapSymbols(){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 4500);
  try{
    const r = await fetch('https://www.kap.org.tr/tr/bist-sirketler', { signal: controller.signal, headers: {'user-agent':'Mozilla/5.0','accept':'text/html,*/*'} });
    if(!r.ok) throw new Error('KAP HTTP '+r.status);
    const html = await r.text();
    const found = uniq([...html.matchAll(/\b[A-Z]{3,6}[A-Z0-9]?\b/g)].map(m=>m[0]).filter(x=>!['KAP','BIST','HTTPS','HTML','JSON','XBRL','MKK','SPK','HTTP','ISTANBUL','ANKARA','IZMIR','BURSA','DENIZLI','KONYA','KAYSERI'].includes(x)));
    // KAP sayfası bazen çok fazla kurum kodu verir; Yahoo'da denenirken geçersizler zaten elenir.
    return found.length >= 500 ? found : [];
  }catch(e){ return []; }
  finally{ clearTimeout(timer); }
}

export async function getSymbols(){
  if(cachedSymbols) return cachedSymbols;
  const local = localSymbols();
  const dynamic = await dynamicKapSymbols();
  const best = dynamic.length > local.length ? dynamic : local;
  cachedSymbols = best.length ? best : emergencySymbols();
  cachedSymbolMeta = { source: dynamic.length > local.length ? 'KAP canlı BIST şirketleri' : (local.length ? 'data/symbols.json' : 'emergency_real_bist_list'), dynamicCount: dynamic.length, localCount: local.length, count: cachedSymbols.length, updatedAt: new Date().toISOString() };
  return cachedSymbols;
}
export function getSymbolMeta(){ return cachedSymbolMeta; }

export async function getOhlcv(symbol, range='1y', interval='1d'){
  const s = String(symbol||'').toUpperCase().replace('.IS','') + '.IS';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${range}&interval=${interval}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try{
    const r = await fetch(url, { signal: controller.signal, headers: { 'user-agent':'Mozilla/5.0', 'accept':'application/json,text/plain,*/*' } });
    if(!r.ok) throw new Error('Yahoo veri alınamadı: HTTP '+r.status);
    const text = await r.text();
    let j; try{ j = JSON.parse(text); } catch{ throw new Error('Yahoo JSON döndürmedi'); }
    const res = j.chart?.result?.[0];
    if(!res) throw new Error('OHLC veri yok');
    const q = res.indicators?.quote?.[0] || {};
    const ts = res.timestamp || [];
    return ts.map((t,i)=>({
      date:new Date(t*1000).toISOString().slice(0,10),
      open:q.open?.[i], high:q.high?.[i], low:q.low?.[i], close:q.close?.[i], volume:q.volume?.[i]||0
    })).filter(x=>Number.isFinite(x.open)&&Number.isFinite(x.close)&&Number.isFinite(x.high)&&Number.isFinite(x.low));
  }finally{ clearTimeout(timer); }
}
