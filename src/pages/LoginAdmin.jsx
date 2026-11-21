import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Situs admin punya origin sendiri, jadi login tampil sebagai halaman penuh.
// Tidak ada tombol login di situs toko dan tidak ada tautan tersembunyi:
// membuka origin panel tanpa sesi langsung berhenti di form ini.
export default function LoginAdmin() {
  const navigate = useNavigate()
  const inputEmail = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mengirim, setMengirim] = useState(false)

  useEffect(() => {
    inputEmail.current?.focus()
  }, [])

  async function masuk(event) {
    event.preventDefault()
    if (mengirim) return

    setError('')
    setMengirim(true)

    try {
      const { data, error: errorMasuk } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (errorMasuk) {
        const pesan = String(errorMasuk.message || '')
        setPassword('')

        // Jangan membedakan "email tidak terdaftar" dan "email belum
        // diverifikasi" supaya pesan login tidak bisa dipakai menebak akun.
        if (/rate limit|too many/i.test(pesan)) {
          setError('Terlalu banyak percobaan. Coba lagi beberapa saat.')
        } else if (/invalid login credentials/i.test(pesan)) {
          setError('Email atau password salah. Coba lagi.')
        } else {
          setError('Login gagal. Email atau password salah.')
        }
        return
      }

      // Hanya akun ber-role admin yang boleh masuk. Selain itu sesi langsung
      // dihapus supaya tidak ada akun lain yang punya sesi di origin panel.
      const { data: profil, error: errorProfil } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data?.user?.id)
        .maybeSingle()

      if (errorProfil) {
        await supabase.auth.signOut()
        setPassword('')
        setError('Gagal memeriksa hak akses. Coba lagi.')
        return
      }

      if (profil?.role !== 'admin') {
        // JANGAN signOut() di sini — kalau signOut, AuthProvider hapus sesi,
        // RequireAdmin render LoginAdmin baru, dan error hilang.
        // Cukup tampilkan error; RLS tetap blokir akses data.
        setPassword('')
        setError('Akun ini bukan admin. Panel hanya bisa dibuka oleh admin toko.')
        return
      }

      setEmail('')
      setPassword('')
      navigate('/admin', { replace: true })
    } finally {
      setMengirim(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">🏍️ ASTREA LEGACY</div>
        <div className="form-title">Login Admin 🔒</div>
        <div className="form-sub">Khusus admin toko. Pengunjung tidak perlu akun.</div>

        {error ? <div className="login-modal-error">❌ {error}</div> : null}

        <form onSubmit={masuk}>
          <div className="input-group">
            <label htmlFor="login-admin-email">Email</label>
            <input
              id="login-admin-email"
              type="email"
              name="email"
              placeholder="Masukkan email admin"
              autoComplete="email"
              required
              ref={inputEmail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-admin-password">Password</label>
            <input
              id="login-admin-password"
              type="password"
              name="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn-masuk" disabled={mengirim}>
            {mengirim ? 'MEMPROSES…' : 'MASUK KE DASHBOARD →'}
          </button>
        </form>
      </div>
    </div>
  )
}
