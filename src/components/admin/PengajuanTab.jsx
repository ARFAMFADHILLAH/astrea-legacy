import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ConfirmDialog from '../ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { fotoUrl } from '../../lib/foto'
import { formatRupiah, tanggalJam } from '../../lib/format'
import { hapusFotoStorage } from '../../lib/upload'
import { pesanHasilAksi, waKonfirmasi, waLink } from '../../lib/pengajuanWa'
import { usePengajuanList } from '../../hooks/useAdminData'

const STATUS = [
  { nilai: 'pending', label: 'Pending' },
  { nilai: 'disetujui', label: 'Disetujui' },
  { nilai: 'ditolak', label: 'Ditolak' },
]

const WARNA_STATUS = { pending: '#f59e0b', disetujui: '#10b981', ditolak: '#ef4444' }
const LABEL_STATUS = { pending: 'Pending', disetujui: 'Disetujui', ditolak: 'Ditolak' }

export default function PengajuanTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const statusParam = searchParams.get('status')
  const status = STATUS.some((item) => item.nilai === statusParam) ? statusParam : 'pending'

  const [detail, setDetail] = useState(null)
  const [konfirmasi, setKonfirmasi] = useState(null)
  const [hasilAksi, setHasilAksi] = useState(null)
  const [hapusBerhasil, setHapusBerhasil] = useState(false)

  const { data: daftar = [], isLoading } = usePengajuanList(status)

  const { data: jumlahPending = 0 } = useQuery({
    queryKey: ['pengajuan', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pengajuan_jual')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (error) throw error
      return count ?? 0
    },
  })

  function segarkan() {
    queryClient.invalidateQueries({ queryKey: ['pengajuan'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
    queryClient.invalidateQueries({ queryKey: ['produk'] })
  }

  const setujui = useMutation({
    mutationFn: async (pengajuan) => {
      const { data, error } = await supabase.rpc('setujui_pengajuan', { p_id: pengajuan.id })
      if (error) throw error
      return Number(data)
    },
    onSuccess: (produkId, pengajuan) => {
      setHasilAksi({ aksi: 'setujui', pengajuan, produkId })
      setHapusBerhasil(false)
      setKonfirmasi(null)
      setDetail(null)
      setSearchParams({ menu: 'pengajuan', status: 'disetujui' })
      segarkan()
    },
  })

  const tolak = useMutation({
    mutationFn: async (pengajuan) => {
      const { error } = await supabase
        .from('pengajuan_jual')
        .update({ status: 'ditolak' })
        .eq('id', pengajuan.id)
      if (error) throw error
    },
    onSuccess: (_, pengajuan) => {
      setHasilAksi({ aksi: 'tolak', pengajuan, produkId: null })
      setHapusBerhasil(false)
      setKonfirmasi(null)
      setDetail(null)
      setSearchParams({ menu: 'pengajuan', status: 'ditolak' })
      segarkan()
    },
  })

  const hapus = useMutation({
    mutationFn: async (pengajuan) => {
      const { error } = await supabase.from('pengajuan_jual').delete().eq('id', pengajuan.id)
      if (error) throw error
      await hapusFotoStorage(pengajuan.foto ?? [])
    },
    onSuccess: () => {
      setKonfirmasi(null)
      setDetail(null)
      setHasilAksi(null)
      setHapusBerhasil(true)
      segarkan()
    },
  })

  const tandai = useMutation({
    mutationFn: async (pengajuan) => {
      const { error } = await supabase
        .from('pengajuan_jual')
        .update({ sudah_dihubungi: true })
        .eq('id', pengajuan.id)
      if (error) throw error
    },
    onMutate: (pengajuan) => {
      queryClient.setQueryData(['pengajuan', 'list', status], (lama) =>
        Array.isArray(lama)
          ? lama.map((item) =>
              item.id === pengajuan.id ? { ...item, sudah_dihubungi: true } : item
            )
          : lama
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan'] })
    },
  })

  const memproses = setujui.isPending || tolak.isPending || hapus.isPending
  const galat =
    setujui.error?.message || tolak.error?.message || hapus.error?.message || tandai.error?.message

  function pilihStatus(nilai) {
    setHasilAksi(null)
    setHapusBerhasil(false)
    setSearchParams({ menu: 'pengajuan', status: nilai })
  }

  return (
    <>
      {hasilAksi && (
        <div
          className={`pj-alert-aksi ${
            hasilAksi.aksi === 'setujui' ? 'pj-alert-aksi-setujui' : 'pj-alert-aksi-tolak'
          }`}
        >
          <div className="pj-alert-aksi-icon">{hasilAksi.aksi === 'setujui' ? '✅' : '🚫'}</div>
          <div className="pj-alert-aksi-body">
            <div className="pj-alert-aksi-title">
              {hasilAksi.aksi === 'setujui'
                ? 'Pengajuan disetujui & masuk katalog Index!'
                : 'Pengajuan ditolak.'}
            </div>
            <div className="pj-alert-aksi-desc">
              Motor <b>{hasilAksi.pengajuan.nama_motor}</b> dari{' '}
              <b>{hasilAksi.pengajuan.nama_penjual}</b>. Kapan pun kamu siap, kirim kabar ke
              customer-nya lewat WhatsApp.
            </div>
          </div>
          <div className="pj-alert-aksi-actions">
            <a
              href={waLink(
                hasilAksi.pengajuan.wa_penjual,
                pesanHasilAksi(hasilAksi.aksi, hasilAksi.pengajuan, hasilAksi.produkId)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="pj-btn-wa-alert"
            >
              💬 Kirim WA ke Customer
            </a>
            {hasilAksi.produkId ? (
              <Link
                to={`/motor/${hasilAksi.produkId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pj-btn-lihat-alert"
              >
                Lihat di Index
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {hapusBerhasil && <div className="pj-alert pj-alert-hapus">Pengajuan berhasil dihapus.</div>}

      {galat && <div className="pj-alert pj-alert-hapus">⚠️ {galat}</div>}

      <div className="pj-filter-wrap">
        {STATUS.map((item) => (
          <button
            key={item.nilai}
            type="button"
            onClick={() => pilihStatus(item.nilai)}
            className={`pj-filter-btn ${
              status === item.nilai ? 'pj-filter-active' : 'pj-filter-inactive'
            }`}
          >
            {item.label}
            {item.nilai === 'pending' && jumlahPending > 0 ? (
              <span className="pj-filter-count">{jumlahPending}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="pj-empty">Memuat pengajuan…</div>
      ) : daftar.length === 0 ? (
        <div className="pj-empty">
          <div className="pj-empty-icon">📭</div>
          <p>Belum ada pengajuan dengan status "{status}".</p>
        </div>
      ) : (
        <div className="pj-list">
          {daftar.map((pengajuan) => {
            const fotoPertama = Array.isArray(pengajuan.foto) ? pengajuan.foto[0] : ''
            const thumb = fotoUrl(fotoPertama, '')

            return (
              <div className="pj-card" key={pengajuan.id}>
                {thumb ? (
                  <img
                    src={thumb}
                    alt={pengajuan.nama_motor}
                    className="pj-card-thumb"
                    onClick={() => setDetail(pengajuan)}
                  />
                ) : (
                  <div className="pj-card-thumb-empty" onClick={() => setDetail(pengajuan)} />
                )}

                <div className="pj-card-body">
                  <div className="pj-card-title">
                    {pengajuan.nama_motor} ({pengajuan.tahun})
                  </div>
                  <div className="pj-card-meta">
                    {pengajuan.nama_penjual} &nbsp;|&nbsp; {pengajuan.wa_penjual} &nbsp;|&nbsp;{' '}
                    {tanggalJam(pengajuan.created_at)}
                  </div>
                  {pengajuan.kondisi ? (
                    <div className="pj-card-line">
                      <strong>Kondisi:</strong> {pengajuan.kondisi}
                    </div>
                  ) : null}
                  {pengajuan.harga_harapan > 0 ? (
                    <div className="pj-card-line">
                      <strong>Harga Harapan:</strong> {formatRupiah(pengajuan.harga_harapan)}
                    </div>
                  ) : null}
                  {pengajuan.keterangan ? (
                    <div className="pj-card-line-icon">"{pengajuan.keterangan}"</div>
                  ) : null}
                </div>

                <div className="pj-actions">
                  <div className="pj-action-row">
                    <button
                      type="button"
                      onClick={() => setDetail(pengajuan)}
                      className="pj-btn pj-btn-detail"
                    >
                      Detail
                    </button>
                    <a
                      href={waKonfirmasi(pengajuan)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pj-btn pj-btn-wa"
                      onClick={() => tandai.mutate(pengajuan)}
                    >
                      🤝 Konfirmasi ke Customer
                    </a>
                  </div>

                  {pengajuan.sudah_dihubungi ? (
                    <div className="pj-konfirmasi-badge">✅ Sudah dihubungi customer</div>
                  ) : (
                    <div className="pj-konfirmasi-badge pj-konfirmasi-badge-belum">
                      Belum dihubungi — chat dulu ya sebelum Setujui/Tolak
                    </div>
                  )}

                  {pengajuan.status === 'pending' ? (
                    <div className="pj-action-row">
                      <button
                        type="button"
                        className="pj-btn pj-btn-setujui"
                        onClick={() => setKonfirmasi({ aksi: 'setujui', pengajuan })}
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        className="pj-btn pj-btn-tolak"
                        onClick={() => setKonfirmasi({ aksi: 'tolak', pengajuan })}
                      >
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`pj-status-badge ${
                          pengajuan.status === 'disetujui' ? 'pj-status-terima' : 'pj-status-tolak'
                        }`}
                      >
                        {pengajuan.status === 'disetujui' ? 'Disetujui' : 'Ditolak'}
                      </div>
                      {pengajuan.status === 'disetujui' && pengajuan.produk_id ? (
                        <Link
                          to={`/motor/${pengajuan.produk_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pj-btn pj-btn-detail"
                          style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                          Lihat Produk
                        </Link>
                      ) : null}
                    </>
                  )}

                  <button
                    type="button"
                    className="pj-btn-hapus"
                    onClick={() => setKonfirmasi({ aksi: 'hapus', pengajuan })}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detail && (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetail(null)
          }}
        >
          <div className="modal-box">
            <button type="button" onClick={() => setDetail(null)} className="modal-close">
              ✕
            </button>

            <div className="modal-header-wrap" style={{ marginBottom: 16 }}>
              <span
                className="modal-status-badge"
                style={{
                  background: `${WARNA_STATUS[detail.status]}22`,
                  color: WARNA_STATUS[detail.status],
                }}
              >
                {LABEL_STATUS[detail.status]}
              </span>
              <span className="modal-date-badge">{tanggalJam(detail.created_at)}</span>
            </div>

            <h2>
              {detail.nama_motor} ({detail.tahun})
            </h2>

            <div className="modal-info-grid">
              <div className="modal-info-cell">
                <div className="modal-info-label">Nama Penjual</div>
                <div className="modal-info-value">{detail.nama_penjual}</div>
              </div>
              <div className="modal-info-cell">
                <div className="modal-info-label">No. WhatsApp</div>
                <div className="modal-info-value">{detail.wa_penjual}</div>
              </div>
              {detail.kondisi ? (
                <div className="modal-info-cell">
                  <div className="modal-info-label">Kondisi Motor</div>
                  <div className="modal-info-value">{detail.kondisi}</div>
                </div>
              ) : null}
              {detail.harga_harapan > 0 ? (
                <div className="modal-info-cell">
                  <div className="modal-info-label">Harga Harapan</div>
                  <div className="modal-info-value" style={{ color: '#10b981' }}>
                    {formatRupiah(detail.harga_harapan)}
                  </div>
                </div>
              ) : null}
            </div>

            {detail.keterangan ? (
              <div className="modal-keterangan-wrap">
                <div className="modal-keterangan-label">Keterangan</div>
                <div className="modal-keterangan-text">"{detail.keterangan}"</div>
              </div>
            ) : null}

            <div className="modal-foto-wrap">
              <div className="modal-foto-label">
                Foto Motor ({Array.isArray(detail.foto) ? detail.foto.length : 0})
              </div>
              {Array.isArray(detail.foto) && detail.foto.length > 0 ? (
                <div className="modal-foto-grid">
                  {detail.foto.map((path) => {
                    const src = fotoUrl(path, '')
                    if (!src) return null
                    return (
                      <img
                        key={path}
                        src={src}
                        alt={detail.nama_motor}
                        className="modal-foto-item"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="modal-foto-empty" />
              )}
            </div>

            <div className="modal-actions">
              <a
                href={waKonfirmasi(detail)}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-btn-wa"
                onClick={() => tandai.mutate(detail)}
              >
                Hubungi via WhatsApp
              </a>
              {detail.status === 'disetujui' && detail.produk_id ? (
                <Link
                  to={`/motor/${detail.produk_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-btn-tutup"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Lihat Produk
                </Link>
              ) : null}
              <button type="button" onClick={() => setDetail(null)} className="modal-btn-tutup">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        buka={Boolean(konfirmasi)}
        ikon={
          konfirmasi?.aksi === 'hapus' ? '🗑️' : konfirmasi?.aksi === 'setujui' ? '✅' : '🚫'
        }
        judul={
          konfirmasi?.aksi === 'hapus'
            ? 'Hapus pengajuan ini?'
            : konfirmasi?.aksi === 'setujui'
              ? 'Setujui Pengajuan Ini?'
              : 'Tolak Pengajuan Ini?'
        }
        deskripsi={
          konfirmasi?.aksi === 'hapus' ? (
            'Data tidak bisa dikembalikan.'
          ) : konfirmasi?.aksi === 'setujui' ? (
            <>
              Motor <b>{konfirmasi?.pengajuan.nama_motor}</b> dari{' '}
              <b>{konfirmasi?.pengajuan.nama_penjual}</b> akan otomatis masuk ke katalog Index
              toko. Belum yakin? Chat dulu ke customer sebelum konfirmasi final.
            </>
          ) : (
            <>
              Pengajuan motor <b>{konfirmasi?.pengajuan.nama_motor}</b> dari{' '}
              <b>{konfirmasi?.pengajuan.nama_penjual}</b> akan ditolak. Belum yakin? Chat dulu ke
              customer sebelum konfirmasi final.
            </>
          )
        }
        labelYa={
          konfirmasi?.aksi === 'hapus'
            ? 'Ya, Hapus'
            : konfirmasi?.aksi === 'setujui'
              ? 'Ya, Setujui'
              : 'Ya, Tolak'
        }
        jenis={konfirmasi?.aksi === 'setujui' ? 'setujui' : 'tolak'}
        wa={
          konfirmasi && konfirmasi.aksi !== 'hapus'
            ? waKonfirmasi(konfirmasi.pengajuan)
            : undefined
        }
        memproses={memproses}
        onBatal={() => setKonfirmasi(null)}
        onYa={() => {
          if (!konfirmasi) return
          if (konfirmasi.aksi === 'setujui') setujui.mutate(konfirmasi.pengajuan)
          else if (konfirmasi.aksi === 'tolak') tolak.mutate(konfirmasi.pengajuan)
          else hapus.mutate(konfirmasi.pengajuan)
        }}
      />
    </>
  )
}
