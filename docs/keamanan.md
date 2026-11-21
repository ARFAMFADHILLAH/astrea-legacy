# Uji Keamanan Login & Akses Admin

Terakhir diuji: 21 November 2026

Login memakai **Supabase Auth** (email + password). Tidak ada SQL yang dirangkai
dari input pengguna. Batas keamanan yang sebenarnya adalah **RLS + grant** di
PostgreSQL, bukan tampilan React — jadi menyembunyikan menu atau mengubah
JavaScript di browser tidak memberi akses ke data admin.

## Ringkasan hasil

| Uji | Hasil | Bukti |
|---|---|---|
| Injeksi SQL di form login (`' OR 1=1 --`, UNION, dsb.) | Aman | Auth menolak dengan `Invalid login credentials`, bukan error SQL |
| Buka `/admin` tanpa sesi | Aman | Dialihkan ke beranda + modal login |
| Buka `/admin` dengan akun non-admin | Aman | Sesi langsung di-logout, profil non-admin tidak dipakai |
| Token JWT palsu / diubah di localStorage | Aman | HTTP 401 dari PostgREST |
| Anon membaca `profiles`, pembeli, pengajuan, kas, stok | Aman | HTTP 401 |
| Anon update/hapus produk, pengaturan, profil, pengajuan | Aman | HTTP 401 (grant tulis hanya `authenticated` + RLS admin) |
| Anon memanggil `setujui_pengajuan`, `set_user_role`, `import_legacy` | Aman | HTTP 401 |
| Anon upload/hapus file di bucket `motor`/`profil` | Aman | Ditolak policy Storage |
| `service_role` bocor di build | Aman | `npm run cek:keamanan` memindai `dist/assets` |
| Pendaftaran akun publik lewat API | Aman | `disable_signup=true` (diverifikasi 21 Nov 2026) |
| RPC `cek_username_tersedia` bisa dipanggil anon | Aman | Dicabut migrasi `0005`, sekarang HTTP 401 |
| Akun non-admin bisa membaca kolom pembeli | Aman | SELECT `produk` untuk `authenticated` dibatasi `is_admin()` (migrasi `0005`) |

Hasil akhir: `npm run cek:keamanan` → **34 lulus, 0 gagal**;
`npm run cek:rls` → **15/15 lulus**; uji Playwright login admin + panel Data
User lulus tanpa error console.

## Status penerapan

1. **Pendaftaran publik dimatikan** — `disable_signup=true`, terverifikasi lewat
   `/auth/v1/settings`.
2. **Migrasi `0005_security_hardening.sql` sudah dijalankan** di SQL Editor.
3. **Verifikasi:**
   ```bash
   npm run cek:keamanan
   npm run cek:rls
   ```
   Keduanya lulus tanpa `GAGAL`.

## Yang sudah diperbaiki di kode

- Pesan login tidak lagi membedakan "email belum diverifikasi" vs "password
  salah", supaya tidak bisa dipakai menebak email yang terdaftar.
- `vercel.json` menambahkan header keamanan: CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  dan HSTS. CSP hanya mengizinkan script dari domain sendiri, koneksi ke
  Supabase, serta iframe Google Maps.
- Migrasi `0005`:
  - Katalog tetap publik untuk `anon`; `authenticated` hanya admin yang boleh
    membaca `produk` (menutup data pembeli untuk akun non-admin).
  - Upload/ubah foto profil hanya admin dan hanya di folder miliknya.
  - RPC `cek_username_tersedia` ditutup.

## Rekomendasi lanjutan (belum dikerjakan)

- Pakai password admin yang panjang dan unik (20+ karakter) atau password
  manager. Aktifkan **Leaked Password Protection** di Supabase Auth.
- Aktifkan MFA/TOTP untuk akun admin bila tersedia di paket Supabase.
- Periksa **Authentication → Rate Limits** agar percobaan login dibatasi.
  Supabase sudah membatasi secara default, tetapi nilainya bisa disesuaikan.
- Form publik `/jual` bisa dikirimi pengajuan/upload berulang oleh bot. Kalau
  mulai disalahgunakan, tambahkan captcha atau batas unggahan per IP.
- Cadangkan database **dan** isi Storage; repo hanya berisi kode.

## Catatan

- Halaman `/login` memang tidak ada; URL itu menampilkan "Halaman Tidak
  Ditemukan".
- Kunci `anon` memang publik dan aman dipakai di frontend. Yang tidak boleh
  masuk frontend adalah `service_role`.
- Uji dengan akun non-admin asli (bukan mock) memerlukan akun uji yang dibuat
  admin di Dashboard. Alur UI-nya sudah diuji dengan Playwright: akun non-admin
  ditolak dan sesinya langsung dihapus.
