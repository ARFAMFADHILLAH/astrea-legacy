import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ToastHost, useToast } from '../components/Toast'
import { usePengaturan } from '../hooks/usePengaturan'
import { useProdukTerjual } from '../hooks/useProduk'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../lib/supabase'
import { FOTO_FALLBACK, fotoUrl } from '../lib/foto'
import { formatAngka } from '../lib/format'
import { waUrl } from '../lib/wa'

const FORM_AWAL = {
  nama_penjual: '',
  wa_penjual: '',
  nama_motor: '',
  tahun: '',
  kondisi: '',
  keterangan: '',
  harga_harapan: '',
}

const KONDISI = [
  'Sangat Baik (mulus, jarang pakai)',
  'Baik (normal, surat lengkap)',
  'Butuh Restorasi Ringan',
  'Butuh Restorasi Berat / Proyek',
]

function useAdaVideo(src) {
  const [ada, setAda] = useState(false)

  useEffect(() => {
    let batal = false

    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (batal) return
        const tipe = res.headers.get('content-type') || ''
        setAda(res.ok && tipe.startsWith('video/'))
      })
      .catch(() => {
        if (!batal) setAda(false)
      })

    return () => {
      batal = true
    }
  }, [src])

  return ada
}

function VidkatCard({ produk }) {
  const adaVideo = useAdaVideo(`/uploads/video_${produk.id}.mp4`)
  const videoRef = useRef(null)

  const fotoPembeli = String(produk.foto_pembeli ?? '').trim()
  const fotoTampil = fotoUrl(
    fotoPembeli || (Array.isArray(produk.foto) ? produk.foto[0] : ''),
    FOTO_FALLBACK
  )

  function mainkan() {
    const video = videoRef.current
    if (!video) return
    const janji = video.play()
    if (janji && typeof janji.catch === 'function') janji.catch(() => {})
  }

  function hentikan() {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
  }

  return (
    <Link className="vidkat-card" to={`/motor/${produk.id}`}>
      {adaVideo ? (
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          poster={fotoTampil}
          onMouseEnter={mainkan}
          onMouseLeave={hentikan}
        >
          <source src={`/uploads/video_${produk.id}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img
          className="vidkat-thumb"
          src={fotoTampil}
          alt={produk.nama_motor}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FOTO_FALLBACK
          }}
        />
      )}
      <div className="vidkat-overlay" />
      {adaVideo && <div className="vidkat-play">▶</div>}
      <div className="vidkat-status vs-terjual">Terjual</div>
      {fotoPembeli && <div className="vidkat-tag">📸 Bersama pembeli</div>}
      <div className="vidkat-info">
        <div className="vidkat-nama">{produk.nama_motor}</div>
        <div className="vidkat-tahun">
          Tahun {produk.tahun} · Rp {formatAngka(produk.harga)}
        </div>
      </div>
    </Link>
  )
}

export default function JualMotor() {
  useDocumentTitle('Jual Motor ke Astrea Kuyy')
  const { pengaturan } = usePengaturan()
  const { data: produkTerjual = [], isLoading: memuatTerjual } = useProdukTerjual(6)
  const { toasts, tampil, tutup } = useToast()

  const adaVideoHero = useAdaVideo('/uploads/video_hero.mp4')
  const [form, setForm] = useState(FORM_AWAL)
  const [foto, setFoto] = useState([])
  const [mengirim, setMengirim] = useState(false)
  const inputFotoRef = useRef(null)
  const daftarFotoRef = useRef([])

  useEffect(() => {
    daftarFotoRef.current = foto
  }, [foto])

  useEffect(() => {
    return () => {
      daftarFotoRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [])

  function ubahForm(e) {
    const { name, value } = e.target
    setForm((lama) => ({ ...lama, [name]: value }))
  }

  function pilihFoto(e) {
    const daftar = Array.from(e.target.files ?? []).slice(0, 5)
    if (daftar.length === 0) return

    const valid = []
    let ditolak = 0

    daftar.forEach((file) => {
      const ekstensi = (file.name.split('.').pop() || '').toLowerCase()
      const tipeValid =
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        ['jpg', 'jpeg', 'png', 'webp'].includes(ekstensi)

      if (!tipeValid || file.size > 5 * 1024 * 1024) {
        ditolak += 1
        return
      }

      valid.push({ file, url: URL.createObjectURL(file) })
    })

    if (ditolak > 0) {
      tampil(
        'err',
        'Gagal mengirim pengajuan',
        'Foto harus berformat JPG, PNG, atau WEBP dan maksimal 5MB per foto.'
      )
    }

    setFoto((lama) => {
      lama.forEach((item) => URL.revokeObjectURL(item.url))
      return valid
    })
    e.target.value = ''
  }

  function gulirKeForm(e) {
    e.preventDefault()
    document.getElementById('form-jual')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function kirim(e) {
    e.preventDefault()
    if (mengirim) return

    const namaPenjual = form.nama_penjual.trim()
    const waPenjual = form.wa_penjual.trim()
    const namaMotor = form.nama_motor.trim()
    const kondisi = form.kondisi.trim()
    const tahun = Number(form.tahun)

    if (!namaPenjual || !waPenjual || !namaMotor || !form.tahun || !kondisi) {
      tampil(
        'err',
        'Gagal mengirim pengajuan',
        'Lengkapi semua field yang wajib diisi (nama, WhatsApp, nama motor, tahun).'
      )
      return
    }

    if (!Number.isInteger(tahun) || tahun < 1970 || tahun > 2005) {
      tampil('err', 'Gagal mengirim pengajuan', 'Tahun motor harus antara 1970 dan 2005.')
      return
    }

    setMengirim(true)

    try {
      const daftarPath = []

      for (const item of foto) {
        const ekstensi = (item.file.name.split('.').pop() || 'jpg').toLowerCase()
        const namaFile =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? `${crypto.randomUUID()}.${ekstensi}`
            : `${Date.now()}-${Math.random().toString(16).slice(2)}.${ekstensi}`

        const { error: errorUpload } = await supabase.storage
          .from('pengajuan')
          .upload(namaFile, item.file, {
            contentType: item.file.type || 'image/jpeg',
            upsert: false,
          })

        if (errorUpload) throw errorUpload
        daftarPath.push(`pengajuan/${namaFile}`)
      }

      const hargaHarapan = Number(String(form.harga_harapan).replace(/[^0-9]/g, '')) || 0

      const { error } = await supabase.from('pengajuan_jual').insert({
        nama_penjual: namaPenjual,
        wa_penjual: waPenjual,
        nama_motor: namaMotor,
        tahun,
        kondisi,
        keterangan: form.keterangan.trim(),
        harga_harapan: hargaHarapan,
        foto: daftarPath,
      })

      if (error) throw error

      tampil(
        'ok',
        'Horee, pengajuan berhasil terkirim! 🎉',
        'Ditunggu ya, biar admin cek dulu — nanti kita kabarin lewat WhatsApp 😊'
      )

      setForm(FORM_AWAL)
      setFoto((lama) => {
        lama.forEach((item) => URL.revokeObjectURL(item.url))
        return []
      })
      if (inputFotoRef.current) inputFotoRef.current.value = ''
    } catch (error) {
      const pesan = /fetch|network|failed/i.test(String(error?.message || ''))
        ? 'Sepertinya koneksi internet kamu bermasalah, coba lagi ya.'
        : 'Coba periksa lagi isian form kamu, lalu kirim ulang ya.'

      tampil('err', 'Gagal mengirim pengajuan', pesan)
    } finally {
      setMengirim(false)
    }
  }

  const labelFoto =
    foto.length > 0
      ? `✅ ${foto.length} foto dipilih`
      : 'Klik untuk pilih foto (bisa pilih beberapa)'

  return (
    <>
      <div className="jual-hero">
        {adaVideoHero ? (
          <video autoPlay loop muted playsInline>
            <source src="/uploads/video_hero.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="jual-hero-fallback" />
        )}
        <div className="jual-hero-overlay" />
        <div className="jual-hero-content">
          <div className="jual-hero-badge">💰 Jual Motor ke Kami</div>
          <h1>
            Punya Astrea
            <br />
            <span>Mau Dilepas?</span>
          </h1>
          <p>
            Kami aktif beli unit Honda Astrea kondisi apapun — mulai dari yang mulus banget sampai
            yang butuh restorasi. Proses cepat, bayar tunai, deal hari ini bisa.
          </p>
          <div className="jual-hero-btns">
            <a href="#form-jual" className="btn-hero-jual" onClick={gulirKeForm}>
              📋 Ajukan Sekarang
            </a>
            <a
              href={waUrl(pengaturan.wa_admin, 'Halo, saya mau jual motor Astrea')}
              className="btn-hero-wa"
              target="_blank"
              rel="noopener"
            >
              💬 Chat Langsung
            </a>
          </div>
        </div>
        <div className="scroll-indicator">SCROLL</div>
      </div>

      <section className="vidkat-section">
        <div className="vidkat-header">
          <div className="vidkat-badge">🎬 Galeri Motor</div>
          <h2>Koleksi yang Pernah Kami Restorasi</h2>
          <p>Unit-unit yang sudah menemukan pemilik barunya — ini standar kualitas yang kami jaga</p>
        </div>
        <div className="vidkat-grid">
          {memuatTerjual ? null : produkTerjual.length > 0 ? (
            produkTerjual.map((produk) => <VidkatCard key={produk.id} produk={produk} />)
          ) : (
            <div className="vidkat-empty">
              <div className="jual-empty-icon">🏍️</div>
              <p className="jual-empty-text">Belum ada unit terjual yang ditampilkan.</p>
            </div>
          )}
        </div>

        <div className="jual-tip-wrap">
          <Link to="/#katalog" className="jual-link-katalog">
            Lihat Katalog Lengkap di Beranda
          </Link>
        </div>
      </section>

      <section className="jual-form-section" id="form-jual">
        <div className="jual-form-wrap">
          <div className="jual-form-left">
            <div className="section-badge">📋 Form Pengajuan</div>
            <h2>
              Isi Data
              <br />
              Motor Kamu
            </h2>
            <p>
              Kirim info motor kamu lewat form ini. Admin akan review dan hubungi kamu dalam waktu
              1×24 jam untuk kasih penawaran harga terbaik.
            </p>

            <div className="form-card">
              <form id="formJualMotor" onSubmit={kirim} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nama Kamu *</label>
                    <input
                      type="text"
                      name="nama_penjual"
                      placeholder="Contoh: Budi Santoso"
                      required
                      value={form.nama_penjual}
                      onChange={ubahForm}
                    />
                  </div>
                  <div className="form-group">
                    <label>No. WhatsApp *</label>
                    <input
                      type="text"
                      name="wa_penjual"
                      placeholder="0895xxxxxxxx"
                      required
                      value={form.wa_penjual}
                      onChange={ubahForm}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Nama / Tipe Motor *</label>
                    <input
                      type="text"
                      name="nama_motor"
                      placeholder="Contoh: Astrea Grand Bulus"
                      required
                      value={form.nama_motor}
                      onChange={ubahForm}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tahun *</label>
                    <input
                      type="number"
                      name="tahun"
                      placeholder="1985"
                      min="1970"
                      max="2005"
                      required
                      value={form.tahun}
                      onChange={ubahForm}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Kondisi Motor *</label>
                  <select name="kondisi" required value={form.kondisi} onChange={ubahForm}>
                    <option value="">— Pilih Kondisi —</option>
                    {KONDISI.map((nilai) => (
                      <option key={nilai} value={nilai}>
                        {nilai}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Keterangan Tambahan <span className="opt">(opsional)</span>
                  </label>
                  <textarea
                    name="keterangan"
                    placeholder="Ceritakan kondisi mesin, kelengkapan surat, nomor polisi, dll..."
                    value={form.keterangan}
                    onChange={ubahForm}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Harga Harapan (Rp) <span className="opt">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    name="harga_harapan"
                    placeholder="Contoh: 8000000"
                    value={form.harga_harapan}
                    onChange={ubahForm}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Foto Motor <span className="opt">(maks 5 foto, masing-masing maks 5MB)</span>
                  </label>
                  <label className="form-foto-zone" htmlFor="fotoInput">
                    <div className="form-foto-zone-icon">📷</div>
                    <div className="form-foto-zone-text">{labelFoto}</div>
                  </label>
                  <input
                    type="file"
                    id="fotoInput"
                    ref={inputFotoRef}
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={pilihFoto}
                  />
                  <div id="fotoPreviewWrap" className="foto-preview-wrap">
                    {foto.map((item, indeks) => (
                      <img
                        key={`${item.url}-${indeks}`}
                        className="preview-thumb"
                        src={item.url}
                        alt={`Foto ${indeks + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-ajukan" disabled={mengirim}>
                  {mengirim ? 'Mengirim...' : '📤 Kirim Pengajuan'}
                </button>
              </form>
            </div>
          </div>

          <div className="jual-form-right">
            <div className="kenapa-card">
              <div className="kenapa-title">🏆 Kenapa Jual ke Astrea Kuyy?</div>
              <div className="kenapa-item">
                <div className="kenapa-icon">💰</div>
                <div>
                  <div className="kenapa-text-title">Harga Fair &amp; Transparan</div>
                  <div className="kenapa-text-sub">
                    Penawaran kami berdasarkan kondisi nyata, no markup aneh-aneh
                  </div>
                </div>
              </div>
              <div className="kenapa-item">
                <div className="kenapa-icon">⚡</div>
                <div>
                  <div className="kenapa-text-title">Proses Super Cepat</div>
                  <div className="kenapa-text-sub">
                    Kirim data → dapat penawaran → deal hari itu juga bisa
                  </div>
                </div>
              </div>
              <div className="kenapa-item">
                <div className="kenapa-icon">💵</div>
                <div>
                  <div className="kenapa-text-title">Bayar Tunai Langsung</div>
                  <div className="kenapa-text-sub">
                    Tidak ada transfer bertahap — bayar cash saat cek fisik di tempat
                  </div>
                </div>
              </div>
              <div className="kenapa-item">
                <div className="kenapa-icon">🔧</div>
                <div>
                  <div className="kenapa-text-title">Terima Semua Kondisi</div>
                  <div className="kenapa-text-sub">
                    Motor butuh restorasi? Masih kami tampung dengan harga menyesuaikan
                  </div>
                </div>
              </div>
              <div className="kenapa-item">
                <div className="kenapa-icon">📍</div>
                <div>
                  <div className="kenapa-text-title">Bisa COD Jakarta</div>
                  <div className="kenapa-text-sub">
                    Kelapa Gading, Jakarta Utara — atau bisa atur meeting point
                  </div>
                </div>
              </div>
              <div className="tips-box">
                💡 <strong>Tips dapat harga lebih tinggi:</strong> Pastikan foto motor dari
                berbagai sudut, kondisi mesin dalam keadaan hidup, dan surat-surat (BPKB/STNK) ada
                semua!
              </div>
            </div>
          </div>
        </div>
      </section>

      <ToastHost toasts={toasts} onClose={tutup} />
    </>
  )
}
