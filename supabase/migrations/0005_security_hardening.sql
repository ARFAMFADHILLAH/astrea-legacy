-- ============================================================================
-- 0005 — Pengerasan setelah uji keamanan login.
--
-- Login sendiri memakai Supabase Auth (email + password), jadi tidak ada SQL
-- yang dirangkai dari input. Batas keamanan sebenarnya ada di RLS + grant,
-- bukan di tampilan React. Migrasi ini menutup sisa celah:
--
--   1. Katalog produk tetap publik untuk anon, tetapi akun `authenticated`
--      non-admin tidak bisa membaca produk sama sekali. Sebelumnya siapa pun
--      yang berhasil mendaftar (signup Supabase masih terbuka) bisa membaca
--      nama/WA/alamat pembeli karena grant kolom pembeli diberikan ke semua
--      `authenticated`.
--   2. Upload/hapus foto profil hanya untuk admin (akun dashboard).
--   3. RPC cek_username_tersedia tidak dipakai lagi sejak register dihapus;
--      cabut aksesnya supaya tidak bisa dipakai menebak username.
--
-- Aman dijalankan berulang.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SELECT produk: anon = katalog publik, authenticated = admin saja.
-- ----------------------------------------------------------------------------
drop policy if exists produk_select_public on public.produk;
drop policy if exists produk_select_anon on public.produk;
drop policy if exists produk_select_admin on public.produk;

create policy produk_select_anon
  on public.produk for select to anon
  using (true);

create policy produk_select_admin
  on public.produk for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Foto profil hanya admin, tetap dibatasi ke folder miliknya sendiri.
-- ----------------------------------------------------------------------------
drop policy if exists astrea_storage_profil_insert on storage.objects;
create policy astrea_storage_profil_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );

drop policy if exists astrea_storage_profil_update on storage.objects;
create policy astrea_storage_profil_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  )
  with check (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 3. RPC cek username (sisa alur register lama) ditutup.
-- ----------------------------------------------------------------------------
revoke all on function public.cek_username_tersedia(text) from public, anon, authenticated;
