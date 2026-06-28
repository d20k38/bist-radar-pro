# BIST Radar Pro R2 – Karar Motoru

Taban: R1 Veri Katmanı.

## Amaç
Yeni ekran/özellik eklemeden, R1'de kurulan Master Stock Object verisini tek bir AI Final Decision motoruna bağlamak.

## Yapılanlar
- `lib/decision-layer.js` eklendi.
- `/api/decision` artık `R2_DECISION_SINGLE` ve `R2_DECISION_BATCH` şemasıyla karar üretir.
- `/api/scan` artık `R2_DECISION_SCAN` şemasıyla Master Object + karar satırını birlikte döndürür.
- AL / TUT / SAT mantığı tek yerden üretildi.
- Güven, risk, IQS, Day, Swing, Pozisyon, Kurumsal, KAP, Financial, Learning ve Backtest katmanları tek puanda birleşti.
- Duplicate/0 sonuç sorununa yol açan eski cache formatlarına bağımlılık azaltıldı.
- Random/pseudo veri eklenmedi.

## Not
Bu sürüm yatırım tavsiyesi üretmez; gerçek OHLC/hacim ve mevcut veri katmanlarına dayalı karar destek skoru üretir.


## R7 Indicator Engine
- `lib/indicator-engine.js` eklendi.
- OHLC/hacim verilerinden geniş gösterge paketi tek merkezde hesaplanır.
- Master Stock Object içine `layers.indicators` ve `metrics.indicatorCount` bağlandı.
- Yeni API eklenmedi, random/demo veri eklenmedi.
