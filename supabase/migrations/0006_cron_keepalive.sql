-- ============================================================================
-- 0006_cron_keepalive.sql — Cron job agar project Supabase tidak di-pause.
-- 
-- Supabase free tier mem-pause project setelah 7 hari tidak ada aktivitas DB.
-- Cron ini menjalankan query ringan setiap 6 jam untuk menjaga project aktif.
--
-- Butuh ekstensi pg_cron (sudah tersedia di Supabase).
-- Aman dijalankan berulang.
-- ============================================================================

-- Aktifkan ekstensi pg_cron (kalau belum)
create extension if not exists pg_cron;

-- Hapus job lama kalau ada (aman dijalankan berulang)
select cron.unschedule('keepalive_ping') where exists (
  select 1 from cron.job where jobname = 'keepalive_ping'
);

-- Buat job baru: jalankan setiap 6 jam
-- Query sederhana: update timestamp di tabel pengaturan (tanpa ubah data nyata)
select cron.schedule(
  'keepalive_ping',
  '0 */6 * * *',  -- setiap 6 jam: 00:00, 06:00, 12:00, 18:00 UTC
  $$
  update public.pengaturan
  set updated_at = now()
  where id = 1;
  $$
);

-- Verifikasi: cek job terdaftar
-- select * from cron.job where jobname = 'keepalive_ping';

-- Log eksekusi (bisa dicek di Supabase → Logs → Database → cron)
-- select * from cron.job_run_details where jobname = 'keepalive_ping' order by start_time desc limit 10;