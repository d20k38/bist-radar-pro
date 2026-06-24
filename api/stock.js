import { getOhlcv } from '../lib/data-provider.js';

function sma(values, n) {
  if (values.length < n) return null;
  return values.slice(-n).reduce((a, b) => a + b, 0) / n;
}

function ema(values, n) {
  const k = 2 / (n + 1);
  let e = values[0];
  for (const v of values.slice(1)) e = v * k + e * (1 - k);
  return e;
}

function rsi(values, n = 14) {
  if (values.length <= n) return null;
  let gain = 0, loss = 0;
  for (let i = values.length - n; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  const rs = gain / Math.max(loss, 0.0001);
  return 100 - 100 / (1 + rs);
}

function analyze(rows) {
  const closes = rows.map(r => r.close);
  const volumes = rows.map(r => r.volume);
  const close = closes.at(-1);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, Math.min(120, closes.length));
  const r = rsi(closes);
  const avgVol = sma(volumes, 20);
  const trend = close > ema50 && close > ema200 ? 85 : close > ema50 ? 65 : 40;
  const money = volumes.at(-1) > avgVol * 1.3 ? 80 : 55;
  const momentum = r > 45 && r < 65 ? 78 : r < 35 ? 62 : 45;
  const risk = close > ema50 ? 32 : 58;
  const confidence = Math.round((trend + money + momentum + (100 - risk)) / 4);
  const decision = confidence >= 75 ? 'AL' : confidence >= 60 ? 'İZLE' : 'RİSKLİ';
  return { close, ema50, ema200, rsi: r, avgVol, trend, money, momentum, risk, confidence, decision };
}

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  const rows = await getOhlcv(symbol, req.query.timeframe || '1D', 180);
  const analysis = analyze(rows);
  res.status(200).json({ success: true, symbol, ohlcv: rows, analysis });
}
