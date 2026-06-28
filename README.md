# BIST Radar Pro R8 - Dinamik Portföy Radarım

Taban: R7 Indicator Engine.

## Yapılanlar
- Portföy Radarım bölümü dinamik hale getirildi.
- Portföy değiştiğinde hisse/lot/maliyet otomatik kaydedilir ve anlık portföy analizi yeniden çalıştırılır.
- Her portföy hissesi için `/api/decision?symbol=` üzerinden gerçek veriyle karar motoru analizi yapılır.
- Portföy toplam maliyet, güncel değer, kar/zarar, AI sağlık skoru ve aksiyonlar gösterilir.
- Portföy dışı fırsatlar ve rotasyon adayları eklendi.
- JSON portföy yükleme/indirme ve CSV dışa aktarım eklendi.
- Yeni API eklenmedi.
- Demo/random veri eklenmedi.
