-- ============================================================================
-- 0003 — Helper impor data lama (Fase 6).
--
-- Dipakai oleh scripts/import-legacy.mjs dengan service_role key dari .env.migrasi.
-- Jangan dipanggil dari browser: fungsi ini menulis id eksplisit dan bisa
-- mengosongkan tabel.
--
-- Dua hal yang diselesaikan di sini:
--   1. Trigger produk tidak boleh membuat log_stok/pemasukan baru saat impor,
--      karena riwayat lama ikut diimpor apa adanya.
--   2. Impor harus mempertahankan id lama (link /motor/10 tetap menunjuk motor
--      yang sama) dan mengembalikan sequence ke posisi yang benar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger produk: lewati saat mode impor aktif.
-- ----------------------------------------------------------------------------
create or replace function public.produk_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tanggal date := (now() at time zone 'Asia/Jakarta')::date;
begin
  -- Di-set oleh import_legacy() lewat set_config(..., true) dalam transaksi yang
  -- sama. Riwayat stok & pemasukan lama sudah diimpor terpisah.
  if current_setting('astrea.import', true) = 'on' then
    return null;
  end if;

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

-- ----------------------------------------------------------------------------
-- 2. Impor per tabel.
--
-- p_baris contoh:
--   [{"id":10,"nama_motor":"Honda c70","tahun":1990,"harga":5000000,
--     "deskripsi":"...","foto":["motor/abc.jpeg"],"foto_pembeli":null,
--     "status":"Terjual"}]
-- ----------------------------------------------------------------------------
create or replace function public.import_legacy(p_tabel text, p_baris jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jumlah integer := 0;
begin
  -- service_role (script), SQL Editor (auth.uid() null), atau admin.
  if not (auth.role() = 'service_role' or auth.uid() is null or public.is_admin()) then
    raise exception 'Impor hanya boleh dijalankan dari script migrasi.' using errcode = '42501';
  end if;

  perform set_config('astrea.import', 'on', true);

  if p_tabel = 'reset' then
    if not (auth.role() = 'service_role' or auth.uid() is null) then
      raise exception 'Reset hanya boleh dari script migrasi.' using errcode = '42501';
    end if;
    -- TRUNCATE tidak memicu trigger baris, jadi tidak ada log_stok palsu.
    truncate public.produk, public.pengajuan_jual, public.pemasukan,
             public.pengeluaran, public.log_stok
      restart identity;
    return 0;
  end if;

  if p_tabel = 'produk' then
    insert into public.produk (id, nama_motor, tahun, harga, deskripsi, foto, foto_pembeli, status, created_at)
    overriding system value
    select x.id, x.nama_motor, x.tahun, x.harga, x.deskripsi,
           coalesce(x.foto, '{}'), x.foto_pembeli,
           coalesce(x.status, 'Ready'), coalesce(x.created_at, now())
    from jsonb_to_recordset(p_baris) as x(
      id bigint, nama_motor text, tahun int, harga bigint, deskripsi text,
      foto text[], foto_pembeli text, status text, created_at timestamptz
    );
    get diagnostics v_jumlah = row_count;
    perform setval(
      pg_get_serial_sequence('public.produk', 'id'),
      coalesce((select max(id) from public.produk), 0) + 1,
      false
    );

  elsif p_tabel = 'pengajuan_jual' then
    insert into public.pengajuan_jual (
      id, nama_penjual, wa_penjual, nama_motor, tahun, kondisi, keterangan,
      harga_harapan, foto, status, produk_id, sudah_dihubungi, created_at
    )
    select x.id, x.nama_penjual, x.wa_penjual, x.nama_motor, coalesce(x.tahun, 0),
           coalesce(x.kondisi, ''), coalesce(x.keterangan, ''),
           coalesce(x.harga_harapan, 0), coalesce(x.foto, '{}'),
           coalesce(x.status, 'pending'), x.produk_id,
           coalesce(x.sudah_dihubungi, false), coalesce(x.created_at, now())
    from jsonb_to_recordset(p_baris) as x(
      id uuid, nama_penjual text, wa_penjual text, nama_motor text, tahun int,
      kondisi text, keterangan text, harga_harapan bigint, foto text[],
      status text, produk_id bigint, sudah_dihubungi boolean, created_at timestamptz
    );
    get diagnostics v_jumlah = row_count;

  elsif p_tabel in ('pemasukan', 'pengeluaran') then
    if p_tabel = 'pemasukan' then
      insert into public.pemasukan (id, keterangan, jumlah, kategori, tanggal, created_at)
      overriding system value
      select x.id, x.keterangan, coalesce(x.jumlah, 0), coalesce(x.kategori, 'Lain-lain'),
             x.tanggal, coalesce(x.created_at, now())
      from jsonb_to_recordset(p_baris) as x(
        id bigint, keterangan text, jumlah bigint, kategori text,
        tanggal date, created_at timestamptz
      );
    else
      insert into public.pengeluaran (id, keterangan, jumlah, kategori, tanggal, created_at)
      overriding system value
      select x.id, x.keterangan, coalesce(x.jumlah, 0), coalesce(x.kategori, 'Lain-lain'),
             x.tanggal, coalesce(x.created_at, now())
      from jsonb_to_recordset(p_baris) as x(
        id bigint, keterangan text, jumlah bigint, kategori text,
        tanggal date, created_at timestamptz
      );
    end if;
    get diagnostics v_jumlah = row_count;
    execute format(
      'select setval(pg_get_serial_sequence(%L, %L), coalesce((select max(id) from public.%I), 0) + 1, false)',
      'public.' || p_tabel, 'id', p_tabel
    );

  elsif p_tabel = 'log_stok' then
    insert into public.log_stok (id, nama_motor, jenis, jumlah, tanggal, keterangan, created_at)
    overriding system value
    select x.id, x.nama_motor, x.jenis, coalesce(x.jumlah, 1), x.tanggal,
           x.keterangan, coalesce(x.created_at, now())
    from jsonb_to_recordset(p_baris) as x(
      id bigint, nama_motor text, jenis text, jumlah int,
      tanggal date, keterangan text, created_at timestamptz
    );
    get diagnostics v_jumlah = row_count;
    perform setval(
      pg_get_serial_sequence('public.log_stok', 'id'),
      coalesce((select max(id) from public.log_stok), 0) + 1,
      false
    );

  elsif p_tabel = 'pengaturan' then
    insert into public.pengaturan (id, foto_banner)
    select coalesce(x.id, 1), x.foto_banner
    from jsonb_to_recordset(p_baris) as x(id smallint, foto_banner text)
    on conflict (id) do update
      set foto_banner = coalesce(excluded.foto_banner, public.pengaturan.foto_banner);
    get diagnostics v_jumlah = row_count;

  else
    raise exception 'Tabel impor tidak dikenal: %', p_tabel using errcode = '22023';
  end if;

  return v_jumlah;
end;
$$;

revoke all on function public.import_legacy(text, jsonb) from public, anon, authenticated;
grant execute on function public.import_legacy(text, jsonb) to service_role;
