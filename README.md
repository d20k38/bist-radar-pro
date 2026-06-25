# BIST Radar Pro V16.14 - Tüm Hisse Tarama

Bu sürüm, son çalışan V16.13 AI Karar Motoru projesi temel alınarak hazırlanmıştır.

## Değişiklikler
- `data/symbols.json` genişletildi.
- Toplam sembol sayısı: 527
- Tarama 4'er hisselik parçalara bölündü.
- Frontend güvenlik sınırı tüm listeyi tarayacak şekilde artırıldı.
- En Güçlü 20, Güvenli Kazançlar, Fırsat Avcısı ve Portföy Radarım tüm sembol listesinden beslenir.

## Vercel'e yükleme
ZIP içeriğini GitHub repo ana dizinine çıkarın ve Vercel'de yeniden deploy edin.

Not: Yahoo Finance bazı BIST sembollerinde veri döndürmeyebilir; bu hisseler "VERİ YOK" olarak listelenir fakat tarama durmaz.
