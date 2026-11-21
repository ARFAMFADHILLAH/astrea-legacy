import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ToastHost, useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { formatAngka, formatRupiah, hariIni, tanggalPendek } from '../../lib/format'
import { eksporLaporan } from '../../lib/eksporLaporan'
import {
  useLaporanBarang,
  useLaporanUang,
  useRentangAwal,
} from '../../hooks/useAdminData'

const FORM_UANG = {
  jenis_uang: 'masuk',
  kategori: '',
  jumlah: '',
  tanggal: hariIni(),
  keterangan: '',
}

const FORM_BARANG = {
  nama_motor: '',
  jenis_barang: 'masuk',
  jumlah_barang: '1',
  tanggal_barang: hariIni(),
  keterangan_barang: '',
}

export default function Laporan() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()

  const tab = searchParams.get('tab') === 'barang' ? 'barang' : 'uang'
  const rentang = useRentangAwal()

  const dari = searchParams.get('dari') || rentang.data || ''
  const sampai = searchParams.get('sampai') || hariIni()

  const [filter, setFilter] = useState({ dari, sampai })
  const [formUang, setFormUang] = useState(FORM_UANG)
  const [formBarang, setFormBarang] = useState(FORM_BARANG)
  const [hapus, setHapus] = useState(null)

  useEffect(() => {
    setFilter({ dari, sampai })
  }, [dari, sampai])

  const uang = useLaporanUang(dari, sampai)
  const barang = useLaporanBarang(dari, sampai)

  const dataAktif = tab === 'uang' ? uang.data : barang.data
  const memuat = tab === 'uang' ? uang.isLoading : barang.isLoading
  const galatQuery = tab === 'uang' ? uang.error : barang.error

  function segarkan() {
    queryClient.invalidateQueries({ queryKey: ['laporan'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
    queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
    queryClient.invalidateQueries({ queryKey: ['pemasukan'] })
  }

  function pilihTab(nilai) {
    setSearchParams({ tab: nilai, dari: dari || filter.dari, sampai: sampai || filter.sampai })
  }

  function terapkanFilter(event) {
    event.preventDefault()
    if (!filter.dari || !filter.sampai) return
    setSearchParams({ tab, dari: filter.dari, sampai: filter.sampai })
  }

  const simpanUang = useMutation({
    mutationFn: async () => {
      const tabel = formUang.jenis_uang === 'masuk' ? 'pemasukan' : 'pengeluaran'
      const { error } = await supabase.from(tabel).insert({
        keterangan: formUang.keterangan.trim(),
        jumlah: Number(String(formUang.jumlah).replace(/[^0-9]/g, '')) || 0,
        kategori: formUang.kategori.trim() || 'Lain-lain',
        tanggal: formUang.tanggal,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFormUang((lama) => ({ ...FORM_UANG, tanggal: lama.tanggal }))
      segarkan()
      tampil('ok', 'Catatan berhasil disimpan!', 'Data uang sudah masuk ke laporan kas.')
    },
    onError: (error) => tampil('err', 'Gagal menyimpan catatan', error.message),
  })

  const simpanBarang = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('log_stok').insert({
        nama_motor: formBarang.nama_motor.trim(),
        jenis: formBarang.jenis_barang,
        jumlah: Number(formBarang.jumlah_barang) || 1,
        tanggal: formBarang.tanggal_barang,
        keterangan: formBarang.keterangan_barang.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setFormBarang((lama) => ({ ...FORM_BARANG, tanggal_barang: lama.tanggal_barang }))
      segarkan()
      tampil('ok', 'Catatan berhasil disimpan!', 'Pergerakan stok sudah tercatat.')
    },
    onError: (error) => tampil('err', 'Gagal menyimpan catatan', error.message),
  })

  const hapusCatatan = useMutation({
    mutationFn: async (target) => {
      const { error } = await supabase.from(target.sumber).delete().eq('id', target.item.id)
      if (error) throw error
    },
    onSuccess: () => {
      setHapus(null)
      segarkan()
      tampil('ok', 'Catatan berhasil dihapus!', 'Laporan sudah diperbarui.')
    },
    onError: (error) => {
      setHapus(null)
      tampil('err', 'Gagal menghapus catatan', error.message)
    },
  })

  function kirimUang(event) {
    event.preventDefault()
    if (simpanUang.isPending) return
    simpanUang.mutate()
  }

  function kirimBarang(event) {
    event.preventDefault()
    if (simpanBarang.isPending) return
    simpanBarang.mutate()
  }

  async function ekspor() {
    if (!dari || !sampai) return
    try {
      await eksporLaporan({ tab, dari, sampai, uang: uang.data, barang: barang.data })
    } catch (error) {
      tampil('err', 'Gagal mengekspor laporan', error.message)
    }
  }

  return (
    <>
      <div className="lp-tabs">
        <button
          type="button"
          className={`lp-tab ${tab === 'uang' ? 'lp-tab-active' : ''}`}
          onClick={() => pilihTab('uang')}
        >
          💰 Uang Masuk/Keluar
        </button>
        <button
          type="button"
          className={`lp-tab ${tab === 'barang' ? 'lp-tab-active' : ''}`}
          onClick={() => pilihTab('barang')}
        >
          🏍️ Barang Masuk/Keluar
        </button>
      </div>

      <div className="lp-card">
        <div className="lp-card-body">
          <form className="lp-filter" onSubmit={terapkanFilter}>
            <div className="lp-fg">
              <label htmlFor="laporan-dari">Dari Tanggal</label>
              <input
                id="laporan-dari"
                type="date"
                value={filter.dari}
                onChange={(event) => setFilter((lama) => ({ ...lama, dari: event.target.value }))}
              />
            </div>
            <div className="lp-fg">
              <label htmlFor="laporan-sampai">Sampai Tanggal</label>
              <input
                id="laporan-sampai"
                type="date"
                value={filter.sampai}
                onChange={(event) => setFilter((lama) => ({ ...lama, sampai: event.target.value }))}
              />
            </div>
            <button type="submit" className="lp-btn lp-btn-green">
              Terapkan Filter
            </button>
            <button
              type="button"
              className="lp-btn lp-btn-export"
              onClick={ekspor}
              disabled={memuat}
            >
              ⬇ Export ke Excel
            </button>
          </form>
        </div>
      </div>

      {tab === 'uang' ? (
        <>
          <div className="lp-stat-row">
            <div className="lp-stat-box lp-in">
              <div className="lp-lbl">Total Masuk</div>
              <div className="lp-val lp-val-in">{formatRupiah(uang.data?.totalMasuk)}</div>
            </div>
            <div className="lp-stat-box lp-out">
              <div className="lp-lbl">Total Keluar</div>
              <div className="lp-val lp-val-out">{formatRupiah(uang.data?.totalKeluar)}</div>
            </div>
            <div className="lp-stat-box lp-net">
              <div className="lp-lbl">Saldo</div>
              <div className="lp-val lp-val-saldo">{formatRupiah(uang.data?.saldo)}</div>
            </div>
          </div>

          <div className="lp-card">
            <div className="lp-card-head">Tambah Catatan Uang</div>
            <div className="lp-card-body">
              <form onSubmit={kirimUang}>
                <div className="lp-form-grid">
                  <div className="lp-fg">
                    <label htmlFor="jenis_uang">Jenis</label>
                    <select
                      id="jenis_uang"
                      value={formUang.jenis_uang}
                      onChange={(event) =>
                        setFormUang((lama) => ({ ...lama, jenis_uang: event.target.value }))
                      }
                      required
                    >
                      <option value="masuk">Uang Masuk</option>
                      <option value="keluar">Uang Keluar</option>
                    </select>
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="kategori_uang">Kategori</label>
                    <input
                      id="kategori_uang"
                      type="text"
                      placeholder="Cth: Penjualan / Operasional"
                      required
                      value={formUang.kategori}
                      onChange={(event) =>
                        setFormUang((lama) => ({ ...lama, kategori: event.target.value }))
                      }
                    />
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="jumlah_uang">Jumlah (Rp)</label>
                    <input
                      id="jumlah_uang"
                      type="number"
                      placeholder="100000"
                      min="0"
                      required
                      value={formUang.jumlah}
                      onChange={(event) =>
                        setFormUang((lama) => ({ ...lama, jumlah: event.target.value }))
                      }
                    />
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="tanggal_uang">Tanggal</label>
                    <input
                      id="tanggal_uang"
                      type="date"
                      required
                      value={formUang.tanggal}
                      onChange={(event) =>
                        setFormUang((lama) => ({ ...lama, tanggal: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="lp-fg lp-fg-wide">
                  <label htmlFor="keterangan_uang">Keterangan</label>
                  <input
                    id="keterangan_uang"
                    type="text"
                    placeholder="Catatan singkat"
                    required
                    value={formUang.keterangan}
                    onChange={(event) =>
                      setFormUang((lama) => ({ ...lama, keterangan: event.target.value }))
                    }
                  />
                </div>

                <button type="submit" className="lp-btn lp-btn-green" disabled={simpanUang.isPending}>
                  {simpanUang.isPending ? 'Menyimpan…' : 'Simpan'}
                </button>
              </form>
            </div>
          </div>

          <div className="lp-card">
            <div className="lp-card-head">
              Riwayat ({dari} s/d {sampai})
            </div>
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th>Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {memuat ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Memuat laporan…
                      </td>
                    </tr>
                  ) : galatQuery ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Gagal memuat laporan: {galatQuery.message}
                      </td>
                    </tr>
                  ) : (uang.data?.daftar ?? []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Belum ada catatan di rentang ini.
                      </td>
                    </tr>
                  ) : (
                    uang.data.daftar.map((item) => (
                      <tr key={`${item.sumber}-${item.id}`}>
                        <td>{tanggalPendek(item.tanggal)}</td>
                        <td>
                          <span
                            className={`lp-badge ${
                              item.jenis === 'masuk' ? 'lp-badge-masuk' : 'lp-badge-keluar'
                            }`}
                          >
                            {item.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td>{item.kategori}</td>
                        <td>{item.keterangan}</td>
                        <td>{formatRupiah(item.jumlah)}</td>
                        <td>
                          <button
                            type="button"
                            className="lp-hapus"
                            onClick={() =>
                              setHapus({ item, sumber: item.sumber, label: item.keterangan })
                            }
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
        </>
      ) : (
        <>
          <div className="lp-stat-row">
            <div className="lp-stat-box lp-in">
              <div className="lp-lbl">Total Unit Masuk</div>
              <div className="lp-val lp-val-in">
                {formatAngka(barang.data?.totalMasuk)} unit
              </div>
            </div>
            <div className="lp-stat-box lp-out">
              <div className="lp-lbl">Total Unit Keluar</div>
              <div className="lp-val lp-val-out">
                {formatAngka(barang.data?.totalKeluar)} unit
              </div>
            </div>
            <div className="lp-stat-box lp-net">
              <div className="lp-lbl">Selisih Stok</div>
              <div className="lp-val lp-val-saldo">
                {formatAngka(barang.data?.selisih)} unit
              </div>
            </div>
          </div>

          <div className="lp-card">
            <div className="lp-card-head">Tambah Catatan Barang</div>
            <div className="lp-card-body">
              <form onSubmit={kirimBarang}>
                <div className="lp-form-grid">
                  <div className="lp-fg">
                    <label htmlFor="nama_motor_stok">Nama Motor</label>
                    <input
                      id="nama_motor_stok"
                      type="text"
                      placeholder="Cth: Astrea Prima 1991"
                      required
                      value={formBarang.nama_motor}
                      onChange={(event) =>
                        setFormBarang((lama) => ({ ...lama, nama_motor: event.target.value }))
                      }
                    />
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="jenis_barang">Jenis</label>
                    <select
                      id="jenis_barang"
                      required
                      value={formBarang.jenis_barang}
                      onChange={(event) =>
                        setFormBarang((lama) => ({ ...lama, jenis_barang: event.target.value }))
                      }
                    >
                      <option value="masuk">Barang Masuk</option>
                      <option value="keluar">Barang Keluar</option>
                    </select>
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="jumlah_barang">Jumlah (unit)</label>
                    <input
                      id="jumlah_barang"
                      type="number"
                      min="1"
                      required
                      value={formBarang.jumlah_barang}
                      onChange={(event) =>
                        setFormBarang((lama) => ({ ...lama, jumlah_barang: event.target.value }))
                      }
                    />
                  </div>
                  <div className="lp-fg">
                    <label htmlFor="tanggal_barang">Tanggal</label>
                    <input
                      id="tanggal_barang"
                      type="date"
                      required
                      value={formBarang.tanggal_barang}
                      onChange={(event) =>
                        setFormBarang((lama) => ({ ...lama, tanggal_barang: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="lp-fg lp-fg-wide">
                  <label htmlFor="keterangan_barang">Keterangan</label>
                  <input
                    id="keterangan_barang"
                    type="text"
                    placeholder="Cth: Beli dari supplier / Terjual ke customer"
                    value={formBarang.keterangan_barang}
                    onChange={(event) =>
                      setFormBarang((lama) => ({ ...lama, keterangan_barang: event.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="lp-btn lp-btn-green"
                  disabled={simpanBarang.isPending}
                >
                  {simpanBarang.isPending ? 'Menyimpan…' : 'Simpan'}
                </button>
              </form>
            </div>
          </div>

          <div className="lp-card">
            <div className="lp-card-head">
              Riwayat ({dari} s/d {sampai})
            </div>
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama Motor</th>
                    <th>Jenis</th>
                    <th>Jumlah</th>
                    <th>Keterangan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {memuat ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Memuat laporan…
                      </td>
                    </tr>
                  ) : galatQuery ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Gagal memuat laporan: {galatQuery.message}
                      </td>
                    </tr>
                  ) : (barang.data?.daftar ?? []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="lp-empty">
                        Belum ada catatan di rentang ini.
                      </td>
                    </tr>
                  ) : (
                    barang.data.daftar.map((item) => (
                      <tr key={item.id}>
                        <td>{tanggalPendek(item.tanggal)}</td>
                        <td>{item.nama_motor}</td>
                        <td>
                          <span
                            className={`lp-badge ${
                              item.jenis === 'masuk' ? 'lp-badge-masuk' : 'lp-badge-keluar'
                            }`}
                          >
                            {item.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td>{formatAngka(item.jumlah)} unit</td>
                        <td>{item.keterangan}</td>
                        <td>
                          <button
                            type="button"
                            className="lp-hapus"
                            onClick={() =>
                              setHapus({ item, sumber: 'log_stok', label: item.nama_motor })
                            }
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
        </>
      )}

      <ToastHost toasts={toasts} onClose={tutup} />

      <ConfirmDialog
        buka={Boolean(hapus)}
        ikon="🗑️"
        judul="Hapus catatan ini?"
        deskripsi={
          <>
            Catatan <b>{hapus?.label}</b> akan dihapus dari laporan. Data tidak bisa dikembalikan.
          </>
        }
        labelYa="Ya, Hapus"
        jenis="tolak"
        memproses={hapusCatatan.isPending}
        onBatal={() => setHapus(null)}
        onYa={() => hapus && hapusCatatan.mutate(hapus)}
      />
    </>
  )
}
