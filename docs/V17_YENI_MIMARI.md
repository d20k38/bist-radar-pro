# BIST Radar Pro V17 Yeni Mimari

## Ana karar

Vercel Hobby planında en fazla 12 Serverless Function sınırı olduğu için bundan sonra yeni `api/*.js` dosyası eklenmeyecek.

## Yeni yapı

Yeni modüller `js/plugins/` altında çalışır:

- `js/plugins/pluginLoader.js`
- `js/plugins/dipHunter.js`

## Sunucu tarafı

Mevcut API dosyaları korunur. Yeni modül eklemek için yeni API dosyası oluşturulmaz.

## İlk eklenti

- 🎯 Dip Avcısı AI

Bu modül tamamen tarayıcı tarafında çalışır, Vercel Function sayısını artırmaz.
