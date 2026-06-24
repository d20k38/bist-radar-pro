# BIST Radar Pro v11 Karar Destek

Bu paket Vercel'e yüklenebilir tam proje sürümüdür.

## İçerik
- `index.html` — v11 karar destek arayüzü
- `api/` — Vercel API route dosyaları
- `lib/` — teknik analiz ve veri sağlayıcı motoru
- `data/symbols.json` — BIST sembol listesi
- `package.json`, `vercel.json` — Vercel yapılandırması

## Kurulum
1. ZIP'i açın.
2. Dosyaları GitHub reposuna yükleyin.
3. Vercel'de redeploy yapın.
4. Eski `public/index.html` veya eski kök `index.html` dosyası kalmadığından emin olun.

## Test URL'leri
- `/api/symbols`
- `/api/stock?symbol=PAPIL`
- `/api/scan?limit=120`
- `/api/backtest?symbol=PAPIL&period=30`
