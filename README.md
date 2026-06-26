# BIST Radar Pro V17 AI Pro

Açıklanabilir, çok katmanlı ve öğrenen AI mantığıyla hazırlanmış Vercel uyumlu proje.

## Kurulum
1. ZIP içeriğini GitHub reposuna yükleyin.
2. Vercel'e import edin.
3. Node sürümü otomatik çalışır.

## Ana dosyalar
- `index.html` ana arayüz
- `api/stock.js` hisse analizi
- `api/scan.js` parçalı tarama
- `api/learning.js` öğrenen AI özeti
- `api/portfolio-advice.js` portföy önerileri
- `lib/ai-pro-engine.js` AI Pro karar motoru
- `lib/data-provider.js` Yahoo Finance OHLC + fallback veri üretici

## Not
Yahoo Finance verisi alınamazsa sistem demo/fallback OHLC üretir. Finansal kararlar için tek başına kullanılmamalıdır; karar destek ve eğitim amaçlıdır.
