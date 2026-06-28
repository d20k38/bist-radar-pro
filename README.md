# BIST Radar Pro R20 – Explainable AI 2.0 + Sade Karar Merkezi

Bu sürüm R19 çalışan veri/indikator/karar çekirdeği üzerine kuruldu.

## Yapılanlar
- R20 Explainable AI 2.0 ekranı öne alındı.
- Gereksiz/tekrarlı üst sekmeler sadeleştirildi.
- Ana sekmeler: Karar Merkezi, R20 Explainable AI, Day Trading AI, Hisse Analizi, Portföy Radarım, Radar Lab, Backtest, KAP/Haber AI, Dip Avcısı PRO.
- R20 açıklama motoru gerçek Master Stock Object + Indicator Engine + Decision Engine çıktısından çalışır.
- AI puan katkıları: Trend, Momentum, Hacim/RVOL, Kurumsal Para, IQS, Risk Kontrolü, Likidite.
- Pozitif nedenler, karşıt görüş/riskler, trafik ışığı ve karar izi gösterilir.
- Dashboard güven sütunu `confidencePct` ile düzeltildi; artık 0 kalmaması hedeflendi.
- API function sayısı 1 olarak korunur: `api/core.js`.
- Random/demo veri eklenmedi.

## Vercel Notu
GitHub'da `api/` içinde yalnızca `core.js` kalmalı. Eski endpoint dosyaları build hatasına sebep olur.
