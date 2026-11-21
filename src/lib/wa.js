export function nomorWa(nomor) {
  const digit = String(nomor ?? '').replace(/\D/g, '')
  if (!digit) return ''
  if (digit.startsWith('0')) return `62${digit.slice(1)}`
  return digit
}

// Nomor di pengaturan disimpan tanpa "+" (mis. 62895321022558).
export function waUrl(nomor, pesan = '') {
  const tujuan = nomorWa(nomor)
  if (!tujuan) return '#'
  return `https://wa.me/${tujuan}${pesan ? `?text=${encodeURIComponent(pesan)}` : ''}`
}
