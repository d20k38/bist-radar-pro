import fs from 'fs/promises';
import path from 'path';

const SYMBOLS_PATH = path.join(process.cwd(), 'data', 'symbols.json');
const MYNET_URL = 'https://finans.mynet.com/borsa/hisseler/';
let symbolsCache = null;
let symbolsCacheTime = 0;
const CACHE_MS = 1000 * 60 * 60 * 6;

function uniq(arr){
  return [...new Set(arr.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
}
function validSymbol(s){
  return /^[A-Z0-9]{3,8}$/.test(s) && !['BIST','USD','EUR','ALTIN','BITCOIN','HISSELER','HACIM','SAAT'].includes(s);
}
function normalizeSymbol(symbol='PAPIL'){
  return String(symbol).trim().toUpperCase().replace(/[^A-Z0-9]/g,'') || 'PAPIL';
}
async function fileSymbols(){
  try { return JSON.parse(await fs.readFile(SYMBOLS_PATH,'utf8')); }
  catch { return ['PAPIL','TEZOL','USAK','MRSHL','VKING','THYAO','AKBNK','GARAN','EREGL','PETKM']; }
}
async function mynetSymbols(){
  const r = await fetch(MYNET_URL, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if(!r.ok) throw new Error('Mynet hisse listesi alınamadı: '+r.status);
  const html = await r.text();
  const found = [];
  // Link yapısı üzerinden sembol yakalama: /borsa/hisseler/aefes-...
  for(const m of html.matchAll(/\/borsa\/hisseler\/([a-z0-9]{3,8})(?:[-\/"?#])/gi)){
    const s = m[1].toUpperCase();
    if(validSymbol(s)) found.push(s);
  }
  // Görünen tablo metni üzerinden yedek yakalama: >AEFES ANADOLU EFES<
  for(const m of html.matchAll(/>\s*([A-Z0-9]{3,8})\s+[A-ZÇĞİÖŞÜ0-9 .,&'()\/-]{3,}\s*</g)){
    const s = m[1].toUpperCase();
    if(validSymbol(s)) found.push(s);
  }
  return uniq(found).sort((a,b)=>a.localeCompare(b,'tr'));
}
export async function getSymbols(){
  const now = Date.now();
  if(symbolsCache && (now-symbolsCacheTime)<CACHE_MS) return symbolsCache;
  const fallback = await fileSymbols();
  try{
    const live = await mynetSymbols();
    // Mynet'ten 100+ sembol gelirse canlı listeyi kullan; az gelirse dosya yedeğine düş.
    symbolsCache = live.length > 100 ? live : uniq([...fallback, ...live]).sort((a,b)=>a.localeCompare(b,'tr'));
  }catch{
    symbolsCache = uniq(fallback).sort((a,b)=>a.localeCompare(b,'tr'));
  }
  symbolsCacheTime = now;
  return symbolsCache;
}

export async function getOhlcv(symbol='PAPIL', range='1y', interval='1d'){
  const s = normalizeSymbol(symbol);
  const yahoo = `${s}.IS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if(!r.ok) throw new Error(`Veri kaynağı cevap vermedi: ${r.status}`);
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  if(!Array.isArray(ts)||!q) throw new Error('OHLCV verisi bulunamadı');
  const rows = ts.map((t,i)=>({
    date: new Date(t*1000).toISOString().slice(0,10),
    open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] || 0
  })).filter(x=>Number.isFinite(x.open)&&Number.isFinite(x.high)&&Number.isFinite(x.low)&&Number.isFinite(x.close));
  if(rows.length<60) throw new Error('Yeterli geçmiş veri yok');
  return rows;
}


const mynetLinkCache = new Map();
let mynetLinkCacheTime = 0;

function trNumber(value){
  if(value == null) return null;
  let s = String(value).replace(/\s+/g,'').replace(/TL|₺/gi,'');
  if(!s) return null;
  // 1.656,00 -> 1656.00 ; 1656,00 -> 1656.00 ; 1656.00 -> 1656
  if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s = s.replace(',','.');
  const n = Number(s.replace(/[^0-9.-]/g,''));
  return Number.isFinite(n) ? n : null;
}

async function getMynetLinkMap(){
  const now = Date.now();
  if(mynetLinkCache.size && (now-mynetLinkCacheTime)<CACHE_MS) return mynetLinkCache;
  const r = await fetch(MYNET_URL, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if(!r.ok) throw new Error('Mynet hisse listesi alınamadı: '+r.status);
  const html = await r.text();
  mynetLinkCache.clear();
  for(const m of html.matchAll(/href=["']([^"']*\/borsa\/hisseler\/([a-z0-9]{3,8})(?:-[^"']*)?\/?)["']/gi)){
    const href = m[1].startsWith('http') ? m[1] : new URL(m[1], MYNET_URL).href;
    const sym = m[2].toUpperCase();
    if(validSymbol(sym) && !mynetLinkCache.has(sym)) mynetLinkCache.set(sym, href);
  }
  // Alternatif link yakalama
  for(const m of html.matchAll(/\/borsa\/hisseler\/([a-z0-9]{3,8})([^"'<>\s]*)/gi)){
    const sym = m[1].toUpperCase();
    if(validSymbol(sym) && !mynetLinkCache.has(sym)) mynetLinkCache.set(sym, new URL(`/borsa/hisseler/${m[1]}${m[2]}`, MYNET_URL).href);
  }
  mynetLinkCacheTime = now;
  return mynetLinkCache;
}

function extractMynetQuote(html){
  const candidates = [];
  const patterns = [
    /"lastPrice"\s*:\s*"?([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)"?/i,
    /"price"\s*:\s*"?([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)"?/i,
    /"last"\s*:\s*"?([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)"?/i,
    /Son\s*Fiyat[^0-9]{0,80}([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)/i,
    /data-price=["']([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)["']/i,
    /class=["'][^"']*(?:price|last|son)[^"']*["'][^>]*>\s*([0-9.]+,[0-9]+|[0-9]+\.?[0-9]*)\s*</i
  ];
  for(const re of patterns){ const m = html.match(re); const n = m && trNumber(m[1]); if(n && n>0) candidates.push(n); }
  // TL ile biten sayılardan makul fiyat adayı seç
  for(const m of html.matchAll(/([0-9]{1,4}(?:\.[0-9]{3})*(?:,[0-9]{1,2})|[0-9]{1,6}(?:\.[0-9]{1,4})?)\s*(?:TL|₺)/gi)){
    const n = trNumber(m[1]);
    if(n && n>0 && n<1000000) candidates.push(n);
  }
  // tekrarları kaldır; çoğu sayfada ilk makul aday güncel fiyattır
  const uniq = [...new Set(candidates.map(x=>Number(x.toFixed(4))))];
  return uniq.find(x=>x>0) || null;
}

function extractPercent(html){
  const patterns = [
    /"changePercent"\s*:\s*"?([-+]?[0-9.]+,[0-9]+|[-+]?[0-9]+\.?[0-9]*)"?/i,
    /%\s*([-+]?[0-9]+(?:[,.][0-9]+)?)/,
    /([-+]?[0-9]+(?:[,.][0-9]+)?)\s*%/
  ];
  for(const re of patterns){ const m = html.match(re); const n = m && trNumber(m[1]); if(Number.isFinite(n)) return n; }
  return null;
}

export async function getLiveQuote(symbol='PAPIL'){
  const s = normalizeSymbol(symbol);
  const map = await getMynetLinkMap();
  const url = map.get(s) || new URL(`/borsa/hisseler/${s.toLowerCase()}/`, MYNET_URL).href;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if(!r.ok) throw new Error('Mynet anlık fiyat alınamadı: '+r.status);
  const html = await r.text();
  const price = extractMynetQuote(html);
  if(!Number.isFinite(price)) throw new Error('Mynet fiyat değeri okunamadı');
  return {symbol:s, price, change: extractPercent(html), source:'Mynet Finans', url, time:new Date().toISOString()};
}

export async function getKapNews(symbol){
  return [{symbol: normalizeSymbol(symbol), title:'KAP entegrasyonu için hazır alan', effect:'NÖTR', confidence:50, date:new Date().toISOString().slice(0,10)}];
}
