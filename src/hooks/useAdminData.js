import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { bulanAwal, hariIni } from '../lib/format'

const KOLOM_PRODUK =
  'id, nama_motor, tahun, harga, deskripsi, foto, foto_pembeli, status, created_at'

// Data pembeli dipakai form edit dan menu Data User. Query ini hanya jalan
// untuk admin (authenticated), jadi aman menyertakan kolom privat.
const KOLOM_PRODUK_PEMBELI = `${KOLOM_PRODUK}, nama_pembeli, wa_pembeli, alamat_pembeli, tanggal_terjual`

async function hitungStatistik() {
  const [produk, pengeluaran] = await Promise.all([
    supabase.from('produk').select('harga, status'),
    supabase.from('pengeluaran').select('jumlah'),
  ])

  if (produk.error) throw produk.error
  if (pengeluaran.error) throw pengeluaran.error

  const daftar = produk.data ?? []
  const totalUnit = daftar.length
  const totalReady = daftar.filter((item) => item.status === 'Ready').length
  const totalTerjual = daftar.filter((item) => item.status === 'Terjual').length
  const totalPendapatan = daftar
    .filter((item) => item.status === 'Terjual')
    .reduce((jumlah, item) => jumlah + Number(item.harga || 0), 0)
  const nilaiStok = daftar
    .filter((item) => item.status === 'Ready')
    .reduce((jumlah, item) => jumlah + Number(item.harga || 0), 0)
  const totalPengeluaran = (pengeluaran.data ?? []).reduce(
    (jumlah, item) => jumlah + Number(item.jumlah || 0),
    0
  )

  return {
    totalUnit,
    totalReady,
    totalTerjual,
    totalPendapatan,
    totalPengeluaran,
    nilaiStok,
    labaBersih: totalPendapatan - totalPengeluaran,
  }
}

export function useStatistik() {
  return useQuery({
    queryKey: ['admin', 'statistik'],
    queryFn: hitungStatistik,
  })
}

export function useProdukAdmin() {
  return useQuery({
    queryKey: ['produk', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM_PRODUK)
        .order('id', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// Menu Stok memakai urutan lama: status ASC (Ready dulu), lalu id DESC.
export function useProdukStok() {
  return useQuery({
    queryKey: ['produk', 'admin-stok'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM_PRODUK)
        .order('status', { ascending: true })
        .order('id', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// Data pembeli hanya untuk admin. Unit terjual tanpa data pembeli tetap muncul
// (baris lama), ditandai kosong.
export function useProdukPembeli() {
  return useQuery({
    queryKey: ['produk', 'pembeli'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM_PRODUK_PEMBELI)
        .eq('status', 'Terjual')
        .order('tanggal_terjual', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

export function useProdukSatu(id) {
  const idAngka = Number(id)
  const idValid = Number.isInteger(idAngka) && idAngka > 0

  return useQuery({
    queryKey: ['produk', 'edit', idAngka],
    enabled: idValid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM_PRODUK_PEMBELI)
        .eq('id', idAngka)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
  })
}

export function usePengajuanList(status) {
  return useQuery({
    queryKey: ['pengajuan', 'list', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_jual')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

export function usePengeluaranList() {
  return useQuery({
    queryKey: ['pengeluaran', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengeluaran')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

async function tanggalTerlama(tabel) {
  const { data, error } = await supabase
    .from(tabel)
    .select('tanggal')
    .order('tanggal', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0]?.tanggal ?? null
}

// Sama seperti tanggal_paling_lama() di laporan.php.
export function useRentangAwal() {
  return useQuery({
    queryKey: ['laporan', 'rentang-awal'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const hasil = await Promise.all([
        tanggalTerlama('pemasukan'),
        tanggalTerlama('pengeluaran'),
        tanggalTerlama('log_stok'),
      ])

      const daftar = hasil.filter(Boolean).sort()
      return daftar[0] ?? bulanAwal()
    },
  })
}

function urutTerbaru(a, b) {
  if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1
  return Number(b.id) - Number(a.id)
}

export function useLaporanUang(dari, sampai) {
  return useQuery({
    queryKey: ['laporan', 'uang', dari, sampai],
    enabled: Boolean(dari && sampai),
    queryFn: async () => {
      const [masuk, keluar] = await Promise.all([
        supabase
          .from('pemasukan')
          .select('id, keterangan, jumlah, kategori, tanggal')
          .gte('tanggal', dari)
          .lte('tanggal', sampai),
        supabase
          .from('pengeluaran')
          .select('id, keterangan, jumlah, kategori, tanggal')
          .gte('tanggal', dari)
          .lte('tanggal', sampai),
      ])

      if (masuk.error) throw masuk.error
      if (keluar.error) throw keluar.error

      const daftar = [
        ...(masuk.data ?? []).map((item) => ({ ...item, jenis: 'masuk', sumber: 'pemasukan' })),
        ...(keluar.data ?? []).map((item) => ({ ...item, jenis: 'keluar', sumber: 'pengeluaran' })),
      ].sort(urutTerbaru)

      const totalMasuk = daftar
        .filter((item) => item.jenis === 'masuk')
        .reduce((jumlah, item) => jumlah + Number(item.jumlah || 0), 0)
      const totalKeluar = daftar
        .filter((item) => item.jenis === 'keluar')
        .reduce((jumlah, item) => jumlah + Number(item.jumlah || 0), 0)

      return { daftar, totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar }
    },
  })
}

export function useLaporanBarang(dari, sampai) {
  return useQuery({
    queryKey: ['laporan', 'barang', dari, sampai],
    enabled: Boolean(dari && sampai),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('log_stok')
        .select('*')
        .gte('tanggal', dari)
        .lte('tanggal', sampai)
        .order('tanggal', { ascending: false })
        .order('id', { ascending: false })

      if (error) throw error

      const daftar = data ?? []
      const totalMasuk = daftar
        .filter((item) => item.jenis === 'masuk')
        .reduce((jumlah, item) => jumlah + Number(item.jumlah || 0), 0)
      const totalKeluar = daftar
        .filter((item) => item.jenis === 'keluar')
        .reduce((jumlah, item) => jumlah + Number(item.jumlah || 0), 0)

      return { daftar, totalMasuk, totalKeluar, selisih: totalMasuk - totalKeluar }
    },
  })
}

export function useDaftarUser() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, foto_profil, created_at')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
  })
}

export { hariIni }
