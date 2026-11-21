import ChatBot from '../components/ChatBot'
import ProdukCard from '../components/ProdukCard'
import { usePengaturan } from '../hooks/usePengaturan'
import { useProdukKatalog } from '../hooks/useProduk'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { FOTO_FALLBACK, fotoUrl } from '../lib/foto'
import { waUrl } from '../lib/wa'

export default function Beranda() {
  useDocumentTitle('Astrea Legacy - Motor Klasik Terbaik')
  const { pengaturan } = usePengaturan()
  const { data: semuaProduk = [], isLoading } = useProdukKatalog()

  const unitReady = semuaProduk.filter((item) => item.status === 'Ready')
  const totalTerjual = semuaProduk.filter((item) => item.status === 'Terjual').length
  const banner = fotoUrl(pengaturan.foto_banner, FOTO_FALLBACK)

  function gulirKe(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="hero">
        <img
          className="hero-bg-img"
          src={banner}
          alt="banner"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">🏆 MOTOR KLASIK RESTORASI TERBAIK</div>
          <h1>
            Bawa Pulang
            <br />
            Nostalgia.
          </h1>
          <p>
            Koleksi Honda Astrea restorasi berkualitas tinggi. Surat lengkap, mesin prima, siap
            jalan.
          </p>
          <div className="hero-btns">
            <a
              href="#katalog"
              className="btn-hero-primary"
              onClick={(e) => {
                e.preventDefault()
                gulirKe('katalog')
              }}
            >
              Lihat Katalog
            </a>
            <a
              href={waUrl(pengaturan.wa_admin)}
              className="btn-hero-secondary"
              target="_blank"
              rel="noopener"
            >
              Chat WhatsApp
            </a>
          </div>
        </div>
      </section>

      <div className="stat-bar">
        <div className="stat-item">
          <div className="stat-num">{semuaProduk.length}+</div>
          <div className="stat-label">Total Unit</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{unitReady.length}</div>
          <div className="stat-label">Stok Ready</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{totalTerjual}</div>
          <div className="stat-label">Sudah Terjual</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">100%</div>
          <div className="stat-label">Bergaransi</div>
        </div>
      </div>

      <section id="katalog">
        <div className="section-header">
          <div>
            <div className="section-title">Koleksi Motor</div>
            <div className="section-sub">Unit pilihan siap dibawa pulang</div>
          </div>
        </div>

        <div className="grid-produk">
          {isLoading ? null : unitReady.length > 0 ? (
            unitReady.map((item) => <ProdukCard key={item.id} produk={item} />)
          ) : (
            <div className="empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏍️</div>
              <p>Mohon maaf stok belum tersedia.</p>
            </div>
          )}
        </div>
      </section>

      <section id="tentang" className="tentang-section">
        <div className="tentang-img">
          <img src="/uploads/pemilik.jpeg" alt="Pemilik Astrea Legacy" />
          <div className="tentang-img-caption">Pemilik Astrea Legacy</div>
        </div>
        <div className="tentang-content">
          <div className="badge-pill">🔥 TENTANG KAMI</div>
          <h2>
            Dibalik Astrea
            <br />
            <span className="text-accent">Legacy</span>
          </h2>
          <p>
            Halo! Saya pemilik sekaligus mekanik di Astrea Legacy. Sudah dari kecil suka otak-atik
            motor, dan kecintaan itu yang akhirnya jadi bisnis — spesialis jual beli motor klasik
            Honda Astrea.
          </p>
          <p>
            Setiap unit yang masuk kami periksa dan restorasi sendiri: mesin dicek teliti, bodi
            dirawat rapi, surat-surat dipastikan lengkap. Satu tujuan — pembeli bawa pulang motor
            yang benar-benar prima dan bisa langsung jalan.
          </p>
          <p>
            Kami juga aktif beli unit dari masyarakat. Punya Astrea yang mau dijual? Hubungi
            langsung — kami kasih harga terbaik dan proses yang cepat!
          </p>
          <div className="tentang-badges">
            <span className="info-badge">✅ Restorasi Sendiri</span>
            <span className="info-badge">📄 Surat Lengkap</span>
            <span className="info-badge">🔧 Mekanik Berpengalaman</span>
            <span className="info-badge">🤝 Jual Beli Terpercaya</span>
            <span className="info-badge">📍 Kelapa Gading, Jakut</span>
          </div>
        </div>
      </section>

      <section id="jual" className="jual-section">
        <div className="jual-content">
          <div className="badge-pill">💰 JUAL MOTOR KE KAMI</div>
          <h2>
            Punya Motor Astrea
            <br />
            Mau <span className="text-accent">Dijual?</span>
          </h2>
          <p>
            Astrea kuyy siap tampung unit kesayanganmu dengan harga yang fair dan proses yang cepat.
            Kami aktif nyari unit terawat — kalau kamu punya, kita bisa deal hari ini.
          </p>

          <div className="jual-step">
            <div className="jual-step-num">1</div>
            <div>
              <div className="jual-step-title">Kirim Foto &amp; Info Motor</div>
              <div className="jual-step-desc">
                Foto motor, tahun, kondisi mesin, dan kelengkapan surat ke admin via WhatsApp
              </div>
            </div>
          </div>
          <div className="jual-step">
            <div className="jual-step-num">2</div>
            <div>
              <div className="jual-step-title">Dapat Penawaran Harga</div>
              <div className="jual-step-desc">
                Admin akan review dan kasih estimasi harga terbaik sesuai kondisi unit
              </div>
            </div>
          </div>
          <div className="jual-step">
            <div className="jual-step-num">3</div>
            <div>
              <div className="jual-step-title">Deal &amp; Pembayaran Langsung</div>
              <div className="jual-step-desc">
                Sepakat harga, cek fisik, bayar tunai di tempat. Cepat, aman, no ribet
              </div>
            </div>
          </div>

          <div className="jual-btns">
            <a
              href={waUrl(pengaturan.wa_admin, 'Halo, saya mau jual motor Astrea')}
              className="btn-hero-primary"
              target="_blank"
              rel="noopener"
            >
              💬 Jual Motor Sekarang
            </a>
            <a
              href="#katalog"
              className="btn-hero-secondary-dark"
              onClick={(e) => {
                e.preventDefault()
                gulirKe('katalog')
              }}
            >
              Lihat Katalog Dulu
            </a>
          </div>
        </div>

        <div className="jual-box">
          <div className="jual-box-title">🏆 Kenapa Jual ke Astrea Legacy?</div>
          <ul className="jual-box-list">
            <li>✅ Harga penawaran fair, transparan, no PHP</li>
            <li>✅ Bayar tunai langsung saat deal</li>
            <li>✅ Proses cepat, bisa deal hari itu juga</li>
            <li>✅ Kami aktif cari unit, prioritas unit terawat</li>
            <li>✅ Sudah berpengalaman restorasi motor klasik</li>
            <li>✅ Unit tidak laku di tempat lain? Coba ke kami</li>
          </ul>
          <div className="jual-tips">
            💡 <strong>Tips:</strong> Semakin lengkap surat-surat dan semakin terawat kondisi mesin,
            makin tinggi harga yang kami tawarkan!
          </div>
        </div>
      </section>

      <ChatBot />
    </>
  )
}
