import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Ikon from '../components/Ikon'
import { useProdukDetail } from '../hooks/useProduk'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePengaturan } from '../hooks/usePengaturan'
import { FOTO_FALLBACK, fotoUrl } from '../lib/foto'
import { formatAngka, formatRupiah } from '../lib/format'
import { waUrl } from '../lib/wa'

export default function DetailMotor() {
  const { id } = useParams()
  const { data: produk, isLoading } = useProdukDetail(id)
  const { pengaturan } = usePengaturan()
  const [aktif, setAktif] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useDocumentTitle(produk ? `${produk.nama_motor} - Astrea Kuyy` : 'Detail Motor - Astrea Kuyy')

  useEffect(() => {
    setAktif(0)
    setLightbox(false)
  }, [produk?.id])

  useEffect(() => {
    if (!lightbox) return undefined

    function tekanTombol(e) {
      if (e.key === 'Escape') setLightbox(false)
    }

    document.addEventListener('keydown', tekanTombol)
    return () => document.removeEventListener('keydown', tekanTombol)
  }, [lightbox])

  if (isLoading) {
    return <div className="app-loading">Memuat detail motor…</div>
  }

  if (!produk) {
    return <div className="app-loading">Produk tidak ditemukan!</div>
  }

  const terjual = String(produk.status).toLowerCase() === 'terjual'
  const galeri = []

  // Foto bareng pembeli tampil pertama untuk unit Terjual — sama seperti detail.php.
  const fotoPembeli = terjual ? String(produk.foto_pembeli ?? '').trim() : ''
  if (fotoPembeli) {
    galeri.push({ src: fotoUrl(fotoPembeli, FOTO_FALLBACK), label: '📸 Bersama pembeli' })
  }

  const daftarFoto = Array.isArray(produk.foto) ? produk.foto : []
  daftarFoto.forEach((path) => {
    const nilai = String(path ?? '').trim()
    if (nilai) galeri.push({ src: fotoUrl(nilai, FOTO_FALLBACK), label: '' })
  })

  const fotoAktif = galeri[aktif] ?? galeri[0]

  const pesanWa = terjual
    ? `Halo, saya lihat ${produk.nama_motor} sudah terjual. Ada unit serupa yang ready?`
    : `Halo, saya tertarik dengan ${produk.nama_motor} (Tahun ${produk.tahun}) Rp ${formatAngka(
        produk.harga
      )}. Apakah masih ready?`

  return (
    <>
      <div
        className={`lightbox${lightbox ? ' lightbox-open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setLightbox(false)}
      >
        {lightbox && fotoAktif && <img src={fotoAktif.src} alt="Foto besar" />}
        <button type="button" className="lightbox-close" aria-label="Tutup" onClick={() => setLightbox(false)}>
          ✕
        </button>
      </div>

      <div className="detail-wrap">
        <div className="detail-card">
          <div className="detail-gallery">
            {galeri.length > 0 ? (
              <>
                <div className="detail-main-wrap">
                  <img
                    src={fotoAktif.src}
                    className="main-img"
                    alt={produk.nama_motor}
                    onClick={() => setLightbox(true)}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = FOTO_FALLBACK
                    }}
                  />
                  {galeri.length > 1 && (
                    <div className="detail-foto-count">
                      {aktif + 1} / {galeri.length}
                    </div>
                  )}
                  {fotoAktif.label && (
                    <div className="detail-foto-label">{fotoAktif.label}</div>
                  )}
                  <div className="detail-zoom-hint">🔍 Klik untuk perbesar</div>
                </div>

                {galeri.length > 1 && (
                  <div className="detail-thumbs">
                    {galeri.map((foto, indeks) => (
                      <img
                        key={`${foto.src}-${indeks}`}
                        src={foto.src}
                        className={indeks === aktif ? 'active' : undefined}
                        alt={`Foto ${indeks + 1}`}
                        onClick={() => setAktif(indeks)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="detail-foto-empty">🏍️</div>
            )}
          </div>

          <div className="detail-info">
            <span
              className={`detail-status ${
                String(produk.status).toLowerCase() === 'ready' ? 'status-ready' : 'status-terjual'
              }`}
            >
              {produk.status}
            </span>
            <h1>{produk.nama_motor}</h1>
            <div className="detail-tahun">🏍️ Tahun {produk.tahun}</div>
            <div className="detail-price">{formatRupiah(produk.harga)}</div>

            {produk.deskripsi ? <div className="detail-desc">{produk.deskripsi}</div> : null}

            {terjual && (
              <div className="detail-sold-note">
                ✅ Unit ini sudah menemukan pemilik barunya
                {fotoPembeli ? ' — lihat foto serah terima di galeri.' : '.'}
              </div>
            )}

            <div className="detail-actions">
              <a
                href={waUrl(pengaturan.wa_admin, pesanWa)}
                target="_blank"
                rel="noopener"
                className="btn-wa"
              >
                <Ikon jenis="wa" /> {terjual ? 'Cari unit serupa' : 'Tanya via WhatsApp'}
              </a>
              <Link to="/" className="btn-back">
                ← Kembali
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
