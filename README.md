# BIST Radar Pro v4.0 Hybrid Memory Architecture

Bu sürüm, v3.1 Tomorrow Opportunity Engine üzerine **Hybrid Memory Architecture** ekler.

## Mantık

- **Supabase Aktif Hafıza:** Günlük kullanım, hızlı sorgu, son dönem snapshot verileri.
- **Yerel / Harici Arşiv:** Uzun dönem öğrenme hafızası. 7 gün ile sınırlanmaz.
- **Learning Tables:** Pattern başarıları ve istatistikler uzun vadeli öğrenmeyi taşır.

## Yeni bölüm

Üst menüde **🗄️ Hybrid Memory** sekmesi eklendi.

Buradan:

- Bugünkü snapshot hibrit hafızaya kaydedilir.
- Supabase bağlantısı kontrol edilir.
- Yerel arşiv JSON indirilebilir.
- 7 gün/kota uyarıları izlenir.

## Supabase ENV

Vercel ortam değişkenleri:

```txt
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Service role key güvenli şekilde sadece serverless API içinde kullanılır. Frontend'e yazılmaz.

## SQL

`SUPABASE_SCHEMA.sql` dosyasını Supabase SQL Editor'da çalıştırın.

## API

Tek function korunur:

```txt
api/core.js
```

Yeni action'lar:

```txt
/api/core?action=memory_status
/api/core?action=memory_save
/api/core?action=memory_list
```

## 7 gün konusu

7 günlük süre öğrenmeyi sınırlamaz. Sistem uzun dönem öğrenmeyi yerel/harici arşivde korur; Supabase sadece aktif çalışma hafızasıdır.
