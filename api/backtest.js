import { fetchYahooHistory, analyze } from './lib/market.js';
import { normalizeSymbol } from './lib/symbols.js';
function verdict(decision, pct){
  if(['GÜVENLİ AL','FIRSAT AL'].includes(decision)) return pct>3 ? 'DOĞRU' : pct<-3 ? 'YANLIŞ' : 'NÖTR';
  if(decision==='RİSKLİ') return pct<0 ? 'DOĞRU' : 'YANLIŞ';
  return Math.abs(pct)<5 ? 'DOĞRU' : 'NÖTR';
}
export default async function handler(req,res){
  try{
    const symbol=normalizeSymbol(req.query.symbol || 'PAPIL'); const days=Number(req.query.days || 30);
    const history=await fetchYahooHistory(symbol,'2y','1d');
    const cut=Math.max(220, history.length-days);
    const past=analyze(symbol, history, cut);
    const now=analyze(symbol, history);
    const pastClose=past.x.close, nowClose=now.x.close; const pct=(nowClose-pastClose)/pastClose*100;
    res.status(200).json({success:true, symbol, days, source:'Yahoo Finance chart endpoint', pastDate:past.x.date, todayDate:now.x.date, pastClose, nowClose, changePct:pct, pastDecision:past.decision, pastScores:{safe:past.safeScore, opportunity:past.opportunityScore, rr:past.rrScore, risk:past.risk, ai:past.aiScore}, currentDecision:now.decision, verdict:verdict(past.decision,pct), past, now});
  }catch(e){ res.status(500).json({success:false,error:e.message}); }
}
