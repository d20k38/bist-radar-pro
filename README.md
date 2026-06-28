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
