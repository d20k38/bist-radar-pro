# BIST Radar Pro R13 - API Gateway

Bu sürümün ana amacı Vercel Hobby planındaki Serverless Function sınırını kalıcı olarak çözmektir.

## Kritik değişiklik
`api/` klasöründe sadece tek Vercel function bırakıldı:

- `api/core.js`

Aşağıdaki eski endpoint dosyaları R13 paketinde yoktur ve GitHub reposunda da silinmelidir:

- `api/backtest.js`
- `api/committee.js`
- `api/confidence.js`
- `api/decision.js`
- `api/dip.js`
- `api/institutional-scan.js`
- `api/kap.js`
- `api/learning.js`
- `api/portfolio-advice.js`
- `api/scan.js`
- `api/stock.js`
- `api/symbols.js`

## Yeni kullanım
Tüm API çağrıları tek dosyadan çalışır:

- `/api/core?action=symbols`
- `/api/core?action=stock&symbol=PAPIL`
- `/api/core?action=scan&offset=0&limit=30`
- `/api/core?action=decision&symbol=PAPIL`
- `/api/core?action=dip&symbols=PAPIL,THYAO`
- `/api/core?action=kap&symbol=PAPIL`
- `/api/core?action=backtest&symbol=PAPIL`
- `/api/core?action=portfolio&portfolio=PAPIL:100:20`

## Geriye dönük uyumluluk
`index.html` içinde eski `/api/stock`, `/api/scan`, `/api/decision`, `/api/dip`, `/api/symbols` gibi çağrılar tarayıcı tarafında otomatik olarak `/api/core?action=...` formatına çevrilir.

## GitHub/Vercel için önemli not
GitHub'da ZIP yüklemek eski dosyaları otomatik silmeyebilir. Build hatası devam ederse `api/` klasöründe `core.js` dışındaki eski `.js` dosyalarını manuel silin. `api/lib` klasörü yardımcı modüldür, Vercel function sayılmaz.

## Kontrol
Bu pakette `api/` kökünde function sayısı: 1.
Random/demo veri eklenmedi.
