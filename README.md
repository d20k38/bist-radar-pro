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

## R9 Institutional AI Suite
Bu sürümde V20 Simülasyon, Smart Portfolio, Fırsat Avcısı ve Formasyonlar aynı karar/veri mimarisi altında birleştirildi. R9 yeni API eklemez; mevcut tarama, day trading, institutional, portföy ve karar motoru sonuçlarını tek suite ekranında özetler.


R9.4 PERFORMANCE FIX
- Açılışta otomatik tam tarama kapatıldı.
- Universal Scanner parti boyutu artırıldı.
- Day Trading ve Institutional listeleri, tam tarama sonrası tekrar API çağırmadan Master Stock Object verisinden türetilir.
- UI render sıklığı düşürüldü, bekleme süreleri azaltıldı.
