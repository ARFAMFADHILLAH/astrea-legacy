import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginAdmin from '../pages/LoginAdmin'

// Tidak ada halaman /login dan tidak ada tombol login. Situs panel berdiri di
// origin sendiri; selama belum ada sesi admin, rute /admin menampilkan form
// login di tempat.
export default function RequireAdmin() {
  const { loading, isAdmin } = useAuth()

  if (loading) {
    return <div className="app-loading app-loading--full">Memuat…</div>
  }

  if (!isAdmin) {
    return <LoginAdmin />
  }

  return <Outlet />
}
