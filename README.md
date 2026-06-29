# BIST Radar Pro R24 Dependency Free

Bu sürüm R23 Core Schema Standard üzerine bağımlılık temizliği ve açılış kararlılığı düzeltmesi yapar.

## Yapılanlar
- jQuery bağımlılığı kaldırıldı / gerekli değil.
- `$ is not defined` hatası için vanilla JS DOM helper eklendi.
- `$()` kullanımları `document.getElementById / querySelector` tabanlı çalışır.
- `window.$` ve `window.$$` güvenli yardımcıları eklendi.
- Tek API Gateway korunur: `api/core.js`.
- Random/demo veri eklenmedi.

## GitHub/Vercel notu
`api/` klasöründe yalnızca `core.js` kalmalıdır. `api/lib` veya eski endpoint dosyaları tekrar eklenirse Vercel Hobby function sınırı aşılabilir.
