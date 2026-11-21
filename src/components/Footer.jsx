import { Link } from 'react-router-dom'
import Ikon from './Ikon'
import { usePengaturan } from '../hooks/usePengaturan'
import { waUrl } from '../lib/wa'

export default function Footer({ showMap = false }) {
  const { pengaturan } = usePengaturan()

  const queryPeta =
    pengaturan.lat && pengaturan.lng ? `${pengaturan.lat},${pengaturan.lng}` : pengaturan.alamat
  const embedPeta = `https://maps.google.com/maps?q=${encodeURIComponent(
    queryPeta
  )}&hl=id&z=17&output=embed`
  const linkPeta = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryPeta)}`

  return (
    <footer>
      <div className="footer-top">
        <div className="footer-col footer-brand">
          <div className="logo-footer">ASTREA KUYYY</div>
          <p className="footer-desc">
            Motor klasik Honda Astrea hasil restorasi penuh — mesin prima, surat lengkap, siap pakai
            jangka panjang.
          </p>
        </div>
        <div className="footer-col">
          <div className="footer-title">Navigasi</div>
          <div className="footer-links">
            <Link to="/">Beranda</Link>
            <Link to="/#katalog">Katalog</Link>
            <Link to="/jual">Jual Motor</Link>
          </div>
        </div>
        <div className="footer-col">
          <div className="footer-title">Hubungi Kami</div>
          <div className="footer-links">
            <a href={waUrl(pengaturan.wa_admin)} target="_blank" rel="noopener">
              <Ikon jenis="wa" /> WhatsApp
            </a>
            {pengaturan.facebook && (
              <a href={pengaturan.facebook} target="_blank" rel="noopener">
                <Ikon jenis="facebook" /> Facebook
              </a>
            )}
            {pengaturan.tiktok && (
              <a href={pengaturan.tiktok} target="_blank" rel="noopener">
                <Ikon jenis="tiktok" /> TikTok
              </a>
            )}
          </div>
        </div>
      </div>

      {showMap && (
        <div className="footer-map">
          <div className="footer-title">Lokasi Kami</div>
          <iframe
            src={embedPeta}
            title="Lokasi Astrea Kuyy"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="footer-map-address">
            {pengaturan.alamat}
            <br />
            <a href={linkPeta} target="_blank" rel="noopener">
              Buka di Maps ↗
            </a>
          </div>
        </div>
      )}

      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} Astrea kuyyy. Seluruh hak cipta dilindungi.</div>
        <div className="footer-bottom-right">
          <span>Motor Klasik Restorasi Berkualitas</span>
        </div>
      </div>
    </footer>
  )
}
