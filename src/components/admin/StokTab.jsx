import { Link } from 'react-router-dom'
import { FOTO_FALLBACK, fotoUrl } from '../../lib/foto'
import { formatRupiah } from '../../lib/format'
import { useProdukStok, useStatistik } from '../../hooks/useAdminData'

export default function StokTab() {
  const { data: statistik } = useStatistik()
  const { data: daftar = [], isLoading, error } = useProdukStok()

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Stok Astrea</h2>
          <p>Ringkasan ketersediaan unit saat ini</p>
        </div>
        <Link to="/admin/produk/baru" className="btn-green">
          ＋ Tambah Unit
        </Link>
      </div>

      <div className="stok-summary">
        <div className="stok-item">
          <div className="stok-num">{statistik?.totalUnit ?? 0}</div>
          <div className="stok-label">Total Unit</div>
        </div>
        <div className="stok-item">
          <div className="stok-num-green">{statistik?.totalReady ?? 0}</div>
          <div className="stok-label">Unit Ready</div>
        </div>
        <div className="stok-item">
          <div className="stok-num-red">{statistik?.totalTerjual ?? 0}</div>
          <div className="stok-label">Unit Terjual</div>
        </div>
      </div>

      <div className="nilai-stok-bar">
        Nilai Stok Ready: {formatRupiah(statistik?.nilaiStok)}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Foto</th>
              <th>Nama Motor</th>
              <th>Tahun</th>
              <th>Harga</th>
              <th>Status</th>
              <th className="td-aksi">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan="7">Memuat stok motor…</td>
              </tr>
            ) : error ? (
              <tr className="empty-row">
                <td colSpan="7">Gagal memuat stok: {error.message}</td>
              </tr>
            ) : daftar.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="7">Belum ada stok motor.</td>
              </tr>
            ) : (
              daftar.map((produk, indeks) => {
                const foto = Array.isArray(produk.foto) ? produk.foto[0] : ''
                return (
                  <tr key={produk.id}>
                    <td>{indeks + 1}</td>
                    <td>
                      {foto ? (
                        <img
                          src={fotoUrl(foto, FOTO_FALLBACK)}
                          className="img-thumb"
                          alt={produk.nama_motor}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="td-bold">{produk.nama_motor}</td>
                    <td>{produk.tahun ?? '-'}</td>
                    <td className="td-bold">{formatRupiah(produk.harga)}</td>
                    <td>
                      {String(produk.status).toLowerCase() === 'ready' ? (
                        <span className="badge badge-ready">READY</span>
                      ) : (
                        <span className="badge badge-terjual">TERJUAL</span>
                      )}
                    </td>
                    <td className="td-aksi">
                      <Link to={`/admin/produk/${produk.id}`} className="btn-sm btn-edit">
                        Update Status
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
