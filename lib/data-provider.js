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

export async function getKapNews(symbol){
  return [{symbol: normalizeSymbol(symbol), title:'KAP entegrasyonu için hazır alan', effect:'NÖTR', confidence:50, date:new Date().toISOString().slice(0,10)}];
}
