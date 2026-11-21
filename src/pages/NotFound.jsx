import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Halaman Tidak Ditemukan - Astrea Legacy')

  return (
    <div className="phase-card">
      <div className="phase-icon">🔎</div>
      <h1>Halaman Tidak Ditemukan</h1>
      <p>Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
      <Link className="phase-link" to="/">
        Kembali ke Beranda
      </Link>
    </div>
  )
}
