# BIST Radar Pro v8 - Gerçek Veri

Bu sürüm demo veri üretmez. Vercel API route'ları üzerinden Yahoo Finance chart endpointinden BIST sembollerinin gerçek geçmiş fiyat/hacim verisini çeker ve teknik analiz üretir.

## API
- `/api/stock?symbol=PAPIL&range=1y`
- `/api/scan?limit=120`
- `/api/backtest?symbol=PAPIL&days=30`
- `/api/portfolio`
- `/api/symbols`

## Vercel
ZIP'i açın, GitHub'a yükleyin, Vercel'de import edin. Build command boş kalabilir.

Not: Yahoo Finance resmi yatırım veri API'si değildir; veri sürekliliği için ileride ücretli/resmi kaynak veya CollectAPI eklenebilir.
