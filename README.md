# BIST Radar Pro R22 - Unified Master Object

Bu sürüm yeni modül eklemez; alan adı uyuşmazlıklarını düzeltir.

## Yapılanlar
- Tek standart Master Object şeması eklendi.
- API tarafında `one()` çıktısı `normalizeMasterObject()` ile standartlaştırıldı.
- Hisse Analizi ekranı için `analysis` alias paketi üretildi.
- `decision/action`, `price/close/lastPrice`, `score/finalScore/aiScore`, `confidence/confidencePct/confidenceScore`, `risk/riskScore`, `target/target1`, `stop` alanları tekleştirildi.
- Hisse Analizi, Karar Merkezi, Explainable AI, Day Trading ve Portföy ekranlarının aynı veri modelini okuyabilmesi hedeflendi.
- `undefined`, `% -`, `- TL` gibi görünümlerin temel sebebi olan alan uyuşmazlığı azaltıldı.
- API function sayısı yine 1: `api/core.js`.

## Not
GitHub/Vercel içinde `api/` klasöründe sadece `core.js` kalmalıdır. `lib/` kök dizinde olmalıdır.
