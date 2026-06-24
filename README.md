# BIST Radar Pro v11.3 Güvenli Tarama

Bu sürüm `Failed to fetch` ve Vercel timeout sorunlarını azaltmak için tüm BIST taramasını 6 hisselik küçük parçalar halinde yapar.

- `/api/scan?limit=6&offset=0&concurrency=2`
- Tarama sırasında hata olursa ekranda gösterir, sayfa kilitlenmez.
- Vercel Hobby planında tek istekte çok sayıda Yahoo Finance çağrısı zaman aşımına düşebildiği için küçük parçalı tarama kullanılmıştır.

Kurulum: ZIP içindeki dosyaları repo köküne yükleyin, eski `public/index.html` varsa silin veya aynı dosyayla değiştirin, Vercel'de redeploy yapın ve build cache kullanmayın.
