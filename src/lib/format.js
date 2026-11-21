const angka = new Intl.NumberFormat('id-ID')

export const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export const BULAN_SINGKAT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

export function formatAngka(nilai) {
  return angka.format(Number(nilai) || 0)
}

export function formatRupiah(nilai) {
  return `Rp ${formatAngka(nilai)}`
}

// Tanggal `YYYY-MM-DD` dari Postgres dibaca sebagai tanggal lokal,
// bukan UTC, supaya tidak mundur sehari di zona waktu tertentu.
export function keTanggal(nilai) {
  if (!nilai) return null
  if (nilai instanceof Date) return Number.isNaN(nilai.getTime()) ? null : nilai

  const teks = String(nilai)
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(teks)
  if (cocok) {
    return new Date(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3]))
  }

  const hasil = new Date(teks)
  return Number.isNaN(hasil.getTime()) ? null : hasil
}

function duaDigit(n) {
  return String(n).padStart(2, '0')
}

// "Senin, 10 November 2026" — sama dengan tgl_indo() di export_laporan.php.
export function tglIndo(nilai) {
  const d = keTanggal(nilai)
  if (!d) return '-'
  return `${HARI_ID[d.getDay()]}, ${duaDigit(d.getDate())} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

export function hariIndo(nilai) {
  const d = keTanggal(nilai)
  return d ? HARI_ID[d.getDay()] : '-'
}

// "10/11/2026"
export function tanggalSingkat(nilai) {
  const d = keTanggal(nilai)
  if (!d) return '-'
  return `${duaDigit(d.getDate())}/${duaDigit(d.getMonth() + 1)}/${d.getFullYear()}`
}

// "10 Nov 2026"
export function tanggalPendek(nilai) {
  const d = keTanggal(nilai)
  if (!d) return '-'
  return `${duaDigit(d.getDate())} ${BULAN_SINGKAT_ID[d.getMonth()]} ${d.getFullYear()}`
}

// "10 Nov 2026 14:05"
export function tanggalJam(nilai) {
  const d = keTanggal(nilai)
  if (!d) return '-'
  return `${tanggalPendek(d)} ${duaDigit(d.getHours())}:${duaDigit(d.getMinutes())}`
}

// Nilai untuk <input type="date">.
export function tanggalInput(nilai) {
  const d = keTanggal(nilai)
  if (!d) return ''
  return `${d.getFullYear()}-${duaDigit(d.getMonth() + 1)}-${duaDigit(d.getDate())}`
}

export function bulanAwal() {
  const d = new Date()
  return `${d.getFullYear()}-${duaDigit(d.getMonth() + 1)}-01`
}

export function hariIni() {
  return tanggalInput(new Date())
}
