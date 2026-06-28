# BIST Radar Pro R12 – Unified Data Provider

Bu sürümün amacı yeni ekran eklemek değil, veri katmanını tekleştirmektir.

## Ana düzeltme
- `api/lib/unified-provider.js` eklendi.
- `/api/stock`, `/api/scan`, `/api/decision`, `/api/dip`, `/api/symbols` aynı OHLCV kaynağına bağlandı.
- Günlük OHLCV içinde `volume` dizisi korunur.
- RVOL, VWAP, CMF, MFI, OBV hacim serisinden hesaplanır.
- Hacim yoksa `0x` sahte sonuç yerine veri sağlığı düşer ve eksik veri raporlanır.
- Random/demo fiyat veya hacim üretilmez.

## Veri sağlayıcı
Sunucu tarafında `yahoo-finance2` kullanılır. Borsa-api-main içindeki yaklaşım temel alındı; TypeScript kütüphanesinin tamamını tarayıcıya gömmek yerine Vercel API endpointleri için sade CommonJS sağlayıcı yazıldı.

## Önemli
Vercel deploy sırasında `package.json` bağımlılıkları kurmalıdır.
