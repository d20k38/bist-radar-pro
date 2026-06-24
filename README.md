# BIST Radar Pro v12 Hibrit Veri Motoru

Bu sürümde veri mimarisi hibrittir:

- **Mynet Finans**: Anlık / daha güncel fiyat denemesi
- **Yahoo Finance**: Grafik ve teknik analiz için geçmiş OHLCV verisi
- **BIST Radar AI**: ADX, +DI/-DI, SuperTrend, EMA, RSI, MACD, MFI, OBV, formasyon ve risk/getiri karar motoru
- **Portföy Yönetimi**: Tarayıcı localStorage ile portföy ekle/güncelle/sil

## API uçları

- `/api/symbols`
- `/api/stock?symbol=PAPIL`
- `/api/quote?symbol=MRSHL`
- `/api/scan?limit=40`
- `/api/backtest?symbol=PAPIL&period=30`

> Not: Mynet sayfa yapısı değişirse anlık fiyat alınamayabilir. Bu durumda sistem Yahoo teknik kapanışına düşer. Sonuçlar yatırım tavsiyesi değildir.
