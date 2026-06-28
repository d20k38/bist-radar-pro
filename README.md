# BIST Radar Pro R10 — Codebase Refactor

Bu sürüm yeni yatırım/indikatör özelliği eklemez. Amaç, R9 sonrası görülen `runConfidence is not defined` gibi kırık global fonksiyon hatalarının uygulamanın tamamını durdurmasını engellemek ve projeyi modüler yapıya geçişe hazırlamaktır.

## Yapılanlar

- `js/r10-runtime.js` eklendi.
- Merkezi `BistRadar` çalışma zamanı ve modül kayıt alanı oluşturuldu.
- Global hata yakalama eklendi: tek JS hatası artık tüm uygulamayı sessizce durdurmaz, ekranda anlaşılır durum mesajı üretir.
- Eksik `runConfidence()` fonksiyonu güvenli compatibility layer ile geri eklendi.
- `runConfidence()` gerçek `/api/confidence` endpointini kullanır; random/demo veri üretmez.
- Mevcut R9.4 performans iyileştirmeleri korundu.

## Modülerleşme yönü

Bir sonraki adımda büyük inline JS parçaları şu dosyalara taşınabilir:

```text
js/core.js
js/scanner.js
js/indicator-engine.js
js/decision-engine.js
js/dashboard.js
js/portfolio.js
js/kap.js
js/simulation.js
js/formations.js
```

R10 bu geçişin ilk güvenli adımıdır: eski ekranları bozmadan merkezi runtime ve uyumluluk katmanı oluşturur.
