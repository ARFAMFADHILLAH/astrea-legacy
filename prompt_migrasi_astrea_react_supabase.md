# PROMPT MIGRASI: Astrea Legacy (PHP + MySQL) → React.js + Supabase

Kamu adalah senior full-stack engineer. Tugasmu memigrasikan aplikasi **Astrea Legacy / Astrea Kuyy** (website jual-beli motor klasik) dari **PHP native + MySQL** ke **React.js + Supabase**, tanpa mengubah tampilan dan alur kerja yang sudah ada.

Source code lama ada di folder `astrea_fix_output/` (PHP) beserta dump `astreaya (1).sql`. **Baca semua file PHP dulu sebelum menulis kode apa pun.** Jangan menebak: kalau ada yang ambigu, tanya aku dulu.

---

## 1. Kondisi aplikasi lama (hasil analisis)

**Stack lama:** PHP native (mysqli, tanpa framework), MariaDB, login berbasis `$_SESSION`, foto disimpan di folder `uploads/`, satu file CSS besar `style.css` (~63 KB).

### Halaman & fitur

| File lama | Fungsi | Akses |
|---|---|---|
| `index.php` | Landing page: hero + banner (dari tabel `pengaturan`), statistik (jumlah Ready/Terjual/total), katalog motor status `Ready`, section Tentang, section Jual Motor, peta Google Maps, chatbot FAQ (client-side, jawaban hardcoded di JS, ujungnya kirim ke WhatsApp), ikon sosmed | Publik |
| `detail.php?id=` | Detail motor: galeri foto (maks 6) + lightbox, foto bareng pembeli (untuk yang terjual) | Publik |
| `jual.php` | Form pengajuan jual motor (nama, WA, motor, tahun, kondisi, keterangan, harga harapan, multi-foto), submit via fetch/AJAX → JSON, toast sukses/gagal, preview foto. Juga menampilkan 6 motor terakhir berstatus `Terjual` sebagai bukti | Publik |
| `pengajuan_detail.php?id=` | Detail pengajuan (dikirim ke penjual lewat link WhatsApp saat ditolak/disetujui) | Publik via link |
| `login.php`, `register.php`, `proses_login.php`, `proses_register.php`, `logout.php` | Auth admin (foto profil opsional saat register) | Publik |
| `admin_dashboard.php?menu=` | Dashboard admin dengan menu: **produk**, **pengajuan**, **stok**, **pengeluaran**, **banner**, **profil**. Ada kartu statistik: total unit, ready, terjual, total pengeluaran, total pendapatan (SUM harga Terjual), nilai stok (SUM harga Ready) | Admin |
| `tambah_produk.php` | Tambah motor (multi-foto maks 6, status) | Admin |
| `edit_harga.php?id=` | Edit motor: 6 slot foto (ganti/hapus per slot, pilih cover), foto pembeli, status. Kalau status berubah ke `Terjual` → otomatis insert ke `pemasukan` (kategori "Penjualan Motor") | Admin |
| `hapus_produk.php?id=` | Hapus motor + hapus file fotonya + catat `log_stok` jenis `keluar` | Admin |
| `laporan.php?tab=uang\|barang` | Laporan kas (gabungan `pemasukan` + `pengeluaran`) dan laporan barang (`log_stok`), filter rentang tanggal, tambah & hapus entri manual | Admin |
| `export_laporan.php` | Ekspor laporan ke Excel (saat ini hanya HTML table dengan header `application/vnd.ms-excel`) | Admin |
| `kelola_user.php` | Daftar user + toggle role `admin` ⇄ `user` (tidak boleh mengubah akun sendiri) | Admin |
| `pengajuan_terbaru.php` | Endpoint JSON yang di-polling dashboard untuk notifikasi pengajuan `pending` baru | Admin |
| `wa_config.php` | Konfigurasi Fonnte (token masih kosong, jadi praktis tidak aktif) + helper `kirimWA` | Internal |
| `helper.php` | Helper foto (maks 6, fallback `astrea.jpeg`), URL peta, ikon SVG, auto-migrasi kolom `foto_pembeli` | Internal |

### Alur penting yang harus tetap sama

1. **Pengajuan jual:** pengunjung isi form → insert `pengajuan_jual` (status `pending`) + upload foto → admin dapat notifikasi di dashboard.
2. **Setujui pengajuan:** insert baris baru ke `produk` (status `Ready`, harga = `harga_harapan`, deskripsi disusun dari "Kondisi: ..." + keterangan + kalimat "Motor hasil pengajuan jual dari pelanggan, sudah diverifikasi admin Astrea Kuyy."), isi `pengajuan_jual.produk_id`, ubah status jadi `disetujui`. **Tolak:** status jadi `ditolak`. Setelah itu dashboard menampilkan banner sukses dengan tombol **wa.me** berisi pesan siap kirim ke penjual (pesan setuju memuat link `detail` produk, pesan tolak memuat link `pengajuan_detail`). Admin yang memilih kapan mengirim, tidak ada redirect paksa. Ada juga aksi "tandai sudah dihubungi" (`sudah_dihubungi`) dan hapus pengajuan (beserta fotonya).
3. **Motor terjual:** ubah status ke `Terjual` → otomatis catat pemasukan. Tambah motor → catat `log_stok` `masuk`. Hapus motor → catat `log_stok` `keluar`.
4. **Role:** hanya `admin` yang boleh masuk dashboard. User non-admin yang login melihat halaman "Akses Terbatas".

### Skema database lama (MySQL)

- `users` (id, username unik, password **MD5**, role enum admin/user, foto_profil)
- `produk` (id, nama_motor, tahun, harga, deskripsi, foto = **string nama file dipisah koma**, status 'Ready'/'Terjual', foto_pembeli)
- `pengajuan_jual` (id, nama_penjual, wa_penjual, nama_motor, tahun, kondisi, keterangan, harga_harapan, foto = string dipisah koma, status pending/disetujui/ditolak, created_at, produk_id, sudah_dihubungi)
- `pengaturan` (id, foto_banner), selalu 1 baris
- `pemasukan` dan `pengeluaran` (id, keterangan, jumlah, kategori, tanggal, created_at)
- `log_stok` (id, nama_motor, jenis masuk/keluar, jumlah, tanggal, keterangan, created_at)

---

## 2. Masalah di kode lama yang JANGAN dibawa ke versi baru

Perbaiki ini selama migrasi, dan beri tahu aku di ringkasan akhir:

1. **Password MD5** → pakai **Supabase Auth** (email + password). Password lama tidak bisa dimigrasi, jadi akun admin dibuat ulang (lihat bagian 6).
2. **Registrasi publik otomatis jadi `admin`** (`proses_register.php` meng-insert role `admin`). Ini celah serius: siapa pun yang daftar langsung punya akses penuh. Di versi baru, akun baru **default `user`** dan hanya admin yang bisa menaikkan role lewat halaman Kelola User. Pertahankan halaman register hanya kalau aku konfirmasi masih mau.
3. **SQL injection / query string mentah** → semua akses data lewat supabase-js (query terparameter) + **Row Level Security**.
4. **Pengecekan hak akses hanya di sisi halaman** → pindahkan ke RLS di database. Frontend hanya menyembunyikan menu, bukan pengaman utama.
5. **Auto-migrasi kolom saat runtime** (`SHOW COLUMNS ... ALTER TABLE`) → semua kolom didefinisikan di migration SQL.
6. **Aksi destruktif lewat GET** (`hapus_produk.php?id=`, `?hapus_pengajuan=`, `?hapus_uang=`) → ganti jadi aksi dengan dialog konfirmasi (mutation, bukan link).
7. **Foto sebagai string dipisah koma** → pakai kolom `text[]` (atau tabel `produk_foto` kalau lebih rapi, jelaskan pilihanmu).
8. **Nomor WA, alamat, dan koordinat peta hardcoded** (`+62895321022558`, `MAPS_ALAMAT`, `MAPS_LAT/LNG` kosong) → pindahkan ke satu file config / tabel `pengaturan` agar mudah diubah.
9. **Polling `pengajuan_terbaru.php`** → ganti dengan **Supabase Realtime** (subscribe insert di `pengajuan_jual`).
10. **Ekspor "Excel" palsu (HTML table)** → buat ekspor `.xlsx` sungguhan (SheetJS) atau minimal `.csv`, sisi client.
11. **`wa_config.php` (Fonnte)**: token kosong sehingga tidak aktif. **Jangan** masukkan token apa pun ke frontend. Pertahankan alur `wa.me` yang sudah jalan; integrasi Fonnte hanya boleh nanti lewat Supabase Edge Function kalau aku minta.

---

## 3. Target stack

- **Vite + React** (fungsional + hooks), **React Router** untuk routing
- **@supabase/supabase-js** untuk Auth, Database, Storage, Realtime
- **TanStack Query** untuk fetching/caching/mutation
- Bahasa: **JavaScript** (kecuali aku minta TypeScript)
- **Styling: pertahankan `style.css` yang ada** supaya tampilan identik. Boleh dipecah per komponen, tapi jangan didesain ulang. Kalau ada CSS inline di tiap file PHP, pindahkan ke file CSS yang sesuai.
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` di `.env` (sertakan `.env.example`). **Jangan pernah** memakai `service_role` key di frontend.
- Deploy target: Vercel (tambahkan `vercel.json` rewrite agar React Router tidak 404 saat refresh).

### Struktur routing

```
/                    → Beranda (hero, katalog, tentang, jual, peta, chatbot)
/motor/:id           → Detail motor
/jual                → Form pengajuan jual
/pengajuan/:id       → Detail pengajuan (untuk link WA ke penjual)
/login   /register
/admin               → Dashboard (tab: produk, pengajuan, stok, pengeluaran, banner, profil)
/admin/produk/baru   → Tambah motor
/admin/produk/:id    → Edit motor
/admin/laporan       → Laporan kas & barang
/admin/user          → Kelola user
```

Semua rute `/admin/*` dibungkus komponen `RequireAdmin` (cek session + role dari tabel `profiles`).

---

## 4. Desain Supabase

Buat satu file migration: `supabase/migrations/0001_init.sql`.

### Tabel

- `profiles` (id uuid PK = `auth.users.id`, username unik, role `'admin' | 'user'` default `'user'`, foto_profil, created_at). Dibuat otomatis lewat **trigger** saat user baru register.
- `produk` (id bigint identity, nama_motor, tahun, harga, deskripsi, foto `text[]`, foto_pembeli, status `'Ready' | 'Terjual'` dengan CHECK, created_at)
- `pengajuan_jual` (id **uuid** default `gen_random_uuid()`, nama_penjual, wa_penjual, nama_motor, tahun, kondisi, keterangan, harga_harapan bigint, foto `text[]`, status `'pending' | 'disetujui' | 'ditolak'`, created_at, produk_id FK ke `produk` ON DELETE SET NULL, sudah_dihubungi boolean)
- `pengaturan` (id, foto_banner, plus kolom config lain kalau dipakai: wa_admin, alamat, lat, lng)
- `pemasukan`, `pengeluaran` (id, keterangan, jumlah, kategori, tanggal date, created_at)
- `log_stok` (id, nama_motor, jenis `'masuk' | 'keluar'`, jumlah, tanggal, keterangan, created_at)

### Logika di database (bukan di frontend)

- Fungsi `is_admin()` (SECURITY DEFINER) dipakai di semua policy.
- **Trigger** pada `produk`: INSERT → catat `log_stok` masuk; DELETE → catat `log_stok` keluar; UPDATE status `Ready`→`Terjual` → insert `pemasukan` ("Penjualan motor {nama}", kategori "Penjualan Motor"). Ini menggantikan logika yang tersebar di `tambah_produk.php`, `edit_harga.php`, dan `hapus_produk.php`.
- **RPC `setujui_pengajuan(p_id uuid)`**: dalam satu transaksi, insert produk (aturan deskripsi seperti alur lama), update pengajuan jadi `disetujui` + isi `produk_id`, return id produk. Hanya admin.
- **RPC `get_pengajuan_publik(p_id uuid)`**: return data pengajuan untuk halaman `/pengajuan/:id` tanpa membuka SELECT publik ke seluruh tabel.
- Tabel `pengaturan` baru: seed 1 baris.

### RLS (aktifkan di SEMUA tabel)

- `produk`: SELECT publik; INSERT/UPDATE/DELETE hanya admin.
- `pengajuan_jual`: **INSERT** untuk anon dan authenticated (dengan CHECK status = 'pending', sudah_dihubungi = false, produk_id null); SELECT/UPDATE/DELETE hanya admin.
- `pengaturan`: SELECT publik; UPDATE admin.
- `pemasukan`, `pengeluaran`, `log_stok`: semua operasi hanya admin.
- `profiles`: user boleh SELECT/UPDATE profilnya sendiri **kecuali kolom role**; admin boleh SELECT semua dan UPDATE role user lain (bukan dirinya sendiri).

### Storage

Bucket publik `motor` (foto produk, foto pembeli, banner) dan `profil` (foto profil), serta bucket `pengajuan`:
- Upload ke `motor`/banner: hanya admin.
- Upload ke `pengajuan`: boleh anon (hanya INSERT), batasi tipe (jpg/jpeg/png/webp) dan ukuran (mis. maks 5 MB per file), nama file unik (uuid).
- Hapus file: hanya admin.
- Saat motor dihapus atau foto diganti, hapus file lama di Storage setelah database sukses (urutan yang sama seperti kode lama).

---

## 5. Cara kerja (WAJIB diikuti)

Kerjakan **bertahap**. Di akhir tiap fase, berhenti, ringkas apa yang selesai, dan tunggu aku bilang lanjut.

**Fase 0 — Audit.** Baca semua file PHP, lalu tulis ringkasan pemahamanmu + daftar pertanyaan (misal: apakah register publik masih dipertahankan?). Jangan tulis kode dulu.

**Fase 1 — Database.** Tulis `0001_init.sql` (tabel, trigger, RPC, RLS, bucket + policy) dan `seed.sql`. Jelaskan cara menjalankannya di Supabase SQL Editor.

**Fase 2 — Fondasi frontend.** Scaffold Vite + React, client Supabase, router, `AuthProvider`, `RequireAdmin`, layout publik & admin, impor `style.css`.

**Fase 3 — Halaman publik.** Beranda (hero + banner, statistik, katalog, tentang, jual, peta, chatbot FAQ, tombol WA), detail motor + lightbox, form jual (preview foto, upload ke Storage, toast, validasi), halaman pengajuan.

**Fase 4 — Auth.** Login, register (sesuai keputusan di Fase 0), logout, halaman "Akses Terbatas" untuk non-admin.

**Fase 5 — Admin.** Dashboard (statistik + semua tab), tambah/edit/hapus motor (6 slot foto, cover, foto pembeli), alur pengajuan lengkap (setujui/tolak, banner WA, tandai dihubungi, hapus, notifikasi realtime), laporan kas & barang + ekspor xlsx, kelola user, profil & ganti foto, ganti banner.

**Fase 6 — Migrasi data & finalisasi.** Skrip import data lama, upload foto ke Storage, README (setup, env, deploy), checklist uji.

### Aturan kode

- Komponen kecil dan reusable (`ProdukCard`, `FotoGallery`, `Lightbox`, `Toast`, `ConfirmDialog`, `StatCard`, `DateRangeFilter`, dll). Pisahkan `pages/`, `components/`, `hooks/`, `lib/`.
- Semua teks UI tetap **Bahasa Indonesia** dengan nuansa yang sama dengan versi lama (pesan toast, alert, template pesan WA, jawaban chatbot). Salin persis dari kode PHP, jangan dikarang ulang.
- Format rupiah dan tanggal Indonesia (`Intl.NumberFormat('id-ID')`, tanggal Indonesia seperti di `export_laporan.php`).
- Tangani loading, error, dan empty state di setiap query.
- Responsif seperti versi lama (cek media query di `style.css`).
- Jangan menambah fitur di luar daftar ini. Kalau ada ide perbaikan, catat di bagian "Saran" di ringkasan, jangan langsung dikerjakan.

---

## 6. Migrasi data

- Dump `astreaya (1).sql` hanya berisi data kecil (2 produk, 4 user, 1 pengeluaran, 1 banner) dan **kemungkinan sudah usang** dibanding isi folder `uploads/` (nama file foto di dump berbeda dengan yang ada di folder). **Tanyakan aku untuk dump terbaru** sebelum menulis skrip import. Jangan mengandalkan dump ini sebagai data final.
- Folder `uploads/` berisi banyak file duplikat (subfolder `WhatsApp Unknown ...` berisi salinan foto yang sama + 2 video `.mp4`). **Upload hanya file yang benar-benar direferensikan** oleh kolom `foto`, `foto_pembeli`, `foto_banner`, dan `foto_profil` di database. Video tidak dipakai di kode, jangan diupload kecuali aku minta.
- Skrip import (Node.js, pakai `service_role` key dari env lokal, **jangan di-commit**): baca dump terbaru → insert ke tabel baru → upload foto ke Storage → tulis ulang kolom foto menjadi path/URL Storage → laporkan jumlah baris & file yang berhasil/gagal.
- **User/admin:** password MD5 tidak bisa dipindah. Buat ulang akun admin lewat Supabase Auth (Dashboard → Authentication → Add user) dan set `profiles.role = 'admin'` untuk akunku. Berikan langkah persisnya di README.

---

## 7. Checklist uji (isi di akhir tiap fase yang relevan)

- [ ] Pengunjung anon bisa melihat katalog & detail, **tidak bisa** SELECT `pengajuan_jual`, `pemasukan`, dll. (uji langsung dengan anon key)
- [ ] Pengunjung anon bisa kirim pengajuan + upload foto; file non-gambar / terlalu besar ditolak
- [ ] User biasa (role `user`) tidak bisa masuk `/admin` dan tidak bisa menulis ke tabel admin walau memanggil API langsung
- [ ] User tidak bisa menaikkan role-nya sendiri
- [ ] Setujui pengajuan menghasilkan produk `Ready` dengan deskripsi yang sama seperti versi lama + banner WA yang benar
- [ ] Ubah status ke `Terjual` membuat pemasukan otomatis (hanya sekali, bukan tiap edit)
- [ ] Tambah/hapus motor mencatat `log_stok`
- [ ] Notifikasi pengajuan baru muncul realtime tanpa refresh
- [ ] Laporan: filter tanggal, tambah/hapus entri, ekspor xlsx berisi data yang benar
- [ ] Refresh di rute dalam (mis. `/motor/10`) tidak 404 di produksi
- [ ] Tidak ada `service_role` key di bundle frontend maupun di git

Mulai dari **Fase 0**.
