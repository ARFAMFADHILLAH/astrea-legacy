import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fotoUrl } from '../lib/foto'
import { formatRupiah, tanggalJam } from '../lib/format'
import { waUrl } from '../lib/wa'

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const LABEL_STATUS = {
  pending: 'Pending',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export default function PengajuanDetail() {
  const { id } = useParams()
  const idValid = POLA_UUID.test(String(id ?? ''))

  const { data, isLoading } = useQuery({
    queryKey: ['pengajuan-publik', id],
    enabled: idValid,
    queryFn: async () => {
      const { data: hasil, error } = await supabase.rpc('get_pengajuan_publik', { p_id: id })
      if (error) throw error
      return hasil?.[0] ?? null
    },
  })

  useDocumentTitle(data ? `Detail Pengajuan - ${data.nama_motor}` : 'Detail Pengajuan')

  const foto = (Array.isArray(data?.foto) ? data.foto : [])
    .map((path) => String(path ?? '').trim())
    .filter(Boolean)

  const pesanWa = data
    ? `Halo ${data.nama_penjual}, saya admin Astrea Kuyy. Saya sudah lihat detail motor ${data.nama_motor} kamu. Boleh kita diskusi?`
    : ''

  return (
    <div className="pd-body">
      <div className="pd-card">
        {isLoading ? (
          <div className="app-loading">Memuat data pengajuan…</div>
        ) : !data ? (
          <p>Data tidak ditemukan.</p>
        ) : (
          <>
            <div className="pd-header">
              <div className={`badge badge-${data.status}`}>
                {LABEL_STATUS[data.status] ?? data.status}
              </div>
              <h1>
                {data.nama_motor} ({data.tahun})
              </h1>
              <p>
                Diajukan oleh {data.nama_penjual} · {tanggalJam(data.created_at)}
              </p>
            </div>

            <div className="pd-info-grid">
              <div className="pd-info-item">
                <div className="pd-lbl">Nama Penjual</div>
                <div className="pd-val">{data.nama_penjual}</div>
              </div>
              <div className="pd-info-item">
                <div className="pd-lbl">No. WhatsApp</div>
                <div className="pd-val">{data.wa_penjual}</div>
              </div>
              {data.kondisi ? (
                <div className="pd-info-item">
                  <div className="pd-lbl">Kondisi Motor</div>
                  <div className="pd-val">{data.kondisi}</div>
                </div>
              ) : null}
              {Number(data.harga_harapan) > 0 ? (
                <div className="pd-info-item">
                  <div className="pd-lbl">Harga Harapan</div>
                  <div className="pd-val">{formatRupiah(data.harga_harapan)}</div>
                </div>
              ) : null}
            </div>

            {data.keterangan ? <div className="pd-keterangan">"{data.keterangan}"</div> : null}

            <div className="pd-foto-label">Foto Motor ({foto.length})</div>
            {foto.length > 0 ? (
              <div className="pd-foto-grid">
                {foto.map((path, indeks) => (
                  <img
                    key={`${path}-${indeks}`}
                    src={fotoUrl(path)}
                    alt={`Foto motor ${indeks + 1}`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="pd-empty-foto">Belum ada foto</div>
            )}

            <a
              href={waUrl(data.wa_penjual, pesanWa)}
              target="_blank"
              rel="noopener"
              className="pd-wa-link"
            >
              Hubungi Penjual via WhatsApp
            </a>

            <div className="pd-text-center">
              <Link to="/admin" className="pd-back-link">
                Kembali ke Dashboard
              </Link>
            </div>
            <div className="pd-note">
              Halaman ini bisa kamu bagikan ke pelanggan biar mereka lihat fotonya
            </div>
          </>
        )}
      </div>
    </div>
  )
}
