# BIST Radar Pro v11.2 - Parçalı Tüm BIST Tarama

Bu sürümde `Failed to fetch` hatasına yol açan tek seferde tüm BIST taraması kaldırıldı.

## Değişiklikler
- `/api/scan` artık `offset` destekler.
- Arayüz tüm BIST'i 35 hisselik parçalar halinde tarar.
- Vercel 60 saniye sınırına takılma riski azalır.
- Tarama ilerleme bilgisini ekranda gösterir.

## API örnekleri
- `/api/scan?limit=35&offset=0`
- `/api/scan?limit=35&offset=35`
- `/api/scan?limit=35&offset=70`

## Yayınlama
ZIP içindeki tüm dosyaları GitHub reposuna yükleyin. Eski `public/index.html` varsa silin veya bu sürümle değiştirin. Vercel'de cache kapalı redeploy yapın.
