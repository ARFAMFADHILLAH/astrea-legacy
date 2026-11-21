# Astrea Legacy — React + Supabase

Versi React dari aplikasi jual-beli motor klasik **Astrea Legacy/Kuyy**. Tampilan, teks, dan alur mengikuti aplikasi PHP lama; backend pindah ke Supabase (Postgres + Auth + Storage + Realtime).

File PHP lama, dump SQL, dan folder foto aslinya ada di **`referensi-php/`** dan hanya **referensi**; tidak dipakai lagi. Yang di-deploy hanya hasil `npm run build` (`dist/`).

## Stack

- Vite + React 19 (JavaScript)
- React Router
- TanStack Query
- `@supabase/supabase-js`
- SheetJS (`xlsx`) — dimuat dinamis saat ekspor laporan

## Struktur penting

```
src/pages/          halaman publik & admin
src/components/     komponen bersama (ProdukCard, Toast, ConfirmDialog, tab admin…)
src/hooks/          query Supabase (useAdminData, useAuth)
src/lib/            supabase client, upload, format, ekspor laporan
src/styles/app.css  tambahan CSS di luar style.css lama
supabase/           migrasi SQL + seed
scripts/            impor data lama & cek RLS
referensi-php/      aplikasi PHP lama + dump SQL + uploads (hanya referensi)
public/uploads/     gambar runtime (astrea.jpeg, pemilik.jpeg)
```

## 1. Setup lokal

Prasyarat: Node.js 20.19+ (atau 22.12+) dan npm.

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi dari Supabase Dashboard → **Project Settings → API**:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Hanya dua variabel itu yang boleh ada di frontend. **Jangan** menaruh `service_role` key di `.env`, kode, atau Vercel.

Jalankan:

```bash
npm run dev
```

## 2. Menyiapkan database Supabase

Buka **SQL Editor** di dashboard Supabase, lalu jalankan berurutan:

1. `supabase/migrations/0001_init.sql` — tabel, trigger, RPC, RLS, bucket Storage, realtime.
2. `supabase/seed.sql` — satu baris `pengaturan` (WA, alamat, sosmed).
3. `supabase/migrations/0002_perbaikan_grant_anon.sql` — grant INSERT pengajuan untuk pengunjung. **Wajib**, tanpa ini form `/jual` gagal dengan `permission denied`.
4. `supabase/migrations/0003_import_legacy.sql` — helper impor data lama (`import_legacy`).
5. `supabase/migrations/0004_data_pembeli.sql` — kolom data pembeli (`nama_pembeli`, `wa_pembeli`, `alamat_pembeli`, `tanggal_terjual`) + kunci kolom publik supaya data pembeli tidak terbaca pengunjung.
6. `supabase/migrations/0005_security_hardening.sql` — pengerasan akses: pembacaan produk oleh akun login dibatasi admin, upload foto profil hanya admin, RPC cek username ditutup.

Kalau `0001_init.sql` dan `seed.sql` sudah pernah dijalankan saat pengembangan, cukup jalankan `0002` sampai `0005`.

Kalau nanti mengubah skema lagi, tambahkan file `0006_...sql` dan jalankan juga.

### Cocokkan URL Auth

Di **Authentication → URL Configuration** isi:

- Site URL: `https://domain-kamu.com` (atau `http://localhost:5173` saat lokal)
- Redirect URLs: `https://domain-kamu.com/**`, `http://localhost:5173/**`

Tidak ada pendaftaran publik: akun dibuat oleh admin lewat dashboard Supabase (lihat bagian 3), jadi email konfirmasi tidak dipakai di alur aplikasi.

## 3. Membuat akun admin

Password lama (MD5) tidak bisa dipindah ke Supabase Auth, jadi akun dibuat ulang:

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Isi email dan password, centang **Auto Confirm User**, simpan.
3. Trigger `on_auth_user_created` otomatis membuat baris di `profiles` (username dari metadata atau bagian sebelum `@` email).
4. Jadikan admin lewat SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where username = 'admin';
   ```

   Ganti `'admin'` dengan username yang terbentuk. Cek dulu:

   ```sql
   select id, username, role from public.profiles order by created_at;
   ```

5. Login admin lewat tombol **🔒 Login Admin** di footer. Form login muncul sebagai modal (bukan halaman `/login`) dan memakai **email + password**.
6. Setelah password benar, role akun dicek. Hanya **admin** yang boleh masuk; akun non-admin langsung di-logout dengan pesan "Akun ini bukan admin."
7. Admin lain bisa dinaikkan lewat halaman `/admin/user` (RPC `set_user_role`), bukan lewat UPDATE langsung.

Pengunjung **tidak** mendaftar dan tidak punya akun. Tidak ada rute `/login`: mengetik `/login` di URL menampilkan "Halaman Tidak Ditemukan", dan membuka `/admin` tanpa hak akan kembali ke beranda sambil membuka modal login. Satu-satunya pintu masuk admin adalah tombol di footer.

## 4. Deploy ke Vercel

1. Push repo ke GitHub (tanpa `.env`, `.env.migrasi`, `referensi-php/uploads/`, `dist/`, `node_modules/`).
2. Vercel → **Add New Project** → import repo.
3. Framework: Vite. Build command `npm run build`, output `dist`.
4. Environment Variables (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `vercel.json` sudah berisi rewrite SPA:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

   Tanpa ini, refresh di `/motor/10` akan 404.
6. Setelah domain jadi, perbarui **Site URL** dan **Redirect URLs** di Supabase Auth.

`referensi-php/uploads/` berisi video `.mp4` dan duplikat foto dari server lama. Video tidak dipakai kode dan **tidak perlu** di-deploy. Jangan tertukar dengan `public/uploads/`, yang berisi gambar runtime React.

## 5. Migrasi data lama (opsional)

Lihat `docs/checklist-uji.md` untuk status uji fitur & keamanan.
Lihat `DEPLOY.md` untuk panduan deploy tim (ringkas, siap pakai).

**Keputusan saat ini: data lama tidak diimpor — database mulai kosong, produk diisi lewat dashboard admin.** Langkah di bawah tetap disimpan kalau nanti ingin memindahkan riwayat lama.

### Siapkan dump terbaru

Dump `referensi-php/astreaya (1).sql` **usang** (foto yang dirujuk tidak ada di `referensi-php/uploads/`). Ekspor ulang dari phpMyAdmin:

- Database `astreaya` → **Export** → format SQL → semua tabel → simpan, misalnya `migrasi/astreaya-terbaru.sql`.

Pastikan dump berisi `INSERT` untuk tabel `produk`, `pengajuan_jual`, `pemasukan`, `pengeluaran`, `log_stok`, `pengaturan`, dan `users`.

### Siapkan kunci migrasi

```powershell
Copy-Item .env.migrasi.example .env.migrasi
```

Isi `.env.migrasi` dengan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API). File ini sudah di-`.gitignore` dan hanya dibaca script Node — jangan pernah dipakai di browser.

### Jalankan

```powershell
# lihat dulu apa yang akan diimpor, tanpa menulis apa pun
npm run import:lama -- "migrasi/astreaya-terbaru.sql" --dry-run

# impor sungguhan (mengosongkan 5 tabel data dulu)
npm run import:lama -- "migrasi/astreaya-terbaru.sql" --clear
```

Yang dilakukan script:

- Membaca dump MySQL (phpMyAdmin) tanpa dependency tambahan.
- Mengunggah **hanya foto yang dirujuk** kolom `foto`, `foto_pembeli`, `foto_banner`, dan `foto` pengajuan. Nama file baru memakai UUID.
  - produk → `motor/<uuid>.jpg`
  - foto pembeli → `motor/pembeli/<uuid>.jpg`
  - banner → `motor/banner/<uuid>.jpg`
  - pengajuan → `pengajuan/<uuid>.jpg`
- Menulis ulang kolom foto menjadi path Storage (`bucket/namafile`).
- **Mempertahankan id lama** produk, pemasukan, pengeluaran, dan log stok, jadi link `/motor/10` tetap menunjuk unit yang sama.
- Mengimpor riwayat `log_stok`/`pemasukan` apa adanya; trigger produk dimatikan sementara lewat `import_legacy` supaya tidak menambah riwayat palsu.
- Melewati tabel `users` (password MD5 tidak bisa dipindah) dan menampilkan daftar username lama di akhir.
- Melaporkan jumlah baris per tabel, foto yang terupload, dan file yang hilang.

Opsi:

| Opsi | Arti |
|---|---|
| `--dry-run` | baca & laporkan saja, tanpa upload/insert |
| `--clear` | kosongkan produk, pengajuan, pemasukan, pengeluaran, log stok sebelum impor |
| `--uploads <folder>` | lokasi foto lama (default `./referensi-php/uploads`) |

Kalau ada foto hilang, script menampilkan daftarnya. Salin file tersebut ke `referensi-php/uploads/` lalu ulangi dengan `--clear`.

Menjalankan ulang `--clear` mengosongkan tabel, tetapi **tidak** menghapus file yang sudah terlanjur diunggah ke Storage. Kalau perlu bersih-bersih, hapus objek di bucket `motor`/`pengajuan` lewat dashboard Supabase sebelum mengimpor ulang.

### Setelah impor

1. Login admin, cek `/admin?menu=produk`, `/admin?menu=pengajuan`, `/admin/laporan`, dan halaman beranda.
2. Buka satu produk yang punya beberapa foto — pastikan urutan dan cover benar.
3. Cek banner di beranda (menu **Ganti Banner**).
4. Ganti password akun admin bila perlu.

## 6. Perintah

```bash
npm run dev         # server lokal (toko + panel dalam satu origin)
npm run build:public  # build situs toko → deploy ke Vercel
npm run build:admin   # build panel admin → deploy ke Cloudflare Pages
npm run preview     # cek hasil build
npm run cek:rls     # uji RLS dengan anon key (tidak mengubah data)
npm run cek:keamanan  # uji login, token, tulis anon, storage, header build
npm run import:lama -- "dump.sql" --dry-run
```

### Deploy dua-duanya (satu repo, dua hosting)

| | Vercel (toko publik) | Cloudflare Pages (panel admin) |
|---|---|---|
| Domain | `toko-anda.com` (custom) | `nama-proyek.pages.dev` (default Cloudflare) |
| Build command | `npm run build:public` | `npm run build:admin` |
| Output directory | `dist` | `dist` |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_MODE=admin`, `VITE_PUBLIC_URL=https://toko-anda.com` |
| SPA fallback | otomatis (`vercel.json`) | `public/_redirects` |
| Security headers | `vercel.json` | `public/_headers` |

**Langkah:**

1. **Vercel**: Import repo → framework Vite → build command `npm run build:public` → env vars Supabase → deploy.
2. **Cloudflare Pages**: Connect repo → framework Vite → build command `npm run build:admin` → output `dist` → Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_MODE=admin`, `VITE_PUBLIC_URL=https://domain-vercel-anda.com` → NODE_VERSION=22 (Settings → Build) → Deploy.
3. **Supabase → Authentication → URL Configuration**: Site URL = domain admin (`xxx.pages.dev`), Redirect URLs = kedua domain.
4. (Opsional tapi disarankan) **Cloudflare Zero Trust → Access**: buat Application self-hosted untuk hostname panel, policy allow email admin saja — supaya `xxx.pages.dev` benar-benar terkunci.

## 7. Aturan penting

- `service_role` key hanya untuk `scripts/import-legacy.mjs` lewat `.env.migrasi`. Jangan pernah dimasukkan ke bundle, `.env`, atau environment Vercel.
- Role user tidak bisa diubah lewat UPDATE; gunakan RPC `set_user_role` dari halaman Kelola User.
- Logika stok & pemasukan produk ada di trigger `produk_after_change`. Frontend tidak boleh insert manual ke `log_stok`/`pemasukan` saat tambah/edit/hapus produk.
- Path foto di database selalu `bucket/namafile` (mis. `motor/abc.jpg`), bukan URL penuh.
- Hapus file Storage dilakukan **setelah** operasi database sukses.
- Data pembeli hanya ada di kolom `produk`. Pengunjung (anon) diberi SELECT per kolom katalog, jadi **query publik wajib menyebut kolom** (`select('id, nama_motor, ...')`), jangan `select('*')` — kalau tidak, PostgREST menolak dengan `permission denied`. Akun login non-admin juga tidak bisa membaca `produk` (RLS memakai `is_admin()`), sehingga data pembeli hanya terbuka untuk admin.
- Unit `Terjual` wajib punya nama pembeli, WhatsApp, dan tanggal terjual. Isian ini muncul otomatis di form tambah/edit saat status diubah ke Terjual, dan datanya tampil di `/admin?menu=data-user` (bagian Pembeli). Penjual yang pengajuannya disetujui tampil di bagian Penjual pada menu yang sama.

## 8. Keamanan

Login memakai Supabase Auth (email + password), sehingga tidak ada SQL yang dirangkai dari input. Batas akses sebenarnya ada di RLS + grant, bukan di tampilan React.

**Untuk proyek ini sudah diterapkan** (per 21 Nov 2026, `cek:keamanan` 34/34 lulus):

1. `supabase/migrations/0005_security_hardening.sql` sudah dijalankan.
2. Supabase Dashboard → **Authentication → Providers → Email** → **Allow new users to sign up** sudah dimatikan. Tanpa ini, endpoint signup tetap terbuka walau tombol register sudah dihapus.
3. Sisanya yang masih disarankan: password admin panjang dan unik, serta **Leaked Password Protection** di Supabase Auth.

Kalau menyiapkan proyek Supabase baru, ulangi langkah 1–2.

Uji ulang kapan saja:

```bash
npm run cek:keamanan
npm run cek:rls
```

Header keamanan untuk deploy diatur di `vercel.json` (CSP, anti-clickjacking, HSTS). Rincian temuan dan rekomendasi ada di `docs/keamanan.md`.

## 9. Catatan

- Halaman admin memakai query `?menu=` (`produk`, `stok`, `data-user`, `pengeluaran`, `banner`, `pengajuan`, `profil`) seperti URL lama. Tambah/edit motor, laporan, dan kelola user tetap rute sendiri (`/admin/produk/baru`, `/admin/produk/:id`, `/admin/laporan`, `/admin/user`).
- Layout admin memakai lebar penuh. Di layar ≤900px sidebar berubah menjadi drawer dengan tombol ☰, overlay gelap, dan tombol Escape; drawer menutup sendiri saat pindah menu. Kartu statistik 6 kolom di desktop, 3 kolom ≤1400px, 2 kolom ≤900px, dan 1 kolom ≤380px.
- Menu **Data User** menggabungkan dua sumber: pembeli dari unit `Terjual` (kolom `produk`) dan penjual dari `pengajuan_jual` berstatus `disetujui`.
- Username admin bisa diubah sendiri di **Profil Saya** (tombol Ubah pada baris Username). Aturannya 3–30 karakter, tanpa spasi, dan unik tanpa membedakan huruf besar/kecil; nama di topbar langsung ikut berubah setelah disimpan.
- Pengunjung tidak punya akun dan tidak ada halaman register/login publik. Data pembeli tercatat saat admin mengonfirmasi unit terjual; data penjual tercatat sejak pengajuan dikirim dan baru masuk Data User setelah disetujui.
- Notifikasi pengajuan baru memakai Supabase Realtime (bukan polling), plus bunyi, toast, badge, dan prefix jumlah pending di judul tab.
- Dua definisi "pendapatan" di laporan lama dipertahankan apa adanya; belum disatukan.
- Ide perbaikan dicatat, belum dikerjakan: pemisahan rute admin per menu, pagination katalog, kompresi foto produk, dan penggabungan definisi pendapatan.
