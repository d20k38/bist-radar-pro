# BIST Radar Pro R11 Data Integrity Engine

Bu sürüm yeni al/sat özelliği eklemez; veri katmanını denetler.

## Eklenenler
- `lib/data-integrity-engine.js`
- OHLC gün sayısı kontrolü
- 250 günlük hafıza kontrolü
- Pozitif hacim günü kontrolü
- RVOL / VWAP / CMF / MFI hesaplanabilirlik kontrolü
- Master Stock Object içine `integrity` alanı
- `/api/scan`, `/api/decision`, `/api/stock` çıktılarında veri sağlığı bilgisi
- Day Trading hızlı modunda `master.metrics` değerlerini okuma düzeltmesi

## Amaç
RVOL = 0x, VWAP = 0, CMF = 0, MFI = 0 gibi durumlarda sistem artık bunu gizlemez; hangi veri katmanının eksik olduğunu raporlar.

Random/demo veri eklenmemiştir.

---

Önceki README aşağıdadır.

# BIST Radar Pro R10.2 RVOL FIX

Bu sürüm R10.1 Scanner Completion FIX üzerine hazırlanmıştır.

## Düzeltmeler
- RVOL değerinin sürekli `0x` görünmesi düzeltildi.
- Son işlem gününün hacmi 0/null gelirse RVOL, son pozitif hacimli işlem gününe göre hesaplanır.
- 20 günlük ve 5 günlük ortalama hacim hesaplarında yalnızca gerçek pozitif hacimler kullanılır.
- Hacim verisi yoksa `0x` yerine `veri yetersiz` gösterilir.
- Hacim verisi eksikliği, Day Trading skorunu yapay şekilde cezalandırmaz; nötr puanlanır.
- Indicator Engine içindeki RVOL hesaplaması da aynı mantığa bağlandı.

## Kurallar
- Random/demo hacim verisi eklenmedi.
- API sayısı artırılmadı.
- Syntax test geçti.
