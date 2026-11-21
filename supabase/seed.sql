-- ============================================================================
-- Seed awal Astrea Legacy.
-- Jalankan setelah 0001_init.sql.
-- Aman dijalankan ulang: baris pengaturan tidak akan terduplikasi.
-- ============================================================================

insert into public.pengaturan (id, foto_banner, wa_admin, alamat, lat, lng, facebook, tiktok)
values (
  1,
  null, -- diisi lewat menu "Ganti Banner" di dashboard
  '62895321022558',
  'Kp. Warung Jengkol No. 29, RT 002/RW 013, Penggangsaan Dua, Kelapa Gading, Kota Administrasi Jakarta Utara, DKI Jakarta',
  null, -- isi lat/lng kalau ingin peta memakai titik koordinat
  null,
  'https://www.facebook.com/aditiya.dwi.658673',
  'https://www.tiktok.com/@astrea.kuyy'
)
on conflict (id) do nothing;
