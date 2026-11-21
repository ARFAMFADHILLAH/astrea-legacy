# Checklist Uji

Status per **21 November 2026**. `[x]` = sudah diuji dan lulus, `[ ]` = belum diuji.

Uji otomatis: `npm run cek:rls` (RLS anon) dan `npm run cek:keamanan` (login,
token, tulis anon, storage, pindai build). Keduanya memakai anon key dari `.env`
dan tidak menulis data.

## A. RLS & keamanan

| Uji | Status | Bukti |
|---|---|---|
| Anon bisa melihat katalog produk | [x] | `GET /rest/v1/produk` → 200 |
| Anon bisa membaca `pengaturan` (WA, alamat, banner) | [x] | `GET /rest/v1/pengaturan` → 200 |
| Anon tidak bisa SELECT `pengajuan_jual` | [x] | 401 permission denied |
| Anon tidak bisa SELECT `pemasukan`, `pengeluaran`, `log_stok` | [x] | 401 permission denied |
| Anon tidak bisa SELECT `profiles` | [x] | 401 permission denied |
| Anon tidak bisa INSERT `produk` | [x] | 401 permission denied |
| Anon tidak bisa INSERT `pemasukan` | [x] | 401 permission denied |
| Anon tidak bisa mengirim pengajuan berstatus `disetujui` | [x] | 401 permission denied |
| Anon tidak bisa RPC `set_user_role` | [x] | 401 permission denied |
| Anon bisa RPC `get_pengajuan_publik` | [x] | 200 `[]` untuk id acak |
| Anon tidak bisa RPC `import_legacy` | [x] | 404 sebelum migrasi 0003 dipasang; sekarang 401 (fungsi ada) |
| Grant INSERT kolom `pengajuan_jual` untuk anon (0002) terpasang | [x] | probe tanpa tulis: insert `nama_penjual = null` → 400 NOT NULL, bukan 401 |
| Anon bisa INSERT pengajuan `pending` + upload foto | [ ] | **uji manual** lewat `/jual` (grant sudah terverifikasi) |
| File non-gambar / >5 MB ditolak | [ ] | **uji manual** di form `/jual` |
| User biasa tidak bisa membuka `/admin` | [x] | guard `RequireAdmin` + uji Fase 4 |
| User tidak bisa menaikkan role sendiri | [ ] | **uji manual** dengan akun `user` (RPC harus 401/42501) |
| Service role tidak ada di bundle | [x] | `dist/` diperiksa, tidak ada `service_role` |
| Pendaftaran akun publik dimatikan | [x] | `/auth/v1/settings` → `disable_signup=true` |
| Injeksi SQL di form login | [x] | 3 payload ditolak `Invalid login credentials`, tanpa error SQL |
| Token JWT palsu / tanpa sesi | [x] | `GET /rest/v1/profiles` → 401 |
| Anon update/hapus produk, pengaturan, profil, pengajuan | [x] | 401 semua (`cek:keamanan`) |
| Anon upload/hapus file bucket `motor`/`profil` | [x] | Ditolak policy Storage |
| RPC `cek_username_tersedia` ditutup | [x] | 401 setelah migrasi `0005` |
| Akun non-admin tidak bisa membaca `produk`/data pembeli | [x] | Policy `produk_select_admin` (`is_admin()`), migrasi `0005` |
| Admin tetap bisa membaca produk + data pembeli setelah `0005` | [x] | Playwright: form edit produk memuat nama pembeli |

Catatan temuan: pada 11 Nov 2026, `INSERT pengajuan_jual` dari anon di database aktif masih **401 permission denied** — grant kolom belum terpasang. Diperbaiki lewat `0002_perbaikan_grant_anon.sql`; per 11 Nov 2026 semua migrasi sudah dijalankan dan grant terverifikasi (`npm run cek:rls` → probe 400).

## B. Alur aplikasi (Fase 3–5)

| Uji | Status | Bukti |
|---|---|---|
| Beranda: hero, banner, statistik, katalog, tentang, peta, chatbot, WA | [x] | uji Fase 3 |
| Detail motor + galeri + lightbox | [x] | uji Fase 3 |
| Form jual: validasi, preview, upload, toast, halaman pengajuan | [x] | uji Fase 3 (mock network) |
| Login admin lewat modal di footer (email+password), logout kembali ke beranda | [x] | Playwright mock auth |
| Akun non-admin ditolak & sesinya di-logout | [x] | Playwright: pesan "Akun ini bukan admin." |
| `/login` di URL menampilkan Halaman Tidak Ditemukan | [x] | Playwright |
| `/admin` tanpa sesi kembali ke beranda + modal login terbuka | [x] | Playwright |
| Halaman `/register` dihapus (tidak ada pendaftaran pengunjung) | [x] | route & file dihapus, build lulus |
| Semua tab admin tampil (`?menu=`) | [x] | smoke test Playwright Fase 5 |
| Layout admin penuh lebar; sidebar jadi drawer di layar kecil (≤900px) | [x] | Playwright 1440 & 390: tombol ☰, overlay, Escape, auto-close saat pindah menu |
| Halaman Profil Saya rapi (foto, info akun, form password) | [x] | Playwright 1440/1200/1024/900/768/390: 2→1 kolom, form 3→1 kolom, tanpa scroll horizontal |
| Username bisa diubah dari Profil Saya (validasi + unik) | [x] | Playwright mock: sukses, <3 karakter, spasi, duplikat 23505, batal, tanpa perubahan |
| Tambah produk (multi-foto, cover) | [x] | smoke test Fase 5 |
| Edit produk (6 slot, cover, foto pembeli) | [x] | smoke test Fase 5 |
| Hapus produk + konfirmasi | [x] | smoke test Fase 5 |
| Setujui / tolak / tandai dihubungi / hapus pengajuan | [x] | smoke test Fase 5 |
| Notifikasi pengajuan realtime + bunyi + badge | [ ] | **uji manual** dengan dua browser setelah deploy |
| Laporan: filter, tambah, hapus, ekspor `.xlsx` | [x] | smoke test Fase 5 + file export terunduh |
| Kelola user: naik/turun role | [x] | smoke test Fase 5 (RPC dimock) |
| Ubah status Ready → Terjual membuat pemasukan sekali | [x] | uji trigger di PostgreSQL lokal |
| Unit terjual wajib punya nama/WA/tanggal pembeli | [ ] | **uji manual** setelah migrasi 0004: ubah status ke Terjual |
| Tab Data User (`?menu=data-user`): Pembeli & Penjual | [x] | Playwright mock: dua tab, pencarian, link WA |
| Anon tidak bisa membaca `nama_pembeli` | [x] | `GET /rest/v1/produk?select=nama_pembeli` → 401; `select=*` juga 401 |
| Tambah/hapus motor mencatat `log_stok` | [x] | uji trigger di PostgreSQL lokal |

## C. Migrasi data

| Uji | Status | Bukti |
|---|---|---|
| Parser dump MySQL (string escape, multi-baris, NULL) | [x] | `--dry-run` pada dump lama & dump contoh |
| Impor mempertahankan id produk | [x] | uji `import_legacy` di PostgreSQL 18 lokal |
| Trigger tidak membuat `log_stok`/`pemasukan` palsu saat impor | [x] | uji lokal: 0 baris setelah impor 2 produk |
| Sequence kembali ke posisi benar setelah impor | [x] | insert berikutnya dapat id `max + 1` |
| Reset (`--clear`) mengosongkan 5 tabel & restart identity | [x] | uji lokal |
| Banner & foto pengajuan dipetakan ke Storage | [x] | uji `--dry-run` (path `motor/banner/...`, `pengajuan/...`) |
| Impor dump **terbaru** ke Supabase | [—] | **dilewati** (keputusan: database mulai kosong) |
| Foto lama tampil di katalog/detail setelah impor | [—] | dilewati bersama impor data |
| Akun admin baru bisa login | [ ] | setelah dibuat di Supabase Auth |

## D. Build & deploy

| Uji | Status | Bukti |
|---|---|---|
| `npm run build` sukses | [x] | chunk utama 643 kB, `xlsx` 423 kB terpisah |
| `vercel.json` rewrite SPA | [x] | file ada |
| Refresh di rute dalam saat produksi | [ ] | uji setelah deploy (`/motor/10`) |
| Environment Vercel hanya URL + anon key | [ ] | atur saat deploy |

## E. Langkah manual berikutnya

1. Jalankan `0002_perbaikan_grant_anon.sql` di SQL Editor (wajib — tanpa ini form `/jual` 401).
2. Buat akun admin (README bagian 3).
3. Tambah produk pertama lewat `/admin?menu=produk` dan ganti banner lewat `/admin?menu=banner`.
4. Kirim satu pengajuan dari `/jual` dengan foto, lalu setujui dari dashboard.
5. Buka dua tab admin, kirim pengajuan dari browser lain, pastikan toast + bunyi + badge muncul tanpa refresh.
6. Deploy ke Vercel, buka `/motor/<id>` lalu refresh.
7. (Opsional) Impor data lama kapan saja dengan `npm run import:lama -- "dump.sql" --dry-run` — lihat README bagian 5.
