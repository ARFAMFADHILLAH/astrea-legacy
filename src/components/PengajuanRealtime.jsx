import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Bunyi notifikasi 2 nada pendek — sama seperti admin_dashboard.php, tanpa file suara.
function bunyiNotifikasi() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    ;[880, 1180].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)

      const start = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)
      osc.start(start)
      osc.stop(start + 0.24)
    })
  } catch {
    // Browser tidak mendukung / autoplay diblokir — abaikan.
  }
}

// Notifikasi realtime pengajuan jual baru. Menggantikan polling pengajuan_terbaru.php.
export default function PengajuanRealtime({ aktif }) {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    if (!aktif) return undefined

    const channel = supabase
      .channel('pengajuan-jual-baru')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pengajuan_jual' },
        (payload) => {
          const data = payload.new ?? {}
          setToast({
            id: `${Date.now()}-${data.id ?? 'baru'}`,
            nama: data.nama_penjual,
            motor: data.nama_motor,
          })
          bunyiNotifikasi()
          queryClient.invalidateQueries({ queryKey: ['pengajuan'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [aktif, queryClient])

  useEffect(() => {
    if (!toast) return undefined
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 8000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [toast])

  if (!toast) return null

  const deskripsi =
    toast.nama && toast.motor
      ? `${toast.nama} mengajukan ${toast.motor}`
      : 'Ada pengajuan jual motor baru masuk.'

  return (
    <div key={toast.id} className="toast-pengajuan toast-anim" style={{ display: 'flex' }} role="status">
      <div className="toast-icon">🔔</div>
      <div className="toast-body">
        <div className="toast-title">Pengajuan Baru Masuk!</div>
        <div className="toast-desc">{deskripsi}</div>
      </div>
      <Link
        to="/admin?menu=pengajuan&status=pending"
        className="toast-link"
        onClick={() => setToast(null)}
      >
        Lihat
      </Link>
      <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Tutup">
        ✕
      </button>
    </div>
  )
}
