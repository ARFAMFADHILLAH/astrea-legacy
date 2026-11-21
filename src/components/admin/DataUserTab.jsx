import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FOTO_FALLBACK, fotoUrl } from '../../lib/foto'
import { formatRupiah, tanggalJam, tanggalPendek } from '../../lib/format'
import { waUrl } from '../../lib/wa'
import { usePengajuanList, useProdukPembeli } from '../../hooks/useAdminData'

function BagianPembeli() {
  const { data: daftar = [], isLoading, error } = useProdukPembeli()
  const [cari, setCari] = useState('')

  const kata = cari.trim().toLowerCase()
  const tersaring = kata
    ? daftar.filter((item) =>
        [item.nama_pembeli, item.nama_motor, item.wa_pembeli]
          .map((nilai) => String(nilai ?? '').toLowerCase())
          .some((nilai) => nilai.includes(kata))
      )
    : daftar

  const tanpaData = daftar.filter((item) => !item.nama_pembeli).length

  return (
    <>
      {tanpaData > 0 ? (
        <div className="edit-hint" style={{ marginBottom: 12 }}>
          {tanpaData} unit terjual belum punya data pembeli. Lengkapi lewat halaman edit produk
          masing-masing supaya datanya tercatat.
        </div>
      ) : null}

      <div className="form-group" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label htmlFor="cari_pembeli">Cari pembeli</label>
        <input
          id="cari_pembeli"
          type="text"
          placeholder="Nama pembeli, motor, atau WhatsApp"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Foto</th>
              <th>Motor</th>
              <th>Pembeli</th>
              <th>WhatsApp</th>
              <th>Alamat</th>
              <th>Tgl Terjual</th>
              <th>Harga</th>
              <th className="td-aksi">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan="9">Memuat data pembeli…</td>
              </tr>
            ) : error ? (
              <tr className="empty-row">
                <td colSpan="9">Gagal memuat data pembeli: {error.message}</td>
              </tr>
            ) : tersaring.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="9">
                  {daftar.length === 0
                    ? 'Belum ada unit terjual. Data pembeli otomatis diminta saat kamu menandai unit Terjual.'
                    : 'Tidak ada pembeli yang cocok dengan pencarian.'}
                </td>
              </tr>
            ) : (
              tersaring.map((item, indeks) => {
                const foto = Array.isArray(item.foto) ? item.foto[0] : ''
                return (
                  <tr key={item.id}>
                    <td>{indeks + 1}</td>
                    <td>
                      {foto ? (
                        <img
                          src={fotoUrl(foto, FOTO_FALLBACK)}
                          className="img-thumb"
                          alt={item.nama_motor}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="td-bold">
                      {item.nama_motor}
                      <div style={{ fontWeight: 400, fontSize: 12, color: '#888' }}>
                        {item.tahun ?? '-'}
                      </div>
                    </td>
                    <td className="td-bold">{item.nama_pembeli || '—'}</td>
                    <td>
                      {item.wa_pembeli ? (
                        <a
                          href={waUrl(item.wa_pembeli)}
                          target="_blank"
                          rel="noopener"
                          className="btn-sm btn-edit"
                        >
                          {item.wa_pembeli}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{item.alamat_pembeli || '—'}</td>
                    <td>{item.tanggal_terjual ? tanggalPendek(item.tanggal_terjual) : '—'}</td>
                    <td className="td-bold">{formatRupiah(item.harga)}</td>
                    <td className="td-aksi">
                      <Link to={`/admin/produk/${item.id}`} className="btn-sm btn-edit">
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BagianPenjual() {
  const { data: daftar = [], isLoading, error } = usePengajuanList('disetujui')
  const [cari, setCari] = useState('')

  const kata = cari.trim().toLowerCase()
  const tersaring = kata
    ? daftar.filter((item) =>
        [item.nama_penjual, item.nama_motor, item.wa_penjual]
          .map((nilai) => String(nilai ?? '').toLowerCase())
          .some((nilai) => nilai.includes(kata))
      )
    : daftar

  return (
    <>
      <div className="edit-hint" style={{ marginBottom: 12 }}>
        Data penjual tercatat sejak pengajuan dikirim, dan tampil di sini setelah pengajuan
        disetujui admin.
      </div>

      <div className="form-group" style={{ maxWidth: 320, marginBottom: 14 }}>
        <label htmlFor="cari_penjual">Cari penjual</label>
        <input
          id="cari_penjual"
          type="text"
          placeholder="Nama penjual, motor, atau WhatsApp"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Motor</th>
              <th>Tahun</th>
              <th>Penjual</th>
              <th>WhatsApp</th>
              <th>Harga Harapan</th>
              <th>Tgl Disetujui</th>
              <th className="td-aksi">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan="8">Memuat data penjual…</td>
              </tr>
            ) : error ? (
              <tr className="empty-row">
                <td colSpan="8">Gagal memuat data penjual: {error.message}</td>
              </tr>
            ) : tersaring.length === 0 ? (
              <tr className="empty-row">
                <td colSpan="8">
                  {daftar.length === 0
                    ? 'Belum ada pengajuan jual yang disetujui.'
                    : 'Tidak ada penjual yang cocok dengan pencarian.'}
                </td>
              </tr>
            ) : (
              tersaring.map((item, indeks) => (
                <tr key={item.id}>
                  <td>{indeks + 1}</td>
                  <td className="td-bold">
                    {item.nama_motor}
                    {item.kondisi ? (
                      <div style={{ fontWeight: 400, fontSize: 12, color: '#888' }}>
                        {item.kondisi}
                      </div>
                    ) : null}
                  </td>
                  <td>{item.tahun}</td>
                  <td className="td-bold">{item.nama_penjual}</td>
                  <td>
                    <a
                      href={waUrl(item.wa_penjual)}
                      target="_blank"
                      rel="noopener"
                      className="btn-sm btn-edit"
                    >
                      {item.wa_penjual}
                    </a>
                  </td>
                  <td className="td-bold">{formatRupiah(item.harga_harapan)}</td>
                  <td>{tanggalJam(item.created_at)}</td>
                  <td className="td-aksi">
                    <Link to={`/pengajuan/${item.id}`} className="btn-sm btn-edit">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function DataUserTab() {
  const [bagian, setBagian] = useState('pembeli')
  const { data: pembeli = [] } = useProdukPembeli()
  const { data: penjual = [] } = usePengajuanList('disetujui')

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Data User</h2>
          <p>Pembeli unit terjual dan penjual yang pengajuannya sudah disetujui</p>
        </div>
        <Link to="/admin?menu=produk" className="btn-sm btn-edit">
          ← Kelola Produk
        </Link>
      </div>

      <div className="lp-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={bagian === 'pembeli' ? 'lp-tab lp-tab-active' : 'lp-tab'}
          onClick={() => setBagian('pembeli')}
        >
          Pembeli ({pembeli.length})
        </button>
        <button
          type="button"
          className={bagian === 'penjual' ? 'lp-tab lp-tab-active' : 'lp-tab'}
          onClick={() => setBagian('penjual')}
        >
          Penjual ({penjual.length})
        </button>
      </div>

      {bagian === 'pembeli' ? <BagianPembeli /> : <BagianPenjual />}
    </div>
  )
}
