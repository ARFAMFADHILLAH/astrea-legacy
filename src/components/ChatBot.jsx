import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePengaturan } from '../hooks/usePengaturan'
import { useProdukKatalog } from '../hooks/useProduk'
import { formatAngka } from '../lib/format'
import { waUrl } from '../lib/wa'

const TOPIK = [
  { id: 'ready', label: 'Ready apa aja?' },
  { id: 'harga', label: 'Berapa harganya?' },
  { id: 'beli', label: 'Cara beli?' },
  { id: 'lokasi', label: 'Lokasi di mana?' },
  { id: 'bayar', label: 'Metode pembayaran?' },
  { id: 'jual', label: 'Mau jual motor?' },
  { id: 'admin', label: 'Hubungi admin' },
]

const BALASAN_TETAP = {
  beli:
    'Caranya gampang:\n1. Pilih unit di Katalog\n2. Chat admin via WhatsApp untuk nego & tanya kondisi detail\n3. Cek fisik motor langsung (COD) atau lihat foto/video lengkap\n4. Bayar & motor siap dibawa pulang 🎉',
  lokasi:
    'Lokasi kami di Kp. Warung Jengkol No. 29, RT 002/RW 013, Penggangsaan Dua, Kelapa Gading, Kota Administrasi Jakarta Utara, DKI Jakarta. Map lengkapnya ada di bagian bawah halaman ini ya, atau klik "Buka di Maps".',
  bayar:
    'Pembayaran bisa lewat transfer bank atau cash langsung saat COD. Untuk yang dari luar kota, bisa transfer dulu lalu unit dikirim setelah konfirmasi.',
  jual:
    'Mau jual motor Astrea kamu? Gampang, isi aja form di halaman Jual Motor kami 👇 Nanti admin review dan hubungi kamu maks 1x24 jam.',
  admin: 'OK, langsung aku sambungkan ke admin via WhatsApp ya 👇',
}

export default function ChatBot() {
  const navigate = useNavigate()
  const { pengaturan } = usePengaturan()
  const { data: produk = [] } = useProdukKatalog()
  const [terbuka, setTerbuka] = useState(false)
  const [sudahDibuka, setSudahDibuka] = useState(false)
  const [pesan, setPesan] = useState([])
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)
  const timerRef = useRef([])

  useEffect(() => {
    const daftarTimer = timerRef.current
    return () => {
      daftarTimer.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [pesan, terbuka])

  function nanti(fn, jeda) {
    timerRef.current.push(setTimeout(fn, jeda))
  }

  const unitReady = produk
    .filter((item) => item.status === 'Ready')
    .slice()
    .sort((a, b) => Number(a.harga) - Number(b.harga))

  const barisReady = unitReady.map(
    (item) => `• ${item.nama_motor} (${item.tahun}) - Rp ${formatAngka(item.harga)}`
  )
  const daftarHarga = unitReady.map((item) => Number(item.harga) || 0)

  const balasan = {
    ...BALASAN_TETAP,
    ready:
      barisReady.length > 0
        ? `Unit yang masih Ready saat ini:\n${barisReady.join(
            '\n'
          )}\n\nMau lihat detailnya atau langsung tanya ke admin?`
        : 'Mohon maaf, saat ini semua unit sedang Terjual. Tapi tenang, stok baru akan terus update — boleh hubungi admin untuk info unit berikutnya ya!',
    harga:
      daftarHarga.length > 0
        ? `Harga unit kami mulai dari Rp ${formatAngka(
            Math.min(...daftarHarga)
          )} sampai Rp ${formatAngka(
            Math.max(...daftarHarga)
          )}, tergantung tahun dan kondisi motor. Cek katalog lengkapnya di bagian Koleksi Motor ya!`
        : 'Untuk info harga unit terbaru, langsung tanya admin saja ya supaya dapat info paling update.',
  }

  function tambahPesan(teks, pengirim) {
    setPesan((daftar) => [...daftar, { teks, pengirim }])
  }

  function bukaPanel() {
    setTerbuka(true)
    setSudahDibuka(true)
  }

  function pilihTopik(topik) {
    const label = TOPIK.find((item) => item.id === topik)?.label ?? ''
    tambahPesan(label, 'user')
    nanti(() => {
      tambahPesan(balasan[topik] || 'Maaf, untuk pertanyaan itu langsung tanya admin ya.', 'bot')
      if (topik === 'admin') {
        nanti(() => {
          window.open(
            waUrl(pengaturan.wa_admin, 'Halo, saya mau tanya soal Astrea Kuyyy'),
            '_blank'
          )
        }, 400)
      }
      if (topik === 'jual') {
        nanti(() => navigate('/jual'), 600)
      }
    }, 350)
  }

  function kirim() {
    const teks = input.trim()
    if (!teks) return
    tambahPesan(teks, 'user')
    setInput('')

    if (teks.toLowerCase().includes('jual')) {
      nanti(() => {
        tambahPesan(balasan.jual, 'bot')
        nanti(() => navigate('/jual'), 600)
      }, 350)
      return
    }

    nanti(() => {
      tambahPesan(
        'Pertanyaanmu langsung aku teruskan ke admin via WhatsApp ya, biar dijawab lebih detail 🙏',
        'bot'
      )
      nanti(() => {
        window.open(waUrl(pengaturan.wa_admin, teks), '_blank')
      }, 400)
    }, 350)
  }

  return (
    <>
      <button
        type="button"
        className="chat-float"
        title="Tanya Astrea Assistant"
        aria-label="Tanya Astrea Assistant"
        onClick={() => (terbuka ? setTerbuka(false) : bukaPanel())}
      >
        {!sudahDibuka && <span className="chat-dot">1</span>}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.477 2 2 5.99 2 10.9c0 2.59 1.25 4.92 3.27 6.56-.11.96-.5 2.6-1.39 4.06a.5.5 0 0 0 .58.74c1.94-.62 3.55-1.6 4.45-2.23.95.22 1.96.33 3.09.33 5.523 0 10-3.99 10-8.9C22 5.99 17.523 2 12 2z" />
        </svg>
      </button>

      <div className={`chat-panel${terbuka ? ' open' : ''}`}>
        <div className="chat-head">
          <div className="chat-head-avatar">🏍️</div>
          <div>
            <div className="chat-head-name">Astrea Assistant</div>
            <div className="chat-head-status">Online</div>
          </div>
          <button
            type="button"
            className="chat-close"
            aria-label="Tutup chat"
            onClick={() => setTerbuka(false)}
          >
            ✕
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          <div className="chat-bubble">
            Halo! Selamat datang di Astrea Legacy 🏍️{'\n'}Ada yang bisa saya bantu? Pilih topik di
            bawah atau ketik pertanyaanmu.
          </div>

          <div className="chat-quick">
            {TOPIK.map((topik) => (
              <button key={topik.id} type="button" onClick={() => pilihTopik(topik.id)}>
                {topik.label}
              </button>
            ))}
          </div>

          {pesan.map((item, indeks) => (
            <div
              key={`${indeks}-${item.pengirim}`}
              className={`chat-bubble${item.pengirim === 'user' ? ' user' : ''}`}
            >
              {item.teks}
            </div>
          ))}
        </div>

        <div className="chat-foot">
          <input
            type="text"
            placeholder="Ketik pertanyaanmu..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') kirim()
            }}
          />
          <button
            type="button"
            className="chat-send"
            title="Kirim ke WhatsApp"
            aria-label="Kirim ke WhatsApp"
            onClick={kirim}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
