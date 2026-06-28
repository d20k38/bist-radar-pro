import { getSymbols, getOhlcv } from '../lib/provider.js';
import { analyze } from '../lib/engine.js';
import { buildV20Portfolio } from '../lib/v20-portfolio-engine.js';

function rrScore(x){
  const target = x.close && x.target1 ? ((x.target1 - x.close) / x.close) * 100 : 0;
  const stop = x.close && x.stop ? ((x.close - x.stop) / x.close) * 100 : 5;
  return Math.max(0, Math.min(100, (target * 12) / Math.max(stop, 1)));
}
function dailyTradeList(rows){
  return rows.filter(x => (x.money||0) >= 45 && (x.momentum||0) >= 45 && (x.risk||100) <= 60 && (x.finalScore||0) >= 45)
    .sort((a,b)=>((b.money||0)+(b.momentum||0)+rrScore(b))-((a.money||0)+(a.momentum||0)+rrScore(a))).slice(0,8);
}
function weeklyPortfolioList(rows){
  return rows.filter(x => (x.finalScore||0) >= 55 && (x.confidence||0) >= 55 && (x.risk||100) <= 55)
    .sort((a,b)=>((b.finalScore||0)+(b.trend||0)+(b.confidence||0)-(b.risk||0))-((a.finalScore||0)+(a.trend||0)+(a.confidence||0)-(a.risk||0))).slice(0,7);
}
function monthlyPortfolioList(rows){
  return rows.filter(x => (x.trend||0) >= 55 && (x.confidence||0) >= 55 && (x.risk||100) <= 50)
    .sort((a,b)=>((b.trend||0)*1.2+(b.confidence||0)+(b.finalScore||0)-(b.risk||0)*1.1)-((a.trend||0)*1.2+(a.confidence||0)+(a.finalScore||0)-(a.risk||0)*1.1)).slice(0,8);
}

export default async function handler(req,res){
  const v20Only = String(req.query.v20Only || '') === '1';
  const limit = v20Only ? 0 : Math.max(4, Math.min(Number(req.query.limit || 40), 80));
  const offset = Math.max(0, Number(req.query.offset || 0));
  const symbols = v20Only ? [] : (await getSymbols()).slice(offset, offset + limit);
  const data = [];
  for (const symbol of symbols) {
    try {
      const rows = await getOhlcv(symbol,'1y','1d');
      const a = analyze(rows);
      data.push({symbol, ...a});
    } catch (e) {
      data.push({symbol, error: e.message, decision:'VERİ YOK', finalScore:0, confidence:0, risk:100});
    }
  }
  let v20 = null;
  if (req.query.portfolio) {
    try {
      const portfolio = JSON.parse(String(req.query.portfolio));
      const holdings = Array.isArray(portfolio) ? portfolio.slice(0, 12) : [];
      const analyses = {};
      const ohlcv = {};
      for (const h of holdings) {
        const sym = String(h.symbol||'').toUpperCase().replace('.IS','').trim();
        if(!sym) continue;
        const rows = await getOhlcv(sym,'1y','1d');
        ohlcv[sym] = rows;
        analyses[sym] = analyze(rows);
      }
      v20 = buildV20Portfolio({holdings, analyses, ohlcv});
    } catch (e) {
      v20 = {success:false, error:e.message};
    }
  }
  const avgRisk = data.length ? data.reduce((s,x)=>s+(x.risk||50),0)/data.length : 50;
  const cash = avgRisk > 60 ? 30 : avgRisk > 50 ? 20 : 15;
  res.status(200).json({
    success:true,
    count:data.length,
    offset,
    limit,
    cash,
    dailyTrade: dailyTradeList(data),
    weeklyPortfolio: weeklyPortfolioList(data),
    monthlyPortfolio: monthlyPortfolioList(data),
    data,
    v20
  });
}
