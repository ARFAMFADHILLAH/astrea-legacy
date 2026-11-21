# Astrea Legacy — Panduan Deploy Tim (Ringkas)

> **Stack**: Vite + React 19 + Supabase (PostgreSQL + Auth + Storage + Realtime)
> **Dua deployment, satu repo, satu database.**

---

## 1. Environment Variables

| Variable | Vercel (Toko) | Cloudflare Pages (Admin) | Keterangan |
|---|---:|---:|---|
| `VITE_SUPABASE_URL` | ✅ | ✅ | Dari Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ | Public anon key, aman di frontend |
| `VITE_APP_MODE` | ❌ (default `public`) | ✅ `admin` | Menentukan build mana yang dijalankan |
| `VITE_PUBLIC_URL` | ❌ | ✅ `https://domain-vercel-anda.com` | Link "Lihat Toko" di panel admin |

**Contoh `.env` lokal (dev):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_MODE=all
VITE_PUBLIC_URL=http://localhost:5173
```

---

## 2. Database (Supabase) — Jalanin sekali saja

Buka **SQL Editor** → jalankan berurutan:

1. `supabase/migrations/0001_init.sql` — tabel, RLS, RPC, bucket, realtime
2. `supabase/seed.sql` — baris `pengaturan` (WA, alamat, sosmed)
3. `supabase/migrations/0002_perbaikan_grant_anon.sql` — grant INSERT pengajuan
4. `supabase/migrations/0003_import_legacy.sql` — helper impor data lama
5. `supabase/migrations/0004_data_pembeli.sql` — kolom pembeli + grant per kolom
6. `supabase/migrations/0005_security_hardening.sql` — pengerasan akses (admin only)
7. `supabase/migrations/0006_cron_keepalive.sql` — **cron job ping tiap 6 jam biar project ga di-pause**

> Semua file aman dijalankan berulang.

---

## 3. Supabase Auth Settings

**Authentication → Providers → Email**
- ✅ Enable Email provider
- ❌ **Allow new users to sign up** → **MATIKAN** (sudah dimatikan, cek: `disable_signup=true`)

**Authentication → URL Configuration**
| Field | Value |
|---|---|
| Site URL | `https://xxx.pages.dev` (domain admin Cloudflare) |
| Redirect URLs | `https://xxx.pages.dev/**`, `https://domain-vercel-anda.com/**` |

---

## 4. Deploy Vercel (Situs Publik)

1. Import repo GitHub/GitLab
2. Framework Preset: **Vite**
3. Build Command: `npm run build:public`
4. Output Directory: `dist`
5. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
6. Deploy → dapat domain `https://toko-anda.vercel.app`

> `vercel.json` sudah handle SPA rewrite + security headers (CSP, HSTS, dll.)

---

## 5. Deploy Cloudflare Pages (Panel Admin)

1. Connect repo → Framework: **Vite**
2. Build Command: `npm run build:admin`
3. Build Output Directory: `dist`
4. **Environment Variables** (Settings → Environment variables):
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_APP_MODE=admin
   VITE_PUBLIC_URL=https://toko-anda.vercel.app
   ```
5. **Build settings** → `NODE_VERSION=22` (Vite 8 butuh Node 20.19+)
6. Deploy → dapat domain `https://nama-proyek.pages.dev`

> `public/_redirects` + `public/_headers` sudah handle SPA rewrite + security headers.

---

## 6. (Sangat Disarankan) Kunci Panel Admin — Cloudflare Zero Trust

Domain `xxx.pages.dev` itu publik. Siapa pun yang tahu URL bisa buka halaman login.

**Aktifkan Cloudflare Access (gratis ≤50 user):**
1. Zero Trust Dashboard → Access → Applications → Add an application → Self-hosted
2. Application Domain: `nama-proyek.pages.dev` (subdomain root)
3. Policy: **Allow** → Emails → masukkan email admin saja
4. Save.

Sekarang panel admin benar-benar terkunci — tidak bisa dibuka tanpa login Cloudflare Access.

---

## 7. Perintah Berguna

```bash
npm run dev           # dev server (toko + panel di localhost:5173)
npm run build:public  # build untuk Vercel
npm run build:admin   # build untuk Cloudflare Pages
npm run preview       # cek hasil build lokal
npm run cek:rls       # uji RLS (anon key) — 15 cek, harus semua OK
npm run cek:keamanan  # uji login, token, storage, build — 34 cek, harus semua OK
```

---

## 8. Alur Kerja Tim

| Aksi | File/Tempat |
|---|---|
| Ubah tampilan toko | `src/pages/Beranda.jsx`, `src/pages/DetailMotor.jsx`, `src/styles/app.css` |
| Ubah panel admin | `src/pages/admin/*.jsx`, `src/components/admin/*.jsx` |
| Tambah kolom DB | Buat migrasi `supabase/migrations/0006_*.sql` → jalankan di SQL Editor |
| Ubah validasi form | `src/pages/JualMotor.jsx`, `src/pages/admin/ProdukBaru.jsx`, `ProdukEdit.jsx` |
| Ganti banner/foto | Upload lewat panel admin (menu **Ganti Banner** / **Kelola Produk**) |
| Lihat log error | Browser DevTools Console + Supabase Dashboard → Logs |

---

## 9. Catatan Penting

- **Jangan pernah** masukin `service_role` key ke frontend/env Vercel/Cloudflare. Hanya untuk `scripts/import-legacy.mjs` lewat `.env.migrasi` lokal.
- Data pembeli ada di kolom `produk` (`nama_pembeli`, `wa_pembeli`, `alamat_pembeli`, `tanggal_terjual`). Hanya admin yang bisa baca (RLS `is_admin()`).
- Role user **tidak bisa diubah lewat UPDATE** — pakai RPC `set_user_role` dari halaman **Kelola User**.
- Foto disimpan sebagai path `bucket/namafile` (mis. `motor/abc.jpg`), bukan URL penuh.
- Hapus file Storage **setelah** operasi DB sukses.
- Query publik **wajib** menyebut kolom eksplisit (`select('id, nama_motor, ...')`), jangan `select('*')` — akan 401.
- **Cron keepalive** sudah ada di migrasi `0006` (pg_cron tiap 6 jam). Project Supabase free tier tidak akan di-pause.

---

## 10. Kontak / Bantuan

- Repo: (isi URL repo tim)
- Supabase Project: `tqtslkueramdwvtqzles` (region Singapore)
- Vercel Project: (isi nama project)
- Cloudflare Pages Project: (isi nama project)

---

**Versi**: 21 Nov 2026 — Siap produksi. Semua tes keamanan & RLS lulus.