# BIST Radar Pro v9 - Veri Kaynak Dosyaları

Bu paket, HTML ekranının gerçek veri ile çalışması için Vercel API route iskeletini içerir.

## Klasörler

- `api/scan.js` : Tüm BIST tarama API route'u
- `api/stock.js` : Tek hisse analiz API route'u
- `api/backtest.js` : Backtest API route'u
- `api/kap.js` : KAP haber/duyuru route'u
- `lib/data-provider.js` : Veri sağlayıcı yardımcı fonksiyonları
- `data/bist_symbols.json` : Örnek BIST hisse listesi
- `data/sample_ohlcv.csv` : Örnek OHLCV veri formatı

## Vercel Kullanımı

Bu dosyaları mevcut Vercel projenize aynı klasör yapısıyla ekleyin.

HTML tarafında örnek çağrılar:

```js
fetch('/api/stock?symbol=PAPIL')
fetch('/api/scan')
fetch('/api/backtest?symbol=PAPIL&period=30')
fetch('/api/kap?symbol=PAPIL')
```

## Not

Bu paket canlı veri bağlantısı için iskelet hazırlar. Gerçek kaynak olarak TradingView, Mynet, İş Yatırım, CollectAPI veya KAP bağlantıları `lib/data-provider.js` içine eklenmelidir.
