import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import RequireAdmin from './components/RequireAdmin'
import Beranda from './pages/Beranda'
import DetailMotor from './pages/DetailMotor'
import JualMotor from './pages/JualMotor'
import PengajuanDetail from './pages/PengajuanDetail'
import NotFound from './pages/NotFound'
import LoginAdmin from './pages/LoginAdmin'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProdukBaru from './pages/admin/ProdukBaru'
import ProdukEdit from './pages/admin/ProdukEdit'
import Laporan from './pages/admin/Laporan'
import KelolaUser from './pages/admin/KelolaUser'
import { hanyaPanel, modePanel } from './lib/mode'
import { useAuth } from './hooks/useAuth'

// Rute panel dipakai di dua tempat: build admin dan mode dev.
const rutePanel = (
  <Route path="admin" element={<RequireAdmin />}>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="produk/baru" element={<ProdukBaru />} />
      <Route path="produk/:id" element={<ProdukEdit />} />
      <Route path="laporan" element={<Laporan />} />
      <Route path="user" element={<KelolaUser />} />
    </Route>
  </Route>
)

// Origin panel: kalau sudah punya sesi admin langsung ke dashboard, kalau belum
// berhenti di form login.
function GerbangPanel() {
  const { loading, isAdmin } = useAuth()

  if (loading) return <div className="app-loading app-loading--full">Memuat…</div>
  if (isAdmin) return <Navigate to="/admin" replace />
  return <LoginAdmin />
}

function AplikasiPanel() {
  return (
    <Routes>
      <Route index element={<GerbangPanel />} />
      {rutePanel}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AplikasiToko() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Beranda />} />
        <Route path="motor/:id" element={<DetailMotor />} />
        <Route path="jual" element={<JualMotor />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="pengajuan/:id" element={<PengajuanDetail />} />

      {modePanel ? rutePanel : null}
    </Routes>
  )
}

export default function App() {
  return hanyaPanel ? <AplikasiPanel /> : <AplikasiToko />
}
