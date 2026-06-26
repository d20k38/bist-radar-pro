# BIST Radar Pro v16.16 - Öğrenen AI Lite

Bu sürüm v16.15 Portföy Öneri Motoru üzerine geliştirilmiştir.

## Eklenenler

- Öğrenen AI Lite sekmesi geliştirildi.
- 5 gün, 20 gün ve 30 gün sonrası sinyal başarı analizi eklendi.
- Geçmiş performansa göre **AI güven düzeltmesi** üretildi.
- En iyi çalışan teknik kurallar ve zayıf kurallar ayrı gösterilir.
- Karar türlerine göre başarı oranı korunur.
- Yerel Sinyal Hafızası eklendi:
  - Seçili hisse sinyali tarayıcıya kaydedilebilir.
  - Fiyat, karar, skor, güven, risk, stop ve hedef saklanır.
  - Bu alan ileride gerçek veriyle başarı takibi için temel oluşturur.

## Dosya Yapısı

- `index.html` ana arayüz
- `api/learning.js` öğrenen AI endpoint'i
- `lib/learning-engine.js` öğrenme motoru
- `api/scan.js`, `api/stock.js`, `api/backtest.js` Vercel API dosyaları
- `lib/engine.js`, `lib/indicators.js`, `lib/provider.js` analiz ve veri motorları

## Not

Bu sürüm yatırım tavsiyesi değildir. Teknik analiz, backtest ve öğrenen AI sonuçları karar destek amaçlıdır.


## V16.17 - AI Yatırım Komitesi

Eklenen Altın Modül:
- Açıklanabilir AI: Karar nedenlerini uzman katmanlarıyla gösterir.
- Öğrenen Sistem: Backtest ve öğrenme düzeltmesini karar puanına ekler.
- Performans Takibi: Geçmiş sinyal başarısını komite kararına dahil eder.
- AI Yatırım Komitesi: Teknik Analist, Temel Analist, Haber Analisti, Risk Yöneticisi ve Öğrenen AI uzmanlarından nihai karar üretir.

Yeni endpoint:
- `/api/committee?symbol=PAPIL`
