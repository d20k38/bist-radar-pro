# BIST Radar Pro R17 - Provider Abstraction Layer

Bu sürüm yeni özellik eklemez; veri sağlayıcı katmanını sağlamlaştırır.

## Amaç
- `yahoo-finance2` paketi bulunamazsa uygulamanın çökmesini engellemek.
- Önce `yahoo-finance2`, yoksa Yahoo HTTP chart/quote provider ile gerçek OHLCV almaya çalışmak.
- Veri alınamazsa random/demo üretmeden JSON hata ve diagnostic döndürmek.
- 2420 gibi gürültülü/tekrarlı sembol evrenini temiz `lib/symbols.js` listesine indirmek.

## Dosya yapısı
- `api/core.js`: tek Vercel function
- `lib/unified-provider.js`: Provider Abstraction Layer
- `lib/symbols.js`: temiz BIST sembol evreni
- `index.html`

## Vercel Hobby
`api/` içinde sadece `core.js` kalmalıdır.
