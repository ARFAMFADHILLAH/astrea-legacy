#!/usr/bin/env node
/**
 * Impor data dari dump MySQL lama (phpMyAdmin) ke Supabase.
 *
 *   node scripts/import-legacy.mjs "astreaya-terbaru.sql"
 *   node scripts/import-legacy.mjs dump.sql --uploads referensi-php/uploads --clear
 *   node scripts/import-legacy.mjs dump.sql --dry-run
 *
 * Butuh service_role key (JANGAN pakai anon key). Simpan di .env.migrasi:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * File .env.migrasi sudah masuk .gitignore.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const AKAR = process.cwd()
const BUCKET_FOTO = 'motor'
const BUCKET_PENGAJUAN = 'pengajuan'
const MAKS_FOTO_PRODUK = 6
const MAKS_FOTO_PENGAJUAN = 5
const EKSTENSI_GAMBAR = ['jpg', 'jpeg', 'png', 'webp']
const TIPE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const UKURAN_BATCH = 100

// ---------------------------------------------------------------------------
// Argumen & env
// ---------------------------------------------------------------------------
function bacaOpsi(argv) {
  const opsi = { dump: '', uploads: join(AKAR, 'referensi-php', 'uploads'), clear: false, dryRun: false }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--clear') opsi.clear = true
    else if (arg === '--dry-run') opsi.dryRun = true
    else if (arg === '--uploads') opsi.uploads = resolve(argv[i + 1] ?? '')
    else if (arg === '--help' || arg === '-h') opsi.help = true
    else if (!arg.startsWith('-')) opsi.dump = arg
  }

  return opsi
}

function muatEnv(berkas) {
  if (!existsSync(berkas)) return {}

  const isi = {}
  for (const baris of readFileSync(berkas, 'utf8').split(/\r?\n/)) {
    const cocok = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(baris)
    if (!cocok || baris.trim().startsWith('#')) continue
    let nilai = cocok[2]
    if (
      (nilai.startsWith('"') && nilai.endsWith('"')) ||
      (nilai.startsWith("'") && nilai.endsWith("'"))
    ) {
      nilai = nilai.slice(1, -1)
    }
    isi[cocok[1]] = nilai
  }
  return isi
}

const opsi = bacaOpsi(process.argv.slice(2))

if (opsi.help) {
  console.log(`Pemakaian:
  node scripts/import-legacy.mjs <dump.sql> [--uploads <folder>] [--clear] [--dry-run]

  --uploads   folder foto lama (default: ./referensi-php/uploads)
  --clear     kosongkan produk/pengajuan/pemasukan/pengeluaran/log_stok dulu
  --dry-run   baca dump & laporkan saja, tanpa upload/insert`)
  process.exit(0)
}

const env = {
  ...muatEnv(join(AKAR, '.env')),
  ...muatEnv(join(AKAR, '.env.migrasi')),
  ...process.env,
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
const kunci = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY

if (!opsi.dump) {
  console.error('Sebutkan file dump: node scripts/import-legacy.mjs "astreaya.sql"')
  process.exit(1)
}

const berkasDump = resolve(opsi.dump)
if (!existsSync(berkasDump)) {
  console.error(`Dump tidak ditemukan: ${berkasDump}`)
  process.exit(1)
}

if (!url || !kunci) {
  console.error(
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum ada.\n' +
      'Buat .env.migrasi berisi keduanya (lihat .env.migrasi.example).'
  )
  process.exit(1)
}

if (kunci.startsWith('sb_publishable_') || kunci === env.VITE_SUPABASE_ANON_KEY) {
  console.error('Key yang dipakai adalah anon/publishable key. Impor butuh service_role key.')
  process.exit(1)
}

const supabase = createClient(url, kunci, { auth: { persistSession: false } })

// ---------------------------------------------------------------------------
// Parser dump MySQL
// ---------------------------------------------------------------------------
function lewatiSpasi(teks, pos) {
  while (pos < teks.length && /\s/.test(teks[pos])) pos += 1
  return pos
}

function bacaNilai(teks, pos) {
  pos = lewatiSpasi(teks, pos)

  if (teks[pos] === "'") {
    let hasil = ''
    pos += 1
    while (pos < teks.length) {
      const huruf = teks[pos]
      if (huruf === '\\') {
        const lanjut = teks[pos + 1]
        const peta = { n: '\n', r: '\r', t: '\t', 0: '\0', Z: '\u001a', b: '\b' }
        hasil += peta[lanjut] ?? lanjut
        pos += 2
        continue
      }
      if (huruf === "'") {
        if (teks[pos + 1] === "'") {
          hasil += "'"
          pos += 2
          continue
        }
        pos += 1
        break
      }
      hasil += huruf
      pos += 1
    }
    return { nilai: hasil, akhir: pos }
  }

  const mulai = pos
  while (pos < teks.length && teks[pos] !== ',' && teks[pos] !== ')') pos += 1
  const token = teks.slice(mulai, pos).trim()

  if (/^null$/i.test(token)) return { nilai: null, akhir: pos }
  if (/^-?\d+(\.\d+)?$/.test(token)) return { nilai: Number(token), akhir: pos }
  return { nilai: token, akhir: pos }
}

function bacaTuple(teks, mulai) {
  const baris = []
  let pos = mulai
  let dalamTuple = false
  let nilai = []

  while (pos < teks.length) {
    const huruf = teks[pos]

    if (!dalamTuple) {
      if (huruf === '(') {
        dalamTuple = true
        nilai = []
        pos += 1
        continue
      }
      if (huruf === ';') return { baris, akhir: pos + 1 }
      pos += 1
      continue
    }

    if (huruf === ')') {
      baris.push(nilai)
      dalamTuple = false
      pos += 1
      continue
    }

    if (huruf === ',') {
      pos += 1
      continue
    }

    const baca = bacaNilai(teks, pos)
    nilai.push(baca.nilai)
    pos = baca.akhir
  }

  return { baris, akhir: pos }
}

function parseDump(teks) {
  const tabel = {}
  const pola = /INSERT\s+INTO\s+`([^`]+)`\s*\(([^)]*)\)\s*VALUES\s*/gi
  let cocok

  while ((cocok = pola.exec(teks))) {
    const nama = cocok[1]
    const kolom = cocok[2].split(',').map((k) => k.trim().replace(/^`|`$/g, ''))
    const { baris, akhir } = bacaTuple(teks, pola.lastIndex)

    const daftar = baris.map((isi) => {
      const objek = {}
      kolom.forEach((kunci, i) => {
        objek[kunci] = isi[i] ?? null
      })
      return objek
    })

    tabel[nama] = (tabel[nama] ?? []).concat(daftar)
    pola.lastIndex = akhir
  }

  return tabel
}

// ---------------------------------------------------------------------------
// Foto
// ---------------------------------------------------------------------------
const indeksFoto = new Map()
function indeksUploads(akar) {
  if (!existsSync(akar)) return
  for (const item of readdirSync(akar, { withFileTypes: true })) {
    const path = join(akar, item.name)
    if (item.isDirectory()) indeksUploads(path)
    else if (!indeksFoto.has(item.name)) indeksFoto.set(item.name, path)
  }
}
indeksUploads(opsi.uploads)

const cacheUpload = new Map()
const gagalUpload = []

async function unggahFoto(namaLokal, bucket, folder = '') {
  const nama = String(namaLokal ?? '').trim()
  if (!nama) return null

  const kunciCache = `${bucket}/${folder}/${nama}`
  if (cacheUpload.has(kunciCache)) return cacheUpload.get(kunciCache)

  const pathLokal = indeksFoto.get(basename(nama))
  const ekstensi = extname(nama).slice(1).toLowerCase()

  if (!pathLokal) {
    gagalUpload.push(`${nama} (file tidak ada di ${opsi.uploads})`)
    cacheUpload.set(kunciCache, null)
    return null
  }
  if (!EKSTENSI_GAMBAR.includes(ekstensi)) {
    gagalUpload.push(`${nama} (bukan gambar)`)
    cacheUpload.set(kunciCache, null)
    return null
  }

  const namaStorage = folder ? `${folder}/${randomUUID()}.${ekstensi}` : `${randomUUID()}.${ekstensi}`

  if (opsi.dryRun) {
    const path = `${bucket}/${namaStorage}`
    cacheUpload.set(kunciCache, path)
    return path
  }

  const isi = readFileSync(pathLokal)
  const tipeMime = TIPE_MIME[ekstensi] ?? 'image/jpeg'
  const badan = typeof Blob === 'function' ? new Blob([isi], { type: tipeMime }) : isi

  const { error } = await supabase.storage.from(bucket).upload(namaStorage, badan, {
    contentType: tipeMime,
    upsert: false,
  })

  if (error) {
    gagalUpload.push(`${nama} (${error.message})`)
    cacheUpload.set(kunciCache, null)
    return null
  }

  const path = `${bucket}/${namaStorage}`
  cacheUpload.set(kunciCache, path)
  return path
}

// ---------------------------------------------------------------------------
// Utilitas data
// ---------------------------------------------------------------------------
function keAngka(nilai, bawaan = 0) {
  const angka = Number(nilai)
  return Number.isFinite(angka) ? angka : bawaan
}

// MySQL DATETIME tanpa zona; server lama memakai Asia/Jakarta (+07:00).
function keWaktu(nilai) {
  if (!nilai) return null
  const teks = String(nilai).trim()
  if (!teks) return null
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(teks)) return teks
  if (/^\d{4}-\d{2}-\d{2}$/.test(teks)) return `${teks}T00:00:00+07:00`
  return `${teks.replace(' ', 'T')}+07:00`
}

async function impor(tabel, baris) {
  if (baris.length === 0) return 0
  if (opsi.dryRun) return baris.length

  let total = 0
  for (let i = 0; i < baris.length; i += UKURAN_BATCH) {
    const potongan = baris.slice(i, i + UKURAN_BATCH)
    const { data, error } = await supabase.rpc('import_legacy', {
      p_tabel: tabel,
      p_baris: potongan,
    })
    if (error) throw new Error(`${tabel}: ${error.message}`)
    total += Number(data ?? potongan.length)
  }
  return total
}

const laporan = []
function catat(tabel, jumlah, keterangan = '') {
  laporan.push({ tabel, jumlah, keterangan })
}

// ---------------------------------------------------------------------------
// Alur utama
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Dump   : ${berkasDump}`)
  console.log(`Uploads: ${opsi.uploads}`)
  console.log(`Mode   : ${opsi.dryRun ? 'dry-run (tanpa tulis)' : 'impor'}`)
  console.log('')

  const dump = parseDump(readFileSync(berkasDump, 'utf8'))
  const jumlahDump = Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length]))
  console.log('Isi dump:', jumlahDump)

  if (!dump.produk || dump.produk.length === 0) {
    console.error(
      '\nDump tidak berisi INSERT untuk tabel `produk`. Periksa file dump ' +
        '(mungkin hanya struktur tanpa data) atau namanya salah.'
    )
    process.exit(1)
  }

  if (!opsi.dryRun) {
    if (opsi.clear) {
      console.log('\nMengosongkan tabel laporan & produk lama…')
      const { error } = await supabase.rpc('import_legacy', { p_tabel: 'reset', p_baris: [] })
      if (error) throw new Error(`reset: ${error.message}`)
    } else {
      const tabelDiperiksa = ['produk', 'pengajuan_jual', 'pemasukan', 'pengeluaran', 'log_stok']
      const terisi = []

      for (const tabel of tabelDiperiksa) {
        const { count, error } = await supabase
          .from(tabel)
          .select('id', { count: 'exact', head: true })
        if (error) throw new Error(`cek ${tabel}: ${error.message}`)
        if ((count ?? 0) > 0) terisi.push(`${tabel} (${count} baris)`)
      }

      if (terisi.length) {
        console.error(
          `\nDatabase sudah berisi data: ${terisi.join(', ')}.\n` +
            'Jalankan ulang dengan --clear kalau memang ingin menimpanya.'
        )
        process.exit(1)
      }
    }
  }

  // --- pengaturan (banner) ------------------------------------------------
  const barisPengaturan = dump.pengaturan?.[0]
  if (barisPengaturan) {
    const banner = barisPengaturan.foto_banner
      ? await unggahFoto(barisPengaturan.foto_banner, BUCKET_FOTO, 'banner')
      : null

    const jumlah = await impor('pengaturan', [{ id: 1, foto_banner: banner }])
    catat('pengaturan', jumlah, banner ? 'banner dipindah ke Storage' : 'tanpa banner')
  }

  // --- produk -------------------------------------------------------------
  const produk = [...(dump.produk ?? [])].sort((a, b) => keAngka(a.id) - keAngka(b.id))
  const barisProduk = []

  for (const row of produk) {
    const daftarFoto = String(row.foto ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, MAKS_FOTO_PRODUK)

    const foto = []
    for (const nama of daftarFoto) {
      const path = await unggahFoto(nama, BUCKET_FOTO)
      if (path) foto.push(path)
    }

    const pembeli = row.foto_pembeli
      ? await unggahFoto(row.foto_pembeli, BUCKET_FOTO, 'pembeli')
      : null

    barisProduk.push({
      id: keAngka(row.id),
      nama_motor: String(row.nama_motor ?? '').trim(),
      tahun: row.tahun === null || row.tahun === '' ? null : keAngka(row.tahun),
      harga: keAngka(row.harga),
      deskripsi: String(row.deskripsi ?? ''),
      foto,
      foto_pembeli: pembeli,
      status: row.status === 'Terjual' ? 'Terjual' : 'Ready',
      created_at: keWaktu(row.created_at),
    })
  }

  const jumlahProduk = await impor('produk', barisProduk)
  catat(
    'produk',
    jumlahProduk,
    `${barisProduk.filter((p) => p.foto.length > 0).length} punya foto, ` +
      `${barisProduk.filter((p) => p.foto.length === 0).length} tanpa foto`
  )

  // --- pengajuan jual -----------------------------------------------------
  const barisPengajuan = []
  for (const row of dump.pengajuan_jual ?? []) {
    const daftarFoto = String(row.foto ?? '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, MAKS_FOTO_PENGAJUAN)

    const foto = []
    for (const nama of daftarFoto) {
      const path = await unggahFoto(nama, BUCKET_PENGAJUAN)
      if (path) foto.push(path)
    }

    const status = ['pending', 'disetujui', 'ditolak'].includes(row.status)
      ? row.status
      : 'pending'

    barisPengajuan.push({
      id: randomUUID(),
      nama_penjual: String(row.nama_penjual ?? '').trim(),
      wa_penjual: String(row.wa_penjual ?? '').trim(),
      nama_motor: String(row.nama_motor ?? '').trim(),
      tahun: keAngka(row.tahun),
      kondisi: String(row.kondisi ?? ''),
      keterangan: String(row.keterangan ?? ''),
      harga_harapan: keAngka(row.harga_harapan),
      foto,
      status,
      produk_id: row.produk_id ? keAngka(row.produk_id) : null,
      sudah_dihubungi: Boolean(keAngka(row.sudah_dihubungi)),
      created_at: keWaktu(row.created_at),
    })
  }
  const jumlahPengajuan = await impor('pengajuan_jual', barisPengajuan)
  catat('pengajuan_jual', jumlahPengajuan)

  // --- pemasukan / pengeluaran / log_stok ---------------------------------
  const jumlahPemasukan = await impor(
    'pemasukan',
    (dump.pemasukan ?? []).map((row) => ({
      id: keAngka(row.id),
      keterangan: String(row.keterangan ?? ''),
      jumlah: keAngka(row.jumlah),
      kategori: String(row.kategori ?? 'Lain-lain'),
      tanggal: row.tanggal,
      created_at: keWaktu(row.created_at),
    }))
  )
  catat('pemasukan', jumlahPemasukan)

  const jumlahPengeluaran = await impor(
    'pengeluaran',
    (dump.pengeluaran ?? []).map((row) => ({
      id: keAngka(row.id),
      keterangan: String(row.keterangan ?? ''),
      jumlah: keAngka(row.jumlah),
      kategori: String(row.kategori ?? 'Lain-lain'),
      tanggal: row.tanggal,
      created_at: keWaktu(row.created_at),
    }))
  )
  catat('pengeluaran', jumlahPengeluaran)

  const jumlahLogStok = await impor(
    'log_stok',
    (dump.log_stok ?? []).map((row) => ({
      id: keAngka(row.id),
      nama_motor: String(row.nama_motor ?? ''),
      jenis: row.jenis === 'keluar' ? 'keluar' : 'masuk',
      jumlah: Math.max(1, keAngka(row.jumlah, 1)),
      tanggal: row.tanggal,
      keterangan: row.keterangan ? String(row.keterangan) : null,
      created_at: keWaktu(row.created_at),
    }))
  )
  catat('log_stok', jumlahLogStok)

  // ---------------------------------------------------------------------
  console.log('\n=== Hasil ===')
  for (const item of laporan) {
    console.log(
      `${item.tabel.padEnd(16)} ${String(item.jumlah).padStart(4)} baris  ${item.keterangan}`
    )
  }

  console.log(
    `\nFoto terupload: ${[...cacheUpload.values()].filter(Boolean).length} file` +
      (opsi.dryRun ? ' (dry-run, tidak benar-benar diunggah)' : '')
  )

  if (gagalUpload.length) {
    console.log(`Foto gagal/dilewati: ${gagalUpload.length}`)
    for (const pesan of gagalUpload.slice(0, 20)) console.log('  -', pesan)
    if (gagalUpload.length > 20) console.log(`  … dan ${gagalUpload.length - 20} lagi`)
  }

  const userLama = dump.users ?? []
  if (userLama.length) {
    console.log('\nAkun lama TIDAK diimpor (password MD5 tidak bisa dipindah):')
    for (const user of userLama) {
      console.log(`  - ${user.username} (${user.role ?? 'user'})`)
    }
    console.log('Buat ulang lewat Supabase Auth, lalu set profiles.role = admin. Lihat README.')
  }

  console.log('\nSelesai.')
}

main().catch((error) => {
  console.error('\nGAGAL:', error.message)
  process.exit(1)
})
