# BIST Radar Pro v16.8 Kararlı Tarama Proje

Bu sürüm `Unexpected token A / A server error` hatası için güncellendi.

## Düzeltmeler
- `/api/scan` tek istekte en fazla 10 hisse tarar.
- Frontend taramayı parçalı yapar.
- API yanıtı JSON değilse kullanıcıya anlaşılır hata verir.
- Vercel timeout riskini azaltır.
- İlerleme çubuğu aktiftir.

## Vercel için
Kök dizindeki tüm dosya ve klasörleri yükleyin:
- index.html
- api/
- lib/
- data/
- package.json
- vercel.json

Sadece index.html yüklemek yeterli değildir.
