#!/usr/bin/env node
/**
 * Uji keamanan login & batas akses.
 *
 *   npm run cek:keamanan
 *
 * Yang diperiksa:
 *   - pendaftaran akun baru (signup) harus dimatikan di Supabase
 *   - form login tidak bisa diinjeksi (Auth menolak, bukan error SQL)
 *   - token palsu / tanpa sesi tidak bisa membaca data admin
 *   - anon tidak bisa update/delete tabel, memanggil RPC admin, atau upload
 *     ke bucket admin
 *   - data pembeli & tabel internal tetap tertutup untuk anon
 *   - build tidak membawa service_role key
 *
 * Butuh .env berisi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.
 * Uji ini tidak mengubah data (upload yang ditolak tidak membuat file).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
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

const headerAnon = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  'Content-Type': 'application/json',
}

let gagal = 0
let lulus = 0

async function panggil(jalur, opsi = {}) {
  const res = await fetch(url + jalur, {
    ...opsi,
    headers: { ...headerAnon, ...(opsi.headers ?? {}) },
  })
  const teks = await res.text()
  let data = null
  try {
    data = teks ? JSON.parse(teks) : null
  } catch {
    data = teks
  }
  return { status: res.status, data }
}

function lapor(nama, benar, detail = '') {
  if (benar) lulus += 1
  else gagal += 1
  console.log(`${benar ? 'OK   ' : 'GAGAL'}  ${nama}${detail ? `  (${detail})` : ''}`)
}

function pesanError(data) {
  return String(data?.message ?? data?.msg ?? data?.error_description ?? data?.error ?? '')
}

async function ujiSetelanAuth() {
  const res = await panggil('/auth/v1/settings')
  const setelan = res.data ?? {}

  lapor(
    'pendaftaran akun baru dimatikan',
    setelan.disable_signup === true,
    setelan.disable_signup === true
      ? 'disable_signup=true'
      : 'disable_signup=false — matikan di Supabase → Authentication → Providers → Email'
  )
  lapor(
    'login email aktif, provider lain tidak terbuka',
    setelan.external?.email === true,
    `email=${setelan.external?.email === true}`
  )
  lapor(
    'konfirmasi email tetap diwajibkan untuk akun baru',
    setelan.mailer_autoconfirm === false,
    `mailer_autoconfirm=${setelan.mailer_autoconfirm}`
  )
}

async function ujiInjeksiLogin() {
  const percobaan = [
    "admin' OR '1'='1' --",
    "x' UNION SELECT NULL, NULL --",
    'admin@astrea.test" OR 1=1 --',
  ]

  for (const [i, email] of percobaan.entries()) {
    const res = await fetch(url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: "x' OR '1'='1" }),
    })
    const data = await res.json().catch(() => ({}))
    const pesan = pesanError(data)

    lapor(
      `login menolak injeksi #${i + 1}`,
      res.status === 400 && /invalid login credentials/i.test(pesan),
      `HTTP ${res.status}${pesan ? `, ${pesan.slice(0, 60)}` : ''}`
    )
    lapor(
      `error injeksi #${i + 1} tidak membocorkan SQL`,
      !/syntax error|postgres|pg_|sqlstate|relation .* does not exist/i.test(pesan),
      pesan ? pesan.slice(0, 60) : 'tanpa pesan'
    )
  }
}

async function ujiTokenPalsu() {
  const tokenPalsu =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.tanda-tangan-palsu'

  const res = await panggil('/rest/v1/profiles?select=id,role&limit=1', {
    headers: { Authorization: `Bearer ${tokenPalsu}` },
  })
  lapor('token JWT palsu ditolak', res.status === 401, `HTTP ${res.status}`)

  const tanpaSesi = await panggil('/rest/v1/profiles?select=id,role&limit=1')
  lapor('tanpa sesi tidak bisa membaca profiles', tanpaSesi.status === 401, `HTTP ${tanpaSesi.status}`)
}

async function ujiTulisAnon() {
  const percobaan = [
    [
      'anon tidak bisa update produk',
      '/rest/v1/produk?id=eq.1',
      { method: 'PATCH', body: JSON.stringify({ harga: 1 }) },
    ],
    ['anon tidak bisa hapus produk', '/rest/v1/produk?id=eq.1', { method: 'DELETE' }],
    [
      'anon tidak bisa update pengaturan',
      '/rest/v1/pengaturan?id=eq.1',
      { method: 'PATCH', body: JSON.stringify({ wa_admin: '000' }) },
    ],
    [
      'anon tidak bisa update profiles',
      '/rest/v1/profiles?id=eq.00000000-0000-4000-8000-000000000000',
      { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) },
    ],
    [
      'anon tidak bisa update pengajuan',
      '/rest/v1/pengajuan_jual?id=eq.00000000-0000-4000-8000-000000000000',
      { method: 'PATCH', body: JSON.stringify({ status: 'disetujui' }) },
    ],
    [
      'anon tidak bisa menulis log stok',
      '/rest/v1/log_stok',
      { method: 'POST', body: JSON.stringify({ nama_motor: 'UJI', jenis: 'masuk', jumlah: 1 }) },
    ],
  ]

  for (const [nama, jalur, opsi] of percobaan) {
    const res = await panggil(jalur, {
      ...opsi,
      headers: { ...headerAnon, Prefer: 'return=minimal', ...(opsi.headers ?? {}) },
    })
    lapor(nama, res.status === 401 || res.status === 403, `HTTP ${res.status}`)
  }
}

async function ujiRpcAnon() {
  const percobaan = [
    [
      'anon tidak bisa menyetujui pengajuan',
      'setujui_pengajuan',
      { p_id: '00000000-0000-4000-8000-000000000000' },
    ],
    [
      'anon tidak bisa mengubah role',
      'set_user_role',
      { p_user_id: '00000000-0000-4000-8000-000000000000', p_role: 'admin' },
    ],
    ['anon tidak bisa memanggil import_legacy', 'import_legacy', { p_tabel: 'produk', p_baris: [] }],
    [
      'RPC cek username sudah ditutup (register dihapus)',
      'cek_username_tersedia',
      { p_username: 'admin' },
    ],
  ]

  for (const [nama, rpc, body] of percobaan) {
    const res = await panggil(`/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    lapor(nama, res.status === 401 || res.status === 403, `HTTP ${res.status}`)
  }

  const publik = await panggil('/rest/v1/rpc/get_pengajuan_publik', {
    method: 'POST',
    body: JSON.stringify({ p_id: '00000000-0000-4000-8000-000000000000' }),
  })
  lapor('detail pengajuan publik tetap bisa dibuka anon', publik.status === 200, `HTTP ${publik.status}`)

  const adminCek = await panggil('/rest/v1/rpc/is_admin', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  lapor('is_admin() untuk anon bernilai false', adminCek.status === 200 && adminCek.data === false, `HTTP ${adminCek.status}`)
}

async function ujiBacaAnon() {
  const katalog = await panggil('/rest/v1/produk?select=id,nama_motor,harga,status&limit=1')
  lapor('pengunjung tetap bisa membaca katalog', katalog.status === 200, `HTTP ${katalog.status}`)

  const pembeli = await panggil('/rest/v1/produk?select=nama_pembeli&limit=1')
  lapor('anon tidak bisa membaca data pembeli', pembeli.status === 401 || pembeli.status === 403, `HTTP ${pembeli.status}`)

  for (const tabel of ['pengajuan_jual', 'pemasukan', 'pengeluaran', 'log_stok', 'profiles']) {
    const res = await panggil(`/rest/v1/${tabel}?select=id&limit=1`)
    lapor(`anon tidak bisa membaca ${tabel}`, res.status === 401 || res.status === 403, `HTTP ${res.status}`)
  }
}

async function ujiStorageAnon() {
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    console.log('LEWAT  uji storage (FormData/Blob tidak tersedia di Node ini)')
    return
  }

  const png = new Blob(
    [Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')],
    { type: 'image/png' }
  )

  for (const bucket of ['motor', 'profil']) {
    const form = new FormData()
    form.append('file', png, `uji-keamanan-${Date.now()}.png`)

    const res = await fetch(`${url}/storage/v1/object/${bucket}/uji-keamanan-${Date.now()}.png`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'x-upsert': 'false',
      },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    lapor(
      `anon tidak bisa upload ke bucket ${bucket}`,
      res.status >= 400,
      `HTTP ${res.status}${pesanError(data) ? `, ${pesanError(data).slice(0, 50)}` : ''}`
    )
  }

  const hapus = await fetch(`${url}/storage/v1/object/motor/tidak-ada.png`, {
    method: 'DELETE',
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  lapor('anon tidak bisa menghapus file storage', hapus.status >= 400, `HTTP ${hapus.status}`)
}

function ujiBuildTanpaServiceRole() {
  const dist = join(AKAR, 'dist', 'assets')
  if (!existsSync(dist)) {
    console.log('LEWAT  uji build (dist/ belum ada, jalankan npm run build)')
    return
  }

  const berkas = readdirSync(dist).filter((nama) => nama.endsWith('.js'))
  const temu = []

  for (const nama of berkas) {
    const isi = readFileSync(join(dist, nama), 'utf8')
    if (/service_role|SERVICE_ROLE|SUPABASE_SERVICE/i.test(isi)) temu.push(nama)
  }

  lapor('build tidak membawa service_role key', temu.length === 0, temu.join(', ') || 'bersih')
}

async function main() {
  console.log(`Uji keamanan: ${url}\n`)

  await ujiSetelanAuth()
  await ujiInjeksiLogin()
  await ujiTokenPalsu()
  await ujiBacaAnon()
  await ujiTulisAnon()
  await ujiRpcAnon()
  await ujiStorageAnon()
  ujiBuildTanpaServiceRole()

  console.log('')
  console.log(`${lulus} lulus, ${gagal} gagal.`)
  if (gagal) process.exit(1)
}

main().catch((error) => {
  console.error('GAGAL:', error.message)
  process.exit(1)
})
