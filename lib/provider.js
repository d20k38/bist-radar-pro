import symbols from '../data/symbols.json' assert {type:'json'};
export async function getSymbols(){return symbols}
export async function getOhlcv(symbol,range='1y',interval='1d'){
 const s=symbol.toUpperCase().replace('.IS','')+'.IS';
 const url=`https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${range}&interval=${interval}`;
 const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}}); if(!r.ok) throw new Error('Yahoo veri alınamadı');
 const j=await r.json(); const res=j.chart?.result?.[0]; if(!res) throw new Error('OHLC veri yok');
 const q=res.indicators?.quote?.[0], ts=res.timestamp||[]; return ts.map((t,i)=>({date:new Date(t*1000).toISOString().slice(0,10),open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i]||0})).filter(x=>Number.isFinite(x.close)&&Number.isFinite(x.high)&&Number.isFinite(x.low));
}
