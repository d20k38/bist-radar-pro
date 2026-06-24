# BIST Radar Pro v11.1 Tüm BIST

Bu sürümde tarama 46 sembolle sınırlı değildir.

## Değişiklikler
- `/api/symbols` artık önce Mynet Finans “Borsa İstanbul’da İşlem Gören Tüm Hisseler” sayfasından sembolleri dinamik almaya çalışır.
- Mynet erişilemezse `data/symbols.json` yedek liste olarak kullanılır.
- `/api/scan?limit=all` tüm bulunan sembolleri tarar.
- `/api/scan` seri çalışmaz; 10 paralel istekle daha hızlı tarama yapar.
- Arayüzde “Tüm BIST Tara” düğmesi artık `/api/scan?limit=all` çağırır.

## Not
Tüm BIST taraması çok sayıda Yahoo Finance isteği yaptığı için Vercel planına ve ağ hızına bağlı olarak zaman aşımı yaşanabilir. Bu durumda `/api/scan?limit=200` gibi kademeli tarama kullanılabilir.
