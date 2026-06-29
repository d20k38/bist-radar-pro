# BIST Radar Pro R26 Production Build

Bu sürüm R25/R24 dosya karışıklığını temizlemek ve üretim deploy için hazırlanmıştır.

## Düzeltmeler
- Başlık R26 Production Build olarak güncellendi.
- `await is only valid in async functions` hatası için `init()` async hale getirildi.
- Tek API Gateway yapısı korunur: `api/core.js`.
- Eski endpoint çağrıları tarayıcıda `/api/core?action=...` formatına yönlendirilir.
- R23/R24 Master Object ve Dependency Free yapısı korunur.

## GitHub/Vercel kontrol
- `api/` içinde yalnızca `core.js` kalmalı.
- `api/lib` klasörü olmamalı.
- `lib/` kök dizinde kalmalı.
- Deploy sonrası başlıkta `R26 Production Build` görünmeli.
