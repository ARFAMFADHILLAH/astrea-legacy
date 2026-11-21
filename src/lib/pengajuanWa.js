import { nomorWa } from './wa'

function asal() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export function linkProduk(produkId) {
  return `${asal()}/motor/${produkId}`
}

export function linkPengajuan(id) {
  return `${asal()}/pengajuan/${id}`
}

export function waLink(nomor, pesan) {
  const tujuan = nomorWa(nomor)
  if (!tujuan) return '#'
  return `https://wa.me/${tujuan}?text=${encodeURIComponent(pesan)}`
}

// Caption tombol "🤝 Konfirmasi ke Customer" — teks persis admin_dashboard.php.
export function pesanKonfirmasi(pengajuan) {
  const nama = pengajuan.nama_penjual
  const motor = pengajuan.nama_motor
  const foto = linkPengajuan(pengajuan.id)
  const produk = pengajuan.produk_id ? linkProduk(pengajuan.produk_id) : foto

  if (pengajuan.status === 'pending') {
    return (
      `Halo kak ${nama}! 👋\n\n` +
      `Admin Astrea Kuyy udah lihat pengajuan motor *${motor}* kamu, makasih banyak ya udah percaya ke kita 🙏\n\n` +
      `Boleh dicek dulu detail & foto yang kamu kirim di sini:\n${foto}\n\n` +
      `Biar admin bisa kasih penawaran yang pas, boleh minta tolong kirim beberapa foto tambahan ya kak:\n` +
      `📸 Body kanan & kiri\n🔧 Mesin\n📄 Surat-surat (BPKB/STNK)\n\n` +
      `Tinggal balas chat ini aja langsung kirim fotonya, admin standby kok 😊`
    )
  }

  if (pengajuan.status === 'disetujui') {
    return (
      `Halo kak ${nama}! 🎉\n\n` +
      `Kabar baik nih — motor *${motor}* kamu resmi *DISETUJUI* dan udah masuk katalog Astrea Kuyy!\n\n` +
      `Cek halaman motornya di sini ya:\n${produk}\n\n` +
      `Selanjutnya kita ngobrol dulu soal harga final, jadwal cek fisik, sama proses serah terimanya. ` +
      `Balas chat ini aja kak, admin bakal bantu sampai selesai 🙌`
    )
  }

  return (
    `Halo kak ${nama} 🙏\n\n` +
    `Makasih banyak ya udah luangin waktu buat ngajuin motor *${motor}* ke Astrea Kuyy, kami seneng banget kamu mau percaya sama kita.\n\n` +
    `Mohon maaf sebelumnya kak, setelah dicek pelan-pelan, untuk saat ini kami belum bisa lanjutkan pengajuan motor kamu yang ini. ` +
    `Ini bukan berarti motornya jelek kok, cuma emang belum sesuai sama yang lagi kita cari saat ini.\n\n` +
    `Detail pengajuan kamu masih bisa dilihat di sini:\n${foto}\n\n` +
    `Sekali lagi mohon maaf ya kak. Kalau suatu saat kamu punya unit lain, atau mau ngobrol-ngobrol dulu, ` +
    `jangan sungkan balas chat ini. Kita tetap terbuka kok buat bantu 😊`
  )
}

export function waKonfirmasi(pengajuan) {
  return waLink(pengajuan.wa_penjual, pesanKonfirmasi(pengajuan))
}

// Pesan banner setelah admin menekan Setujui/Tolak.
export function pesanHasilAksi(aksi, pengajuan, produkId) {
  const nama = pengajuan.nama_penjual
  const motor = pengajuan.nama_motor

  if (aksi === 'setujui' && produkId) {
    return (
      `Halo ${nama}! 🎉\n\n` +
      `Kabar baik, motor *${motor}* kamu sudah *DISETUJUI* dan resmi masuk katalog Astrea Kuyy!\n\n` +
      `Cek halaman motor kamu di sini:\n${linkProduk(produkId)}\n\n` +
      `Selanjutnya kita lanjut diskusi soal:\n- Harga final\n- Jadwal cek fisik motor\n- Proses serah terima & pembayaran\n\n` +
      `Balas pesan ini ya, admin siap bantu proses selanjutnya!`
    )
  }

  return (
    `Halo ${nama},\n\n` +
    `Mohon maaf, pengajuan motor *${motor}* kamu *belum bisa kami setujui* saat ini.\n\n` +
    `Lihat detail pengajuan kamu di sini:\n${linkPengajuan(pengajuan.id)}\n\n` +
    `Kami tetap menghargai minat kamu. Kalau ada unit lain atau mau diskusi lebih lanjut, balas pesan ini ya. Terima kasih.`
  )
}
