# BIST Radar Pro v3.0 Institutional Memory & Prediction

Eklenenler:
- Institutional Memory Engine (IME)
- Günlük snapshot kaydı (tarayıcı localStorage)
- 1/3/5/10/20 günlük outcome güncelleme
- Pattern başarı haritası
- Institutional Prediction Engine (IPE) aday listesi
- Hafıza JSON indir/yükle

Not: Vercel serverless ortamında kalıcı disk yazımı olmadığı için hafıza tarayıcı localStorage ve JSON dışa/İçe aktarım ile çalışır. Kalıcı merkezi arşiv için sonraki aşamada Supabase/SQLite benzeri veritabanı bağlanmalıdır.
