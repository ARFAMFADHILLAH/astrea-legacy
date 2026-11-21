-- ============================================================================
-- 0004 — Data pembeli dicatat saat unit dikonfirmasi terjual.
--
-- Pengunjung tidak punya akun. Data pembeli diisi admin di halaman edit produk
-- ketika status diubah ke "Terjual". Disimpan sebagai kolom di tabel produk
-- supaya sederhana dan sejalan dengan kolom foto_pembeli yang sudah ada.
--
-- Aman dijalankan berulang.
-- ============================================================================

alter table public.produk
  add column if not exists nama_pembeli   text,
  add column if not exists wa_pembeli     text,
  add column if not exists alamat_pembeli text,
  add column if not exists tanggal_terjual date;

comment on column public.produk.nama_pembeli is 'Diisi admin saat unit dikonfirmasi terjual.';
comment on column public.produk.wa_pembeli is 'Nomor WhatsApp pembeli, format apa adanya (boleh 08...).';
comment on column public.produk.alamat_pembeli is 'Alamat pengiriman / domisili pembeli.';
comment on column public.produk.tanggal_terjual is 'Tanggal unit terjual (bisa beda dari tanggal pemasukan otomatis).';

-- Data pembeli tidak boleh ikut terbaca pengunjung.
-- Sebelumnya anon punya SELECT setingkat tabel, jadi kolom baru otomatis
-- terbuka. Ganti dengan grant per kolom: hanya kolom katalog.
revoke select on public.produk from anon;
grant select (id, nama_motor, tahun, harga, deskripsi, foto, foto_pembeli, status, created_at)
  on public.produk to anon;
