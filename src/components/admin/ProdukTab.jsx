import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmDialog from '../ConfirmDialog'
import { ToastHost, useToast } from '../Toast'
import { supabase } from '../../lib/supabase'
import { FOTO_FALLBACK, fotoUrl } from '../../lib/foto'
import { formatRupiah } from '../../lib/format'
import { hapusFotoStorage } from '../../lib/upload'
import { useProdukAdmin } from '../../hooks/useAdminData'

export default function ProdukTab() {
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()
  const { data: daftar = [], isLoading, error } = useProdukAdmin()
  const [hapus, setHapus] = useState(null)

  const hapusProduk = useMutation({
    mutationFn: async (produk) => {
      const { error: errorHapus } = await supabase.from('produk').delete().eq('id', produk.id)
      if (errorHapus) throw errorHapus

      const foto = Array.isArray(produk.foto) ? [...produk.foto] : []
      if (produk.foto_pembeli) foto.push(produk.foto_pembeli)
      await hapusFotoStorage(foto)
    },
    onSuccess: () => {
      setHapus(null)
      queryClient.invalidateQueries({ queryKey: ['produk'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
      queryClient.invalidateQueries({ queryKey: ['laporan'] })
      tampil('ok', 'Motor berhasil dihapus!', 'Data unit sudah dikeluarkan dari katalog.')
    },
    onError: (kesalahan) => {
      setHapus(null)
      tampil('err', 'Gagal menghapus motor', kesalahan.message)
    },
  })

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Daftar Koleksi Motor</h2>
            <p>Semua unit yang terdaftar di toko</p>
          </div>
          <Link to="/admin/produk/baru" className="btn-green">
            ＋ Tambah Motor
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th-no">No</th>
                <th className="th-foto">Foto</th>
                <th>Nama Motor</th>
                <th className="th-tahun">Tahun</th>
                <th className="th-harga">Harga</th>
                <th className="th-status">Status</th>
                <th className="th-aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="empty-row">
                  <td colSpan="7">Memuat daftar motor…</td>
                </tr>
              ) : error ? (
                <tr className="empty-row">
                  <td colSpan="7">Gagal memuat data: {error.message}</td>
                </tr>
              ) : daftar.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="7">Belum ada produk. Tambah unit baru.</td>
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
                      <td className="td-harga">{formatRupiah(produk.harga)}</td>
                      <td>
                        {String(produk.status).toLowerCase() === 'ready' ? (
                          <span className="badge badge-ready">READY</span>
                        ) : (
                          <span className="badge badge-terjual">TERJUAL</span>
                        )}
                      </td>
                      <td className="td-aksi">
                        <Link to={`/admin/produk/${produk.id}`} className="btn-sm btn-edit">
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn-sm btn-hapus"
                          onClick={() => setHapus(produk)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastHost toasts={toasts} onClose={tutup} />

      <ConfirmDialog
        buka={Boolean(hapus)}
        ikon="🗑️"
        judul="Hapus unit ini?"
        deskripsi={
          <>
            Motor <b>{hapus?.nama_motor}</b> akan dihapus dari katalog beserta fotonya, dan tercatat
            sebagai barang keluar di laporan stok.
          </>
        }
        labelYa="Ya, Hapus"
        jenis="tolak"
        memproses={hapusProduk.isPending}
        onBatal={() => setHapus(null)}
        onYa={() => hapus && hapusProduk.mutate(hapus)}
      />
    </>
  )
}
