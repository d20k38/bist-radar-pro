# BIST Radar Pro v9.1

Bu sürüm, hisse seçimi + Uzman Motor Özeti + Uzman Yorumu + Yapay Zeka Yorumu + Neden? kutusu ile düzenlendi.

## Vercel kurulum
1. ZIP'i açın.
2. Klasörü GitHub'a yükleyin.
3. Vercel → New Project → repo seç → Deploy.

## API route'ları
- `/api/symbols`
- `/api/stock?symbol=PAPIL`
- `/api/scan?limit=50`
- `/api/backtest?symbol=PAPIL&period=30`
- `/api/portfolio`

## Veri kaynağı
İlk veri kaynağı olarak halka açık Yahoo Finance chart endpoint'i denenir (`PAPIL.IS` gibi). Kaynak cevap vermezse sistem ekranda veri bulunamadı mesajı gösterir; sahte sinyal üretmez.

Not: Eğitim ve araştırma amaçlıdır, yatırım tavsiyesi değildir.
