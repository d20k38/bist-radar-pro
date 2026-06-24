# BIST Radar Pro v9.4 Temiz Kurulum

Bu sürüm `Cannot read properties of undefined (reading 'change')` hatasına karşı korumalıdır.

## Çok önemli kurulum

Vercel'de eski v8 dosyaları kalırsa tarayıcı yine v8'i açar. Bu yüzden:

1. GitHub reposundaki eski dosyaların tamamını silin.
2. Bu ZIP'in içindeki dosyaları doğrudan repo kök dizinine yükleyin.
   - `index.html` kökte olmalı.
   - `api/` kökte olmalı.
   - `lib/` kökte olmalı.
   - `data/` kökte olmalı.
3. Commit edin.
4. Vercel → Deployments → Redeploy seçin.
5. Sayfayı Ctrl+F5 ile yenileyin.

Açıldığında başlıkta `BIST Radar Pro v9.4 TEMİZ` yazmalıdır. Hâlâ v8 yazıyorsa eski sürüm yayındadır.
