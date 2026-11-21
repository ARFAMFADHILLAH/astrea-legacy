import { useEffect } from 'react'

// Modal konfirmasi generik — memakai kelas yang sama dengan modal di dashboard lama.
// Aksi destruktif (hapus) dikirim lewat mutation, bukan tautan GET.
export default function ConfirmDialog({
  buka,
  ikon = '❓',
  judul = 'Yakin?',
  deskripsi,
  labelYa = 'Ya, Lanjutkan',
  jenis = 'setujui',
  wa,
  waLabel = '💬 Chat Dulu ke Customer via WhatsApp',
  onBatal,
  onYa,
  memproses = false,
}) {
  useEffect(() => {
    if (!buka) return undefined

    function tombolEscape(event) {
      if (event.key === 'Escape') onBatal?.()
    }

    window.addEventListener('keydown', tombolEscape)
    return () => window.removeEventListener('keydown', tombolEscape)
  }, [buka, onBatal])

  if (!buka) return null

  const kelasYa = jenis === 'tolak' ? 'pj-btn pj-btn-tolak' : 'pj-btn pj-btn-setujui'

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onBatal?.()
      }}
    >
      <div className="modal-box modal-box-konfirmasi" role="dialog" aria-modal="true">
        <button type="button" onClick={onBatal} className="modal-close">
          ✕
        </button>
        <div className="konfirmasi-icon">{ikon}</div>
        <div className="konfirmasi-judul">{judul}</div>
        <div className="konfirmasi-desc">{deskripsi}</div>

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="konfirmasi-wa-btn"
            style={{ display: 'block' }}
          >
            {waLabel}
          </a>
        ) : null}

        <div className="konfirmasi-btn-row">
          <button type="button" onClick={onBatal} className="pj-btn pj-btn-batal">
            Batal
          </button>
          <button type="button" onClick={onYa} className={kelasYa} disabled={memproses}>
            {memproses ? 'Memproses...' : labelYa}
          </button>
        </div>
      </div>
    </div>
  )
}
