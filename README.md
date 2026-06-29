# BIST Radar Pro R23 – Core Schema Standard

Bu sürüm yeni özellik kalabalığı eklemez; sistemin tüm ekranlarında aynı standart Master Object şemasını kullanır.

## Yapılanlar
- `dipScore`, `trendScore`, `momentumScore`, `moneyScore`, `confidencePct`, `riskScore` gibi alanlar standartlaştırıldı.
- Eski modüllerdeki `Cannot read properties of undefined` tipindeki alan okuma hatalarına karşı güvenli erişim fonksiyonları eklendi.
- Hisse Analizi ve Explainable AI ekranlarına seçilen hisseye ait indikatör tablosu eklendi.
- EMA, RSI, MACD, RVOL, VWAP, CMF, MFI, ATR, IQS, Day/Swing/Pozisyon/Kurumsal/Dip skorları tek panelde gösterilir.
- API function sayısı 1 olarak korunur: `api/core.js`.
