# BIST Radar Pro R10.1 Scanner Completion FIX

Bu sürüm R10 Codebase Refactor üzerine performans/kararlılık düzeltmesidir.

## Düzeltmeler
- 336/526 gibi ara noktada takılan tarama döngüsü düzeltildi.
- Tek bir API batch hatası tüm taramayı durdurmaz; batch hata olarak kaydedilip sonraki bloğa geçilir.
- `/api/scan` sembol başına zaman aşımı ile güvenli hale getirildi.
- Toplam sembol sayısı önce `/api/symbols` ile alınır; ilerleme çubuğu gerçek toplamı gösterir.
- Tarama sonunda başarılı ve hatalı/atlanmış kayıt sayısı raporlanır.
- Benchmark verisi tam taramada kapatıldı; bu Vercel timeout riskini azaltır.

## Not
Demo/random veri eklenmedi. Veri alınamayan semboller hata satırı olarak raporlanır.
