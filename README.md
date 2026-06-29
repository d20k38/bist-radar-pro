# BIST Radar Pro v1.2 Unified Master Object

Bu sürümde tüm ana ekranlar aynı standart Master Object veri modeline bağlandı.

## Değişiklikler
- `v12UnifiedMaster()` istemci tarafı standartlaştırma katmanı eklendi.
- Hisse Analizi, R28A Trading Cockpit, Explainable AI ve karşılaştırma modülleri aynı alan adlarını okuyacak şekilde düzenlendi.
- `price / lastPrice / close`, `decision / action`, `aiScore / score / finalScore`, `confidence / confidencePct`, `target / target1 / target2 / stop` alanları tek şemada toplandı.
- R28A Trading Cockpit artık gerçek Master Object ve OHLCV verisini okuyarak grafik, giriş, stop ve hedef alanlarını doldurur.
- `0,00 TL`, `Grafik verisi bekleniyor`, `undefined` gibi fallback durumları sadece gerçekten veri yoksa görünür.
- API function sayısı yine 1: `api/core.js`.

## Not
Demo/random veri eklenmedi. Veriler mevcut gerçek OHLCV sağlayıcı zincirinden okunur.
