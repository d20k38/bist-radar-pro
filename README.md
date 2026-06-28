# BIST Radar Pro R14.1 KAP Safe JSON FIX

## Amaç
KAP/Haber alanında Vercel `FUNCTION_INVOCATION_FAILED` olduğunda tarayıcıya HTML hata sayfası yerine her zaman JSON dönmesini sağlamak.

## Değişiklikler
- `/api/core?action=kap` güvenli JSON moduna alındı.
- KAP provider yoksa demo/random haber üretmez; nötr KAP yanıtı döner.
- `api/core.js` içindeki veri sağlayıcı `require` işlemi lazy-load yapıldı; KAP isteği OHLC provider hatasından etkilenmez.
- `index.html` içindeki eski `/api/kap` çağrıları `/api/core?action=kap` formatına çevrildi.
- API function sayısı yine 1: `api/core.js`.

## GitHub Notu
`api/` klasöründe yalnızca `core.js` kalmalı. Eski endpoint dosyaları varsa silin.
