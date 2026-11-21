import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Ikon from './Ikon'
import { usePengaturan } from '../hooks/usePengaturan'
import { waUrl } from '../lib/wa'

export default function Header() {
  const { pengaturan } = usePengaturan()
  const [terbuka, setTerbuka] = useState(false)
  const [logoGagal, setLogoGagal] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setTerbuka(false)
  }, [location.pathname, location.hash])

  return (
    <header>
      <Link className="logo" to="/" aria-label="Astrea Legacy - Beranda">
        <div className="logo-icon">
          {logoGagal ? (
            '🏍️'
          ) : (
            <img src="/uploads/logo.png" alt="Logo" onError={() => setLogoGagal(true)} />
          )}
        </div>
        <div>
          <span className="logo-text">GALIN ASTREA GARAGE</span>
          <span className="logo-sub">Motor Klasik Terpercaya</span>
        </div>
      </Link>

      <nav className={terbuka ? 'open' : undefined}>
        <Link to="/">Beranda</Link>
        <Link to="/#katalog">Katalog</Link>
        <Link to="/#tentang">Tentang</Link>
        <Link to="/jual" className={location.pathname === '/jual' ? 'nav-item-active' : undefined}>
          Jual Motor
        </Link>
        <a
          href={waUrl(pengaturan.wa_admin)}
          className="btn-wa-header"
          target="_blank"
          rel="noopener"
        >
          <Ikon jenis="wa" /> Hubungi Kami
        </a>
      </nav>

      <button
        type="button"
        className="nav-toggle"
        onClick={() => setTerbuka((nilai) => !nilai)}
        aria-label="Buka menu"
        aria-expanded={terbuka}
      >
        &#9776;
      </button>
    </header>
  )
}
