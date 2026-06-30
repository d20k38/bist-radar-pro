# BIST Radar Pro Professional Edition

Bu paket, BIST Radar Pro v4 Hybrid Memory tabanı üzerine hazırlanmış daha kurumsal kullanım sürümüdür.

## İçerik

- Tek API mimarisi: `api/core.js`
- Unified provider + decision engine
- Institutional Memory / IPE / TOE
- Hybrid Memory ekranı
- Supabase aktif hafıza ayar alanları
- Yerel uzun dönem arşiv JSON yedeği
- 7 gün / kota uyarı mantığı

## Kurulum

1. ZIP içeriğini GitHub projenize yükleyin.
2. `api/` içinde yalnızca `core.js` kalsın.
3. Supabase SQL Editor içinde `SUPABASE_SCHEMA.sql` dosyasını çalıştırın.
4. İki kullanım seçeneğiniz var:
   - Önerilen: Vercel Environment Variables içine `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` ekleyin.
   - Alternatif: Uygulamadaki Hybrid Memory bölümünden Supabase URL + anon key girin. Bu bilgiler yalnızca tarayıcı localStorage içinde saklanır.
5. Hybrid Memory ekranında bağlantıyı test edin ve snapshot kaydedin.

## Önemli

Service role key kesinlikle uygulamadaki anon key alanına yazılmamalıdır. Service role yalnızca Vercel ENV tarafında kullanılmalıdır.

## Tek API

Vercel Hobby sınırına takılmamak için eski `api/stock.js`, `api/scan.js`, `api/symbols.js` gibi dosyaları silin.
