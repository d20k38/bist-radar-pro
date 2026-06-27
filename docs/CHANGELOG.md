# CHANGELOG

## v17.0.1 - Altyapı Refaktörü

Yeni özellik eklenmedi. Amaç, v16.17 çalışan yapıyı bozmadan V17 modüler mimarinin temelini oluşturmaktır.

### Yapılanlar
- Merkezi sürüm dosyası eklendi: `config/version.js`
- Merkezi menü dosyası eklendi: `config/menu.js`
- Router dosyası eklendi: `js/router.js`
- Modül dosyaları hazırlandı:
  - `js/dashboard.js`
  - `js/stock-analysis.js`
  - `js/portfolio.js`
  - `js/backtest.js`
  - `js/learning.js`
  - `js/kap-news.js`
  - `js/confidence.js`
  - `js/committee.js`
  - `js/dip.js`
- Component klasörü hazırlandı:
  - `components/card.js`
  - `components/table.js`
  - `components/progress.js`
  - `components/badge.js`
- v17.1 için `api/dip.js` ve `lib/dip-engine.js` hazırlandı.
- v17.2 için `api/committee2.js` ve `lib/committee2-engine.js` hazırlandı.
- v16.17 başlık problemi için runtime başlık düzeltmesi eklendi.

### Sonraki sürüm
- v17.1 → Dip Avcısı AI
