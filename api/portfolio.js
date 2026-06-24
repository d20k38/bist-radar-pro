import { fetchYahooHistory, analyze } from './lib/market.js';
const PORTFOLIO=[{symbol:'MRSHL',lot:286,cost:2470},{symbol:'PAPIL',lot:7000,cost:27.50},{symbol:'TEZOL',lot:6156,cost:20.96},{symbol:'USAK',lot:29222,cost:3.05},{symbol:'VKING',lot:1000,cost:55}];
export default async function handler(req,res){
  const rows=[];
  for(const p of PORTFOLIO){
    try{ const h=await fetchYahooHistory(p.symbol,'1y','1d'); const a=analyze(p.symbol,h); rows.push({...p, price:a.x.close, pnl:(a.x.close-p.cost)*p.lot, pnlPct:(a.x.close-p.cost)/p.cost*100, analysis:a}); }
    catch(e){ rows.push({...p,error:e.message}); }
  }
  res.status(200).json({success:true,data:rows});
}
