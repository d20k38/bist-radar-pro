# BIST Radar Pro R12.1 - Vercel Hobby API Consolidation FIX

Bu sürüm Vercel Hobby planındaki 12 Serverless Function sınırı için hazırlanmıştır.

## Yapılanlar
- API endpointleri tek ana fonksiyonda birleştirildi: `/api/core`.
- Eski çağrılar tarayıcı tarafında otomatik olarak `/api/core?action=...` formatına yönlendirilir.
- Eski desteklenen aksiyonlar: symbols, stock, decision, dip, scan, institutional-scan, portfolio-advice, kap, learning, backtest, committee.
- `api/` kökünde sadece `core.js` bırakıldı; `api/lib` yardımcı dosyaları fonksiyon değildir.
- Random/demo veri eklenmedi.
- OHLCV/hacim verisi `unified-provider` katmanından okunmaya devam eder.

## Vercel Hobby
Bu paket Serverless Function sayısını 1 ana endpoint seviyesine indirir.
