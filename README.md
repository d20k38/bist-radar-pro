# BIST Radar Pro v16.9 - Öğrenen AI

Bu sürüm v16.8.2 kararlı tarama projesi üzerine eklendi.

## Eklenen yeni modül

### Öğrenen AI
- Seçili hissenin son 5 yıllık geçmiş sinyallerini inceler.
- 2023, 2024, 2025 gibi yıllara göre başarı oranlarını çıkarır.
- Hangi teknik kuralların daha başarılı çalıştığını hesaplar.
- Hangi kuralların zayıf kaldığını gösterir.
- AI karar motoruna “geçmiş performans hafızası” katmanı ekler.

## Yeni endpoint

`/api/learning?symbol=PAPIL&period=30`

Dönen veri:
- yearly: yıllara göre başarı
- decisions: karar türlerine göre başarı
- topRules: en iyi çalışan kurallar
- weakRules: zayıf kurallar
- recentSamples: son örnek sinyaller

## Not

Bu modül yatırım tavsiyesi üretmez. Geçmiş performans geleceği garanti etmez.
