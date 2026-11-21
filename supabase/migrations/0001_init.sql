-- ============================================================================
-- Astrea Legacy — migrasi awal PHP/MySQL -> Supabase
-- Jalankan di Supabase SQL Editor SETELAH project dibuat.
-- Urutan: file ini dulu, lalu seed.sql.
-- Aman dijalankan ulang (idempotent) untuk tabel, bucket, dan policy.
-- ============================================================================

-- ============================================================================
-- 1. TABEL
-- ============================================================================

-- Profil publik pelengkap auth.users. Dibuat otomatis lewat trigger di bagian 4.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  role         text not null default 'user' check (role in ('admin', 'user')),
  foto_profil  text,
  created_at   timestamptz not null default now()
);

-- Username unik tanpa membedakan huruf besar/kecil (meniru collation MySQL lama).
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- Motor yang dijual. foto menyimpan path Storage berurutan ("motor/xxx.jpeg");
-- elemen pertama = foto utama/cover.
create table if not exists public.produk (
  id           bigint generated always as identity primary key,
  nama_motor   text not null,
  tahun        int,
  harga        bigint not null default 0 check (harga >= 0),
  deskripsi    text not null default '',
  foto         text[] not null default '{}' check (cardinality(foto) <= 6),
  foto_pembeli text,
  status       text not null default 'Ready' check (status in ('Ready', 'Terjual')),
  created_at   timestamptz not null default now()
);

-- Pengajuan jual dari pengunjung. id UUID supaya link /pengajuan/:id tidak bisa ditebak.
create table if not exists public.pengajuan_jual (
  id                uuid primary key default gen_random_uuid(),
  nama_penjual      text not null,
  wa_penjual        text not null,
  nama_motor        text not null,
  tahun             int not null,
  kondisi           text not null default '',
  keterangan        text not null default '',
  harga_harapan     bigint not null default 0 check (harga_harapan >= 0),
  foto              text[] not null default '{}' check (cardinality(foto) <= 5),
  status            text not null default 'pending'
                    check (status in ('pending', 'disetujui', 'ditolak')),
  produk_id         bigint references public.produk (id) on delete set null,
  sudah_dihubungi   boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Satu baris konfigurasi toko (banner, WA, alamat, peta, sosmed).
create table if not exists public.pengaturan (
  id           smallint primary key default 1 check (id = 1),
  foto_banner  text,
  wa_admin     text not null default '62895321022558',
  alamat       text not null default
    'Kp. Warung Jengkol No. 29, RT 002/RW 013, Penggangsaan Dua, Kelapa Gading, Kota Administrasi Jakarta Utara, DKI Jakarta',
  lat          numeric(10, 7),
  lng          numeric(10, 7),
  facebook     text,
  tiktok       text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.pemasukan (
  id          bigint generated always as identity primary key,
  keterangan  text not null,
  jumlah      bigint not null default 0 check (jumlah >= 0),
  kategori    text not null default 'Lain-lain',
  tanggal     date not null default ((now() at time zone 'Asia/Jakarta')::date),
  created_at  timestamptz not null default now()
);

create table if not exists public.pengeluaran (
  id          bigint generated always as identity primary key,
  keterangan  text not null,
  jumlah      bigint not null default 0 check (jumlah >= 0),
  kategori    text not null default 'Lain-lain',
  tanggal     date not null default ((now() at time zone 'Asia/Jakarta')::date),
  created_at  timestamptz not null default now()
);

create table if not exists public.log_stok (
  id          bigint generated always as identity primary key,
  nama_motor  text not null,
  jenis       text not null check (jenis in ('masuk', 'keluar')),
  jumlah      int not null default 1 check (jumlah > 0),
  tanggal     date not null default ((now() at time zone 'Asia/Jakarta')::date),
  keterangan  text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEX
-- ============================================================================

create index if not exists produk_status_idx            on public.produk (status);
create index if not exists produk_created_at_idx        on public.produk (created_at desc);
create index if not exists pengajuan_status_created_idx  on public.pengajuan_jual (status, created_at desc);
create index if not exists pengajuan_produk_id_idx       on public.pengajuan_jual (produk_id);
create index if not exists pemasukan_tanggal_idx         on public.pemasukan (tanggal);
create index if not exists pengeluaran_tanggal_idx       on public.pengeluaran (tanggal);
create index if not exists log_stok_tanggal_idx          on public.log_stok (tanggal);
create index if not exists profiles_role_idx             on public.profiles (role);

-- ============================================================================
-- 3. HELPER: cek role admin
-- Security definer supaya bisa dipakai di policy dan trigger tanpa rekursi RLS.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================================
-- 4. TRIGGER: buat profil otomatis saat user baru mendaftar
-- Username diambil dari metadata "username" (dikirim frontend saat signUp),
-- fallback ke bagian sebelum @ dari email. Kalau sudah dipakai, diberi akhiran angka.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_base      text;
  v_candidate text;
  v_n         int := 0;
begin
  v_base := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  -- Aturan lama: username minimal 4 karakter.
  if length(v_base) < 4 then
    v_base := v_base || '_user';
  end if;

  v_candidate := v_base;
  while exists (select 1 from public.profiles where lower(username) = lower(v_candidate)) loop
    v_n := v_n + 1;
    v_candidate := v_base || v_n::text;
  end loop;

  insert into public.profiles (id, username) values (new.id, v_candidate);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. TRIGGER: logika stok & pemasukan produk
-- Menggantikan logika yang dulu tersebar di tambah_produk.php, edit_harga.php,
-- dan hapus_produk.php.
-- ============================================================================

create or replace function public.produk_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tanggal date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if tg_op = 'INSERT' then
    insert into public.log_stok (nama_motor, jenis, jumlah, tanggal, keterangan)
    values (new.nama_motor, 'masuk', 1, v_tanggal, 'Motor baru ditambahkan ke stok');

    if new.status = 'Terjual' then
      insert into public.pemasukan (keterangan, jumlah, kategori, tanggal)
      values ('Penjualan motor ' || new.nama_motor, new.harga, 'Penjualan Motor', v_tanggal);
    end if;

  elsif tg_op = 'UPDATE' then
    -- Hanya saat transisi Ready -> Terjual, bukan setiap kali diedit.
    if old.status = 'Ready' and new.status = 'Terjual' then
      insert into public.pemasukan (keterangan, jumlah, kategori, tanggal)
      values ('Penjualan motor ' || new.nama_motor, new.harga, 'Penjualan Motor', v_tanggal);
    end if;

  elsif tg_op = 'DELETE' then
    insert into public.log_stok (nama_motor, jenis, jumlah, tanggal, keterangan)
    values (old.nama_motor, 'keluar', 1, v_tanggal, 'Motor dihapus dari stok');
  end if;

  return null;
end;
$$;

drop trigger if exists produk_after_change on public.produk;
create trigger produk_after_change
  after insert or update or delete on public.produk
  for each row execute function public.produk_after_change();

-- ============================================================================
-- 6. TRIGGER: proteksi kolom role di profiles
-- Lapisan kedua setelah hak akses kolom. User tidak bisa menaikkan role sendiri,
-- admin tidak bisa mengubah role akunnya sendiri.
-- ============================================================================

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id <> old.id then
    raise exception 'ID profil tidak boleh diubah.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    -- auth.uid() null = dijalankan dari SQL Editor / service role, bukan dari client.
    if auth.uid() is not null and (not public.is_admin() or new.id = auth.uid()) then
      raise exception 'Role hanya bisa diubah oleh admin lain lewat halaman Kelola User.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ============================================================================
-- 7. RPC
-- ============================================================================

-- Setujui pengajuan: insert produk + update pengajuan dalam satu transaksi.
-- Deskripsi disusun persis seperti alur lama (admin_dashboard.php).
create or replace function public.setujui_pengajuan(p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pj        public.pengajuan_jual;
  v_deskripsi text;
  v_produk_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menyetujui pengajuan.' using errcode = '42501';
  end if;

  select * into v_pj from public.pengajuan_jual where id = p_id for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_pj.status <> 'pending' then
    raise exception 'Pengajuan ini sudah diproses sebelumnya.' using errcode = '22023';
  end if;

  v_deskripsi := concat_ws(
    E'\n\n',
    case when coalesce(v_pj.kondisi, '') <> '' then 'Kondisi: ' || v_pj.kondisi end,
    nullif(coalesce(v_pj.keterangan, ''), ''),
    'Motor hasil pengajuan jual dari pelanggan, sudah diverifikasi admin Astrea Kuyy.'
  );

  insert into public.produk (nama_motor, tahun, harga, deskripsi, foto, status)
  values (
    v_pj.nama_motor,
    v_pj.tahun,
    coalesce(v_pj.harga_harapan, 0),
    v_deskripsi,
    v_pj.foto,
    'Ready'
  )
  returning id into v_produk_id;

  update public.pengajuan_jual
  set status = 'disetujui', produk_id = v_produk_id
  where id = p_id;

  return v_produk_id;
end;
$$;

revoke all on function public.setujui_pengajuan(uuid) from public, anon;
grant execute on function public.setujui_pengajuan(uuid) to authenticated;

-- Data pengajuan untuk halaman publik /pengajuan/:id tanpa membuka SELECT tabel.
-- UUID tidak bisa ditebak, jadi berfungsi seperti "link rahasia".
create or replace function public.get_pengajuan_publik(p_id uuid)
returns table (
  id              uuid,
  nama_penjual    text,
  wa_penjual      text,
  nama_motor      text,
  tahun           int,
  kondisi         text,
  keterangan      text,
  harga_harapan   bigint,
  foto            text[],
  status          text,
  produk_id       bigint,
  sudah_dihubungi boolean,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pj.id, pj.nama_penjual, pj.wa_penjual, pj.nama_motor, pj.tahun,
         pj.kondisi, pj.keterangan, pj.harga_harapan, pj.foto, pj.status,
         pj.produk_id, pj.sudah_dihubungi, pj.created_at
  from public.pengajuan_jual pj
  where pj.id = p_id;
$$;

revoke all on function public.get_pengajuan_publik(uuid) from public;
grant execute on function public.get_pengajuan_publik(uuid) to anon, authenticated;

-- Cek ketersediaan username saat register (halaman lama menampilkan
-- "Username sudah digunakan! Silakan pilih username lain.").
create or replace function public.cek_username_tersedia(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.cek_username_tersedia(text) from public;
grant execute on function public.cek_username_tersedia(text) to anon, authenticated;

-- Ganti role user. Kolom role tidak bisa ditulis langsung dari client.
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengubah role.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Tidak bisa mengubah role akun sendiri.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'user') then
    raise exception 'Role tidak valid.' using errcode = '22023';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'User tidak ditemukan.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.produk         enable row level security;
alter table public.pengajuan_jual enable row level security;
alter table public.pengaturan     enable row level security;
alter table public.pemasukan      enable row level security;
alter table public.pengeluaran    enable row level security;
alter table public.log_stok       enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- produk ----------
drop policy if exists produk_select_public on public.produk;
create policy produk_select_public
  on public.produk for select to anon, authenticated
  using (true);

drop policy if exists produk_insert_admin on public.produk;
create policy produk_insert_admin
  on public.produk for insert to authenticated
  with check (public.is_admin());

drop policy if exists produk_update_admin on public.produk;
create policy produk_update_admin
  on public.produk for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists produk_delete_admin on public.produk;
create policy produk_delete_admin
  on public.produk for delete to authenticated
  using (public.is_admin());

-- ---------- pengajuan_jual ----------
-- Anon hanya boleh MENGIRIM pengajuan baru, tidak boleh membaca isinya.
drop policy if exists pengajuan_insert_public on public.pengajuan_jual;
create policy pengajuan_insert_public
  on public.pengajuan_jual for insert to anon, authenticated
  with check (status = 'pending' and sudah_dihubungi = false and produk_id is null);

drop policy if exists pengajuan_select_admin on public.pengajuan_jual;
create policy pengajuan_select_admin
  on public.pengajuan_jual for select to authenticated
  using (public.is_admin());

drop policy if exists pengajuan_update_admin on public.pengajuan_jual;
create policy pengajuan_update_admin
  on public.pengajuan_jual for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists pengajuan_delete_admin on public.pengajuan_jual;
create policy pengajuan_delete_admin
  on public.pengajuan_jual for delete to authenticated
  using (public.is_admin());

-- ---------- pengaturan ----------
drop policy if exists pengaturan_select_public on public.pengaturan;
create policy pengaturan_select_public
  on public.pengaturan for select to anon, authenticated
  using (true);

drop policy if exists pengaturan_update_admin on public.pengaturan;
create policy pengaturan_update_admin
  on public.pengaturan for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- pemasukan / pengeluaran / log_stok ----------
do $$
declare
  v_table text;
begin
  foreach v_table in array array['pemasukan', 'pengeluaran', 'log_stok'] loop
    execute format('drop policy if exists %I on public.%I', v_table || '_admin_all', v_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      v_table || '_admin_all', v_table
    );
  end loop;
end $$;

-- ---------- GRANT ----------
-- Supabase memberi grant default ke anon/authenticated; di sini dirapikan
-- supaya profiles tidak bisa ditulis sembarangan dan role tidak bisa di-update langsung.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username, foto_profil) on public.profiles to authenticated;

revoke all on public.produk from anon;
grant select on public.produk to anon, authenticated;
grant insert, update, delete on public.produk to authenticated;

revoke all on public.pengajuan_jual from anon, authenticated;
grant select, update, delete on public.pengajuan_jual to authenticated;
-- Kolom id/status/produk_id/sudah_dihubungi/created_at tidak boleh diisi client.
grant insert (nama_penjual, wa_penjual, nama_motor, tahun, kondisi, keterangan, harga_harapan, foto)
  on public.pengajuan_jual to anon, authenticated;

revoke all on public.pengaturan from anon;
grant select on public.pengaturan to anon, authenticated;
grant update on public.pengaturan to authenticated;

revoke all on public.pemasukan, public.pengeluaran, public.log_stok from anon;
grant select, insert, update, delete on public.pemasukan, public.pengeluaran, public.log_stok to authenticated;

-- Identity column butuh akses sequence untuk INSERT.
grant usage, select on all sequences in schema public to authenticated;

-- ============================================================================
-- 9. STORAGE
-- Path yang dipakai aplikasi:
--   motor/<uuid>.<ext>          foto produk, foto pembeli, banner
--   profil/<user-id>/<uuid>.<ext>
--   pengajuan/<uuid>.<ext>      foto pengajuan (dibuat anon)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('motor',     'motor',     true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('profil',    'profil',    true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('pengajuan', 'pengajuan', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Bucket sudah publik, jadi file bisa diakses lewat URL publik tanpa policy SELECT.
-- Policy SELECT di bawah hanya untuk admin yang perlu list/inspeksi dari dashboard.
drop policy if exists astrea_storage_admin_read on storage.objects;
create policy astrea_storage_admin_read
  on storage.objects for select to authenticated
  using (bucket_id in ('motor', 'profil', 'pengajuan') and public.is_admin());

drop policy if exists astrea_storage_motor_insert on storage.objects;
create policy astrea_storage_motor_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'motor' and public.is_admin());

drop policy if exists astrea_storage_motor_update on storage.objects;
create policy astrea_storage_motor_update
  on storage.objects for update to authenticated
  using (bucket_id = 'motor' and public.is_admin())
  with check (bucket_id = 'motor' and public.is_admin());

-- Foto profil: user hanya boleh menulis di folder miliknya sendiri (<uid>/...).
drop policy if exists astrea_storage_profil_insert on storage.objects;
create policy astrea_storage_profil_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists astrea_storage_profil_update on storage.objects;
create policy astrea_storage_profil_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pengajuan: anon boleh upload, tidak boleh membaca/menimpa lewat API.
drop policy if exists astrea_storage_pengajuan_insert on storage.objects;
create policy astrea_storage_pengajuan_insert
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'pengajuan'
    and storage.extension(name) = any (array['jpg', 'jpeg', 'png', 'webp'])
  );

drop policy if exists astrea_storage_pengajuan_update on storage.objects;
create policy astrea_storage_pengajuan_update
  on storage.objects for update to authenticated
  using (bucket_id = 'pengajuan' and public.is_admin())
  with check (bucket_id = 'pengajuan' and public.is_admin());

drop policy if exists astrea_storage_admin_delete on storage.objects;
create policy astrea_storage_admin_delete
  on storage.objects for delete to authenticated
  using (bucket_id in ('motor', 'profil', 'pengajuan') and public.is_admin());

-- ============================================================================
-- 10. REALTIME
-- Notifikasi pengajuan baru di dashboard admin.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'pengajuan_jual'
     )
  then
    execute 'alter publication supabase_realtime add table public.pengajuan_jual';
  end if;
end $$;

-- ============================================================================
-- 11. updated_at pengaturan
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pengaturan_touch_updated_at on public.pengaturan;
create trigger pengaturan_touch_updated_at
  before update on public.pengaturan
  for each row execute function public.touch_updated_at();
