-- ============================================================================
-- 0002 — Perbaikan grant untuk pengunjung (anon).
--
-- Hasil uji anon key pada database aktif: INSERT ke pengajuan_jual ditolak
-- "permission denied for table pengajuan_jual", sehingga form /jual gagal
-- sebelum RLS sempat dievaluasi. Grant kolom di 0001_init.sql belum terpasang
-- di database tersebut (file sudah benar, database tertinggal).
--
-- Aman dijalankan berulang.
-- ============================================================================

-- anon hanya boleh mengisi kolom yang memang datang dari form.
-- id, status, produk_id, sudah_dihubungi, created_at tetap tertutup.
grant insert (nama_penjual, wa_penjual, nama_motor, tahun, kondisi, keterangan, harga_harapan, foto)
  on public.pengajuan_jual to anon, authenticated;

-- Pastikan pembacaan publik yang dibutuhkan halaman beranda tetap ada.
grant select on public.produk to anon, authenticated;
grant select on public.pengaturan to anon, authenticated;

-- Pastikan policy upload foto pengajuan untuk anon ada (dibuat ulang dari 0001).
drop policy if exists astrea_storage_pengajuan_insert on storage.objects;
create policy astrea_storage_pengajuan_insert
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'pengajuan'
    and storage.extension(name) = any (array['jpg', 'jpeg', 'png', 'webp'])
  );
