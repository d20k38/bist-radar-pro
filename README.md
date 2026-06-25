# BIST Radar Pro v16.10 - KAP/Haber AI

Bu sürüm v16.9 Öğrenen AI üzerine KAP/Haber katmanı ekler.

## Eklenenler
- `/api/kap` endpointi
- `lib/news-engine.js` duyarlılık ve etki puanlama motoru
- `data/kap-news.json` güvenli örnek veri deposu
- Arayüzde `📢 KAP/Haber AI` sekmesi
- Günlük AI raporunda KAP/Haber etki özeti
- Hisse bazlı ve genel haber filtreleme

## Not
Bu paket canlı KAP kazıma yapmaz. KAP/Haber verileri `data/kap-news.json` içinden okunur. Canlı KAP veya güvenilir haber API anahtarı eklendiğinde `/api/kap` aynı JSON sözleşmesiyle genişletilebilir.
