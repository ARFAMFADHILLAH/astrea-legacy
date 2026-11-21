#!/usr/bin/env node
/**
 * Cek cepat RLS dengan anon key (tanpa membuat/mengubah data).
 *
 *   npm run cek:rls
 *
 * Yang diuji:
 *   - katalog produk & pengaturan bisa dibaca pengunjung
 *   - pengajuan, pemasukan, pengeluaran, log stok, profil tidak bisa dibaca
 *   - anon tidak bisa insert ke tabel admin
 *   - anon tidak bisa menyetujui pengajuan / menaikkan role
 *
 * Tidak diuji di sini (butuh data nyata / upload file):
 *   - kirim pengajuan baru lewat form /jual
 *   - upload foto ke bucket pengajuan
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const AKAR = process.cwd()

function muatEnv(berkas) {
  if (!existsSync(berkas)) return {}
  const isi = {}
  for (const baris of readFileSync(berkas, 'utf8').split(/\r?\n/)) {
    if (baris.trim().startsWith('#')) continue
    const cocok = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/.exec(baris)
    if (cocok) isi[cocok[1]] = cocok[2].replace(/^['"]|['"]$/g, '')
  }
  return isi
}

const env = { ...muatEnv(join(AKAR, '.env')), ...process.env }
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ditemukan di .env')
  process.exit(1)
}

const header = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  'Content-Type': 'application/json',
}

let gagal = 0

async function panggil(jalur, opsi = {}) {
  const res = await fetch(url + jalur, { ...opsi, headers: { ...header, ...(opsi.headers ?? {}) } })
  const teks = await res.text()
  let data = null
  try {
    data = teks ? JSON.parse(teks) : null
  } catch {
    data = teks
  }
  return { status: res.status, data }
}

function lapor(nama, lulus, detail = '') {
  if (!lulus) gagal += 1
  console.log(`${lulus ? 'OK   ' : 'GAGAL'}  ${nama}${detail ? `  (${detail})` : ''}`)
}

async function main() {
  const produk = await panggil('/rest/v1/produk?select=id&limit=1')
  lapor('pengunjung bisa melihat katalog', produk.status === 200, `HTTP ${produk.status}`)

  const pengaturan = await panggil('/rest/v1/pengaturan?select=id')
  lapor('pengunjung bisa membaca pengaturan toko', pengaturan.status === 200, `HTTP ${pengaturan.status}`)

  // Data pembeli hanya untuk admin (migrasi 0004 mencabut SELECT tabel-level anon).
  const pembeli = await panggil('/rest/v1/produk?select=nama_pembeli&limit=1')
  const kodePembeli = pembeli.data?.code ?? ''
  lapor(
    'anon tidak bisa membaca data pembeli',
    pembeli.status === 401 || pembeli.status === 403,
    pembeli.status === 400 && kodePembeli === '42703'
      ? 'kolom belum ada — jalankan migrasi 0004_data_pembeli.sql'
      : `HTTP ${pembeli.status}`
  )

  const tabelTertutup = ['pengajuan_jual', 'pemasukan', 'pengeluaran', 'log_stok', 'profiles']
  for (const tabel of tabelTertutup) {
    const hasil = await panggil(`/rest/v1/${tabel}?select=id&limit=1`)
    const kosong = Array.isArray(hasil.data) && hasil.data.length === 0
    lapor(
      `anon tidak bisa membaca ${tabel}`,
      hasil.status !== 200 || kosong,
      `HTTP ${hasil.status}${kosong ? ', 0 baris' : ''}`
    )
  }

  const insertProduk = await panggil('/rest/v1/produk', {
    method: 'POST',
    body: JSON.stringify({ nama_motor: 'CEK RLS', harga: 1, deskripsi: 'x', status: 'Ready' }),
    headers: { Prefer: 'return=minimal' },
  })
  lapor('anon tidak bisa menambah produk', insertProduk.status >= 400, `HTTP ${insertProduk.status}`)

  const insertPemasukan = await panggil('/rest/v1/pemasukan', {
    method: 'POST',
    body: JSON.stringify({ keterangan: 'CEK RLS', jumlah: 1, kategori: 'x', tanggal: '2026-01-01' }),
    headers: { Prefer: 'return=minimal' },
  })
  lapor('anon tidak bisa menulis pemasukan', insertPemasukan.status >= 400, `HTTP ${insertPemasukan.status}`)

  const insertSetujui = await panggil('/rest/v1/pengajuan_jual', {
    method: 'POST',
    body: JSON.stringify({
      nama_penjual: 'CEK RLS',
      wa_penjual: '0812',
      nama_motor: 'CEK RLS',
      tahun: 1990,
      status: 'disetujui',
    }),
    headers: { Prefer: 'return=minimal' },
  })
  lapor(
    'anon tidak bisa mengirim pengajuan berstatus disetujui',
    insertSetujui.status >= 400,
    `HTTP ${insertSetujui.status}`
  )

  // Bukti hak INSERT kolom untuk anon sudah terpasang (migrasi 0002), tanpa
  // menulis baris: nama_penjual NULL pasti ditolak NOT NULL (400/403), bukan
  // "permission denied" (401).
  const probeInsert = await panggil('/rest/v1/pengajuan_jual', {
    method: 'POST',
    body: JSON.stringify({ nama_penjual: null, wa_penjual: '', nama_motor: '', tahun: 0 }),
    headers: { Prefer: 'return=minimal' },
  })
  lapor(
    'anon punya hak INSERT pengajuan (form /jual siap)',
    probeInsert.status !== 401 && probeInsert.status !== 404,
    `HTTP ${probeInsert.status}`
  )

  const role = await panggil('/rest/v1/rpc/set_user_role', {
    method: 'POST',
    body: JSON.stringify({
      p_user_id: '00000000-0000-4000-8000-000000000000',
      p_role: 'admin',
    }),
  })
  lapor('anon tidak bisa mengubah role', role.status >= 400, `HTTP ${role.status}`)

  const publik = await panggil('/rest/v1/rpc/get_pengajuan_publik', {
    method: 'POST',
    body: JSON.stringify({ p_id: '00000000-0000-4000-8000-000000000000' }),
  })
  lapor(
    'RPC get_pengajuan_publik bisa dipanggil anon',
    publik.status === 200,
    `HTTP ${publik.status}`
  )

  const importRpc = await panggil('/rest/v1/rpc/import_legacy', {
    method: 'POST',
    body: JSON.stringify({ p_tabel: 'produk', p_baris: [] }),
  })
  lapor(
    'anon tidak bisa memanggil import_legacy',
    importRpc.status !== 404 && importRpc.status >= 400,
    `HTTP ${importRpc.status}${importRpc.status === 404 ? ' — migrasi 0003 belum dijalankan' : ''}`
  )

  console.log('')
  if (gagal) {
    console.log(`${gagal} pemeriksaan GAGAL.`)
    process.exit(1)
  }
  console.log('Semua pemeriksaan lulus.')
}

main().catch((error) => {
  console.error('GAGAL:', error.message)
  process.exit(1)
})
