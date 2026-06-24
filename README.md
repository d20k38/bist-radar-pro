# BIST Radar Pro V16.8.1 JSON Fix

Bu sürüm `FUNCTION_INVOCATION_FAILED` hatasına karşı düzeltilmiştir.

Düzeltmeler:
- `import symbols from '../data/symbols.json' assert {type:'json'}` kaldırıldı.
- `symbols.json` artık `fs.readFileSync` ile okunur.
- `/api/scan` tek istekte en fazla 4 hisse tarar.
- Yahoo isteklerine 4.5 saniye timeout eklendi.
- API her durumda JSON döndürmeye çalışır.

Vercel'e yüklerken tüm klasörü yükleyin:
- api/
- lib/
- data/
- index.html
- package.json
- vercel.json
