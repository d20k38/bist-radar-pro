# BIST Radar Pro R14 Diagnostic Mode

Bu sürüm yeni yatırım özelliği eklemez. Amaç, veri zincirindeki kırılma noktasını görünür hale getirmektir.

## Eklenenler
- `/api/core?action=diagnostic` endpointi
- Hisse bazlı sembol → OHLCV → hacim → indicator → karar motoru denetimi
- OHLC derinliği, pozitif hacim sayısı, RVOL, VWAP, CMF, MFI kontrolü
- Dashboard içinde R14 Diagnostic Mode sekmesi
- Diagnostic CSV dışa aktarım

## API Yapısı
Vercel Hobby sınırı için yalnızca `api/core.js` function olarak kalır. `lib/` kök dizindedir.

## Not
Random/demo veri eklenmedi. Veri eksikse eksik aşama açıkça raporlanır.
