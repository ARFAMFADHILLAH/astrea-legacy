import { Link } from 'react-router-dom'
import { FOTO_FALLBACK, fotoUrl } from '../lib/foto'
import { formatRupiah } from '../lib/format'

export default function ProdukCard({ produk }) {
  const foto = Array.isArray(produk.foto) && produk.foto.length > 0
    ? fotoUrl(produk.foto[0], FOTO_FALLBACK)
    : FOTO_FALLBACK

  return (
    <div className="card-produk">
      <div className="img-wrapper">
        <img
          src={foto}
          alt={produk.nama_motor}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FOTO_FALLBACK
          }}
        />
        <div
          className={`badge-overlay ${
            produk.status === 'Ready' ? 'status-ready' : 'status-terjual'
          }`}
        >
          {produk.status}
        </div>
      </div>
      <div className="info-produk">
        <div className="tahun-motor">TAHUN {produk.tahun}</div>
        <div className="nama-motor">{produk.nama_motor}</div>
        <div className="harga">{formatRupiah(produk.harga)}</div>
        <Link to={`/motor/${produk.id}`} className="btn-detail">
          Lihat Detail →
        </Link>
      </div>
    </div>
  )
}
