import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { FOTO_FALLBACK, fotoUrl } from '../../lib/foto'
import { ekstensiDari, hapusFotoStorage, unggahFoto } from '../../lib/upload'

const BANNER_DEFAULT = 'astrea.jpeg'

async function ambilBanner() {
  const { data, error } = await supabase
    .from('pengaturan')
    .select('foto_banner')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return data?.foto_banner ?? null
}

export default function BannerTab() {
  const queryClient = useQueryClient()
  const inputRef = useRef(null)
  const [pesan, setPesan] = useState('')

  const { data: banner, isLoading } = useQuery({
    queryKey: ['pengaturan', 'banner'],
    queryFn: ambilBanner,
  })

  const gantiBanner = useMutation({
    mutationFn: async (file) => {
      const pathBaru = await unggahFoto('motor', file, 'banner')

      const { error } = await supabase
        .from('pengaturan')
        .update({ foto_banner: pathBaru })
        .eq('id', 1)
      if (error) throw error

      // File lama dihapus setelah database sukses di-update.
      if (banner && banner !== BANNER_DEFAULT) await hapusFotoStorage([banner])
      return pathBaru
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      setPesan('sukses')
      if (inputRef.current) inputRef.current.value = ''
    },
    onError: () => {
      setPesan('gagal')
    },
  })

  function pilihFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const ekstensi = ekstensiDari(file.name)
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ekstensi)) {
      setPesan('format_salah')
      event.target.value = ''
      return
    }

    setPesan('')
    gantiBanner.mutate(file)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>🖼️ Ganti Foto Banner</h2>
          <p>Foto ini tampil sebagai background utama di halaman beranda</p>
        </div>
      </div>

      <div className="form-wrap">
        {pesan === 'sukses' ? (
          <div className="alert-success">
            Banner berhasil diubah!{' '}
            <Link to="/" target="_blank" rel="noopener noreferrer" className="link-green">
              Lihat hasil
            </Link>
          </div>
        ) : pesan !== '' ? (
          <div className="alert-error">
            Gagal upload. Pastikan format foto JPG/PNG/WEBP dan coba lagi.
          </div>
        ) : null}

        <div className="banner-preview-wrap">
          <div className="banner-label">Banner Sekarang</div>
          {isLoading ? (
            <div className="banner-img" />
          ) : (
            <img
              src={fotoUrl(banner, FOTO_FALLBACK)}
              className="banner-img"
              alt="Banner saat ini"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = FOTO_FALLBACK
              }}
            />
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            const file = inputRef.current?.files?.[0]
            if (!file) return
            gantiBanner.mutate(file)
          }}
        >
          <div className="form-row form-row-single">
            <div className="form-group">
              <label htmlFor="foto-banner">Upload Foto Banner Baru</label>
              <input
                id="foto-banner"
                ref={inputRef}
                type="file"
                name="foto_banner"
                accept="image/jpeg,image/png,image/webp"
                required
                className="file-input"
                onChange={pilihFile}
              />
              <small className="file-hint">
                Format: JPG, PNG, WEBP. Ukuran ideal: landscape/horizontal (misal 1920x600 px)
              </small>
            </div>
          </div>
          <button type="submit" className="btn-green btn-banner" disabled={gantiBanner.isPending}>
            {gantiBanner.isPending ? 'Mengunggah…' : 'Upload & Ganti Banner'}
          </button>
        </form>
      </div>
    </div>
  )
}
