import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmDialog from '../ConfirmDialog'
import { ToastHost, useToast } from '../Toast'
import { supabase } from '../../lib/supabase'
import { formatRupiah, hariIni, tanggalPendek } from '../../lib/format'
import { usePengeluaranList, useStatistik } from '../../hooks/useAdminData'

const KATEGORI = ['Sparepart', 'Operasional', 'Rutin', 'Lain-lain']

const FORM_AWAL = {
  keterangan: '',
  jumlah: '',
  kategori: 'Sparepart',
  tanggal: hariIni(),
}

function kelasBadgeKategori(kategori) {
  if (kategori === 'Sparepart') return 'badge badge-sparepart'
  if (kategori === 'Operasional') return 'badge badge-operasional'
  if (kategori === 'Rutin') return 'badge badge-rutin'
  return 'badge badge-lain'
}

export default function PengeluaranTab() {
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()
  const { data: statistik } = useStatistik()
  const { data: daftar = [], isLoading, error } = usePengeluaranList()

  const [form, setForm] = useState(FORM_AWAL)
  const [hapus, setHapus] = useState(null)

  function ubahForm(event) {
    const { name, value } = event.target
    setForm((lama) => ({ ...lama, [name]: value }))
  }

  function segarkan() {
    queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
    queryClient.invalidateQueries({ queryKey: ['laporan'] })
  }

  const simpan = useMutation({
    mutationFn: async () => {
      const jumlah = Number(String(form.jumlah).replace(/[^0-9]/g, '')) || 0
      const { error: errorSimpan } = await supabase.from('pengeluaran').insert({
        keterangan: form.keterangan.trim(),
        jumlah,
        kategori: form.kategori,
        tanggal: form.tanggal,
      })
      if (errorSimpan) throw errorSimpan
    },
    onSuccess: () => {
      setForm({ ...FORM_AWAL, tanggal: form.tanggal })
      segarkan()
      tampil('ok', 'Pengeluaran berhasil ditambahkan!', 'Catatan biaya sudah masuk ke laporan kas.')
    },
    onError: (kesalahan) => {
      tampil('err', 'Gagal menambah pengeluaran', kesalahan.message)
    },
  })

  const hapusPengeluaran = useMutation({
    mutationFn: async (item) => {
      const { error: errorHapus } = await supabase.from('pengeluaran').delete().eq('id', item.id)
      if (errorHapus) throw errorHapus
    },
    onSuccess: () => {
      setHapus(null)
      segarkan()
      tampil('ok', 'Catatan pengeluaran dihapus', 'Total pengeluaran sudah diperbarui.')
    },
    onError: (kesalahan) => {
      setHapus(null)
      tampil('err', 'Gagal menghapus catatan', kesalahan.message)
    },
  })

  function kirim(event) {
    event.preventDefault()
    if (simpan.isPending) return
    if (!form.keterangan.trim() || !form.jumlah || !form.tanggal) return
    simpan.mutate()
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Catat Pengeluaran</h2>
            <p>Tambah catatan biaya operasional</p>
          </div>
        </div>

        <div className="form-wrap">
          <form onSubmit={kirim}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="pengeluaran-keterangan">Keterangan</label>
                <input
                  id="pengeluaran-keterangan"
                  type="text"
                  name="keterangan"
                  placeholder="Contoh: Beli kampas rem"
                  required
                  value={form.keterangan}
                  onChange={ubahForm}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pengeluaran-jumlah">Jumlah (Rp)</label>
                <input
                  id="pengeluaran-jumlah"
                  type="number"
                  name="jumlah"
                  placeholder="250000"
                  required
                  value={form.jumlah}
                  onChange={ubahForm}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pengeluaran-tanggal">Tanggal</label>
                <input
                  id="pengeluaran-tanggal"
                  type="date"
                  name="tanggal"
                  required
                  value={form.tanggal}
                  onChange={ubahForm}
                />
              </div>
            </div>

            <div className="form-row form-row-inline">
              <div className="form-group">
                <label htmlFor="pengeluaran-kategori">Kategori</label>
                <select
                  id="pengeluaran-kategori"
                  name="kategori"
                  value={form.kategori}
                  onChange={ubahForm}
                >
                  {KATEGORI.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button type="submit" className="btn-green btn-pengeluaran" disabled={simpan.isPending}>
                  {simpan.isPending ? 'Menyimpan…' : 'Tambah Pengeluaran'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Riwayat Pengeluaran</h2>
            <p>
              Total: <strong className="text-red">{formatRupiah(statistik?.totalPengeluaran)}</strong>
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Kategori</th>
                <th>Jumlah</th>
                <th className="td-aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="empty-row">
                  <td colSpan="6">Memuat catatan pengeluaran…</td>
                </tr>
              ) : error ? (
                <tr className="empty-row">
                  <td colSpan="6">Gagal memuat data: {error.message}</td>
                </tr>
              ) : daftar.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="6">Belum ada catatan pengeluaran.</td>
                </tr>
              ) : (
                daftar.map((item, indeks) => (
                  <tr key={item.id}>
                    <td>{indeks + 1}</td>
                    <td>{tanggalPendek(item.tanggal)}</td>
                    <td className="td-bold">{item.keterangan}</td>
                    <td>
                      <span className={kelasBadgeKategori(item.kategori)}>{item.kategori}</span>
                    </td>
                    <td className="td-harga-red">{formatRupiah(item.jumlah)}</td>
                    <td className="td-aksi">
                      <button
                        type="button"
                        className="btn-sm btn-hapus"
                        onClick={() => setHapus(item)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastHost toasts={toasts} onClose={tutup} />

      <ConfirmDialog
        buka={Boolean(hapus)}
        ikon="🗑️"
        judul="Hapus catatan ini?"
        deskripsi={
          <>
            Catatan <b>{hapus?.keterangan}</b> sebesar <b>{formatRupiah(hapus?.jumlah)}</b> akan
            dihapus dari laporan kas.
          </>
        }
        labelYa="Ya, Hapus"
        jenis="tolak"
        memproses={hapusPengeluaran.isPending}
        onBatal={() => setHapus(null)}
        onYa={() => hapus && hapusPengeluaran.mutate(hapus)}
      />
    </>
  )
}
