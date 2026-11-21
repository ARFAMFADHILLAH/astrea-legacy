import { hariIndo, tanggalSingkat, tglIndo } from './format'

function namaBerkas(tab, dari, sampai) {
  const awalan = tab === 'uang' ? 'Laporan_Kas_AstreaLegacy_' : 'Laporan_Stok_AstreaLegacy_'
  return `${awalan}${dari}_sd_${sampai}.xlsx`
}

function urutNaik(a, b) {
  if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1
  return Number(a.id) - Number(b.id)
}

function buatSheetUang(dari, sampai, uang) {
  const daftar = [...(uang?.daftar ?? [])].sort(urutNaik)

  const baris = [
    ['Laporan Kas - Astrea Legacy'],
    [`Periode: ${tglIndo(dari)} s/d ${tglIndo(sampai)}`],
    [],
    ['Tanggal', 'Hari', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah (Rp)'],
  ]

  if (daftar.length === 0) {
    baris.push(['Tidak ada transaksi di periode ini.'])
  } else {
    daftar.forEach((item) => {
      baris.push([
        tanggalSingkat(item.tanggal),
        hariIndo(item.tanggal),
        item.jenis === 'masuk' ? 'Masuk' : 'Keluar',
        item.kategori ?? '',
        item.keterangan ?? '',
        Number(item.jumlah || 0),
      ])
    })
  }

  baris.push([])
  baris.push(['Total Uang Masuk', '', '', '', '', Number(uang?.totalMasuk ?? 0)])
  baris.push(['Total Uang Keluar', '', '', '', '', Number(uang?.totalKeluar ?? 0)])
  baris.push(['Saldo Akhir', '', '', '', '', Number(uang?.saldo ?? 0)])

  return baris
}

function buatSheetBarang(dari, sampai, barang) {
  const daftar = [...(barang?.daftar ?? [])].sort(urutNaik)

  const baris = [
    ['Laporan Stok Barang - Astrea Legacy'],
    [`Periode: ${tglIndo(dari)} s/d ${tglIndo(sampai)}`],
    [],
    ['Tanggal', 'Hari', 'Nama Motor', 'Jenis', 'Jumlah (Unit)', 'Keterangan'],
  ]

  if (daftar.length === 0) {
    baris.push(['Tidak ada transaksi di periode ini.'])
  } else {
    daftar.forEach((item) => {
      baris.push([
        tanggalSingkat(item.tanggal),
        hariIndo(item.tanggal),
        item.nama_motor ?? '',
        item.jenis === 'masuk' ? 'Masuk' : 'Keluar',
        Number(item.jumlah || 0),
        item.keterangan ?? '',
      ])
    })
  }

  baris.push([])
  baris.push(['Total Unit Masuk', '', '', '', Number(barang?.totalMasuk ?? 0), 'unit'])
  baris.push(['Total Unit Keluar', '', '', '', Number(barang?.totalKeluar ?? 0), 'unit'])

  return baris
}

// Ekspor mengikuti export_laporan.php: judul, periode, tabel, lalu total.
export async function eksporLaporan({ tab, dari, sampai, uang, barang }) {
  // SheetJS dimuat saat tombol export diklik supaya bundle utama tetap kecil.
  const XLSX = await import('xlsx')

  const isUang = tab === 'uang'
  const isi = isUang ? buatSheetUang(dari, sampai, uang) : buatSheetBarang(dari, sampai, barang)

  const sheet = XLSX.utils.aoa_to_sheet(isi)
  sheet['!cols'] = isUang
    ? [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 34 }, { wch: 16 }]
    : [{ wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 10 }, { wch: 14 }, { wch: 34 }]
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, isUang ? 'Laporan Kas' : 'Laporan Stok')
  XLSX.writeFile(workbook, namaBerkas(tab, dari, sampai))
}
