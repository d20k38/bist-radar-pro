import { getOhlcv } from '../lib/data-provider.js';

function percent(a, b) { return ((b - a) / a) * 100; }

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || 'PAPIL').toUpperCase();
  const period = Number(req.query.period || 30);
  const rows = await getOhlcv(symbol, '1D', 220);
  const start = rows.at(-period - 1);
  const end = rows.at(-1);
  const change = percent(start.close, end.close);
  const result = change > 5 ? 'Başarılı yükseliş' : change > -3 ? 'Yatay / sınırlı' : 'Başarısız / düşüş';
  res.status(200).json({ success: true, symbol, period, start, end, change: +change.toFixed(2), result });
}
