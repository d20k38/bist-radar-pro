# BIST Radar Pro R15 Core Stabilization

Bu sürüm yeni özellik eklemez. Amaç çekirdek veri zincirini stabilize etmektir.

## Odak
- Symbols → OHLCV → Indicator → Decision → Master Object zinciri denetlenir.
- /api/core?action=scan artık stageSummary ve diagnostic alanları döndürür.
- Başarılı analiz 0 ise hata yutulmaz; ilk hata sebepleri ekrana aktarılır.
- API function sayısı 1 olarak korunur: api/core.js.

## Not
Eğer başarılı analiz yine 0 ise R14/R15 Diagnostic Mode ile şu URL kontrol edilmelidir:
/api/core?action=diagnostic&symbol=PAPIL
