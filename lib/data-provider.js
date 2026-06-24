import fs from 'fs/promises';
import path from 'path';

const SYMBOLS_PATH = path.join(process.cwd(), 'data', 'symbols.json');

export async function getSymbols(){
  try { return JSON.parse(await fs.readFile(SYMBOLS_PATH,'utf8')); }
  catch { return ['PAPIL','TEZOL','USAK','MRSHL','VKING','THYAO','AKBNK','GARAN','EREGL','PETKM']; }
}

function normalizeSymbol(symbol='PAPIL'){
  return String(symbol).trim().toUpperCase().replace(/[^A-Z0-9]/g,'') || 'PAPIL';
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
