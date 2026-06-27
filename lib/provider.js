// V16.8.1 - Vercel JSON import assert hatasını önlemek için symbols.json fs ile okunur.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedSymbols = null;

export async function getSymbols(){
  if(cachedSymbols) return cachedSymbols;
  try{
    const p = join(__dirname, '../data/symbols.json');
    const txt = readFileSync(p, 'utf8');
    const arr = JSON.parse(txt);
    cachedSymbols = Array.isArray(arr) && arr.length ? arr : fallbackSymbols();
  }catch(e){
    cachedSymbols = fallbackSymbols();
  }
  return cachedSymbols;
}

function fallbackSymbols(){
  return ['AEFES','AKSA','AKSEN','AKBNK','ALARK','ARCLK','ASELS','BIMAS','DOAS','EKGYO','EREGL','FROTO','GARAN','HEKTS','ISCTR','KCHOL','KOZAL','PETKM','PGSUS','SAHOL','SASA','SISE','TAVHL','TCELL','THYAO','TOASO','TUPRS','YKBNK','PAPIL','MRSHL','TEZOL','USAK','VKING'];
}

export async function getOhlcv(symbol, range='1y', interval='1d'){
  const s = String(symbol||'').toUpperCase().replace('.IS','') + '.IS';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${range}&interval=${interval}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try{
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':'Mozilla/5.0',
        'accept':'application/json,text/plain,*/*'
      }
    });
    if(!r.ok) throw new Error('Yahoo veri alınamadı: HTTP '+r.status);
    const text = await r.text();
    let j;
    try{ j = JSON.parse(text); }
    catch{ throw new Error('Yahoo JSON döndürmedi'); }
    const res = j.chart?.result?.[0];
    if(!res) throw new Error('OHLC veri yok');
    const q = res.indicators?.quote?.[0] || {};
    const ts = res.timestamp || [];
    return ts.map((t,i)=>({
      date:new Date(t*1000).toISOString().slice(0,10),
      open:q.open?.[i],
      high:q.high?.[i],
      low:q.low?.[i],
      close:q.close?.[i],
      volume:q.volume?.[i]||0
    })).filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.high)&&Number.isFinite(x.low));
  }finally{
    clearTimeout(timer);
  }
}
