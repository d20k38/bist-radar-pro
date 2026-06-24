import { getSymbols, getOhlcv } from '../lib/data-provider.js';

function ema(values, n) {
  const k = 2 / (n + 1);
  let e = values[0];
  for (const v of values.slice(1)) e = v * k + e * (1 - k);
  return e;
}
function avg(a) { return a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1); }
function rsi(values, n = 14) {
  let gain = 0, loss = 0;
  for (let i = values.length - n; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  const rs = gain / Math.max(loss, 0.0001);
  return 100 - 100 / (1 + rs);
}
function quickScore(rows) {
  const c = rows.map(x => x.close), v = rows.map(x => x.volume);
  const close = c.at(-1), e50 = ema(c, 50), e200 = ema(c, Math.min(120, c.length));
  const rv = v.at(-1) / Math.max(avg(v.slice(-20)), 1);
  const rr = rsi(c);
  const trend = close > e50 && close > e200 ? 85 : close > e50 ? 65 : 35;
  const money = rv > 1.5 ? 85 : rv > 1.1 ? 65 : 45;
  const momentum = rr > 45 && rr < 65 ? 78 : rr < 35 ? 62 : 45;
  const risk = close > e50 ? 30 : 60;
  const aiScore = Math.round((trend + money + momentum + (100 - risk)) / 4);
  return { close, trend, money, momentum, risk, aiScore, decision: aiScore >= 75 ? 'AL' : aiScore >= 60 ? 'İZLE' : 'RİSKLİ' };
}

export default async function handler(req, res) {
  const symbols = await getSymbols();
  const data = [];
  for (const symbol of symbols) {
    const rows = await getOhlcv(symbol, '1D', 180);
    data.push({ symbol, ...quickScore(rows) });
  }
  data.sort((a, b) => b.aiScore - a.aiScore);
  res.status(200).json({ success: true, count: data.length, data });
}
