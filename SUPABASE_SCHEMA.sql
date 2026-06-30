-- BIST Radar Pro v4.0 Hybrid Memory Architecture
-- Supabase aktif hafıza tabloları. Uzun dönem öğrenme yerel/harici arşivle sınırlanmaz.

create table if not exists public.bist_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  symbol text not null,
  close numeric,
  volume numeric,
  ai_score numeric,
  ios numeric,
  risk numeric,
  confidence numeric,
  rvol numeric,
  cmf numeric,
  mfi numeric,
  vwap numeric,
  decision text,
  raw jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_bist_snapshots_date_symbol on public.bist_snapshots(snapshot_date, symbol);
create index if not exists idx_bist_snapshots_created_at on public.bist_snapshots(created_at desc);
create index if not exists idx_bist_snapshots_symbol on public.bist_snapshots(symbol);

create table if not exists public.bist_memory_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  message text not null,
  severity text default 'info',
  created_at timestamptz default now(),
  resolved boolean default false
);

-- İsteğe bağlı görünüm: son kayıt ve toplam aktif hafıza özeti
create or replace view public.bist_memory_stats as
select
  count(*)::bigint as snapshot_rows,
  count(distinct snapshot_date)::bigint as snapshot_days,
  count(distinct symbol)::bigint as symbols,
  min(snapshot_date) as first_snapshot_date,
  max(snapshot_date) as last_snapshot_date,
  max(created_at) as last_inserted_at
from public.bist_snapshots;

-- Uyarı amaçlı temizlik sorgusu. Otomatik silme zorunlu değildir.
-- 7 gün öğrenmeyi sınırlandırmaz; sadece aktif hafıza/kota kontrolü için kullanılabilir.
-- delete from public.bist_snapshots where created_at < now() - interval '90 days';
