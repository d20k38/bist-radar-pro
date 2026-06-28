# BIST Radar Pro V31 Trading Center & IQS

V30 AI Learning Engine tabanı korunarak V31 Trading Center eklendi.

## Eklenenler
- Day Trading, Swing Trading, Pozisyon Trading, Scalping, AI Trading tek merkezde
- Institutional Quality Score (IQS) 0-100
- IQS katmanları: trend, hacim, momentum, dip, KAP, backtest/learning, risk, likidite
- AI Model Portföyleri: Dengeli, Momentum, Muhafazakar, Pozisyon, Dip Avcısı
- Radar Lab / Strategy Optimizer bağlantısı
- Kopya Trading yerine BIST için uygulanabilir AI Model Portföy yaklaşımı

Yeni API eklenmedi; Vercel Hobby 12 API sınırı korunur. Demo/random veri kullanılmaz.


## V32 AI Trade Planner
- V31.2 tabanı korunmuştur.
- Trade Planner sekmesi eklendi.
- Seçili hisse için AL/TUT/SAT karar çerçevesi, giriş aralığı, stop, hedefler ve risk/getiri planı üretir.
- Day Trading liderinden doğrudan plan oluşturulabilir.
- Yeni API eklenmedi; 12 API sınırı korunur.
- Random/pseudo veri eklenmedi.

## V32.1 AI Karar Motoru
- AI Decision Center / Karar Motoru eklendi.
- Dip Avcısı listesinde aynı hissenin tekrar etmesi engellendi.
- Dip mesafesi, AI Final, IQS, Day, Kurumsal, başarı ve karar sütunları eklendi.
- Her hisse tek satırda AL/TUT/SAT kararına bağlandı.
- Her satırdan Explain ve Trade Planner açılır.
- Yeni API eklenmedi; Vercel Hobby sınırı için 12 endpoint korundu.
