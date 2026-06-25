# BIST Radar Pro V16.8.2 - Tam Proje

Bu paket, V16.8 Kararlı Tarama HTML sürümünün Vercel proje yapısına dönüştürülmüş halidir.

## İçerik
- Gerçek Vercel API klasörü: `api/`
- Parçalı tarama: `/api/scan?offset=0&limit=4`
- JSON güvenlik kontrolü: API HTML/hata döndürürse kullanıcıya anlaşılır hata gösterir
- İlerleme çubuğu: tarama kademeli ilerler
- En Güçlü 20
- Güvenli Kazançlar
- Fırsat Avcısı
- Portföy Radarım
- AI Karar Motoru ve nedenleri
- Grafik ve teknik göstergeler
- `api/stock.js`, `api/scan.js`, `api/backtest.js`, `api/symbols.js`
- `lib/provider.js`, `lib/engine.js`, `lib/indicators.js`
- `data/symbols.json`
- `package.json`, `vercel.json`

## Vercel Kurulum
1. ZIP'i açın.
2. İçindeki tüm dosya ve klasörleri GitHub repo ana dizinine yükleyin.
3. Repo kökünde mutlaka `index.html`, `api/`, `lib/`, `data/`, `package.json`, `vercel.json` birlikte olmalı.
4. Vercel'de Redeploy yapın.
5. Tarayıcıda Ctrl+Shift+R ile önbelleği temizleyin.

## Test Adresleri
- `/api/symbols`
- `/api/stock?symbol=PAPIL`
- `/api/scan?offset=0&limit=4`
- `/api/backtest?symbol=PAPIL&period=30`

## Not
Vercel timeout riskini azaltmak için tarama tek istekte en fazla 4 hisse üzerinden çalışır. Frontend tüm listeyi parça parça tarar.
