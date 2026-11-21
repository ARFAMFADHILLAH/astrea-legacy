import { useCallback, useEffect, useRef, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const urutan = useRef(0)

  const tutup = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((daftar) =>
      daftar.map((toast) => (toast.id === id ? { ...toast, menutup: true } : toast))
    )
    setTimeout(() => {
      setToasts((daftar) => daftar.filter((toast) => toast.id !== id))
    }, 300)
  }, [])

  const tampil = useCallback(
    (type, title, sub) => {
      urutan.current += 1
      const id = `${Date.now()}-${urutan.current}`
      setToasts((daftar) => [...daftar, { id, type, title, sub }])
      timers.current.set(
        id,
        setTimeout(() => tutup(id), 6000)
      )
    },
    [tutup]
  )

  useEffect(() => {
    const daftarTimer = timers.current
    return () => {
      daftarTimer.forEach((timer) => clearTimeout(timer))
      daftarTimer.clear()
    }
  }, [])

  return { toasts, tampil, tutup }
}

export function ToastHost({ toasts, onClose }) {
  return (
    <div id="toastHost" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }) {
  const barRef = useRef(null)
  const [tampil, setTampil] = useState(false)
  const jenis = toast.type === 'ok' ? 'ok' : 'err'

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTampil(true)
      requestAnimationFrame(() => {
        if (barRef.current) {
          barRef.current.style.transitionDuration = '6000ms'
          barRef.current.style.width = '0%'
        }
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const kelas = [
    'toast-jual',
    `toast-jual-${jenis}`,
    tampil ? 'toast-jual-show' : '',
    toast.menutup ? 'toast-jual-hide' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={kelas}>
      <div className="toast-jual-row">
        <div className="toast-jual-icon">{jenis === 'ok' ? '🎉' : '⚠'}</div>
        <div className="toast-jual-body">
          <div className="toast-jual-title">{toast.title}</div>
          <div className="toast-jual-sub">{toast.sub}</div>
        </div>
        <button
          type="button"
          className="toast-jual-close"
          aria-label="Tutup"
          onClick={() => onClose(toast.id)}
        >
          ✕
        </button>
      </div>
      <div className="toast-jual-progress-track">
        <div className="toast-jual-progress-bar" ref={barRef} />
      </div>
    </div>
  )
}
