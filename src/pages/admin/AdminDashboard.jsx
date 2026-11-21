import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import StatCards from '../../components/StatCards'
import ProdukTab from '../../components/admin/ProdukTab'
import StokTab from '../../components/admin/StokTab'
import DataUserTab from '../../components/admin/DataUserTab'
import PengeluaranTab from '../../components/admin/PengeluaranTab'
import BannerTab from '../../components/admin/BannerTab'
import PengajuanTab from '../../components/admin/PengajuanTab'
import ProfilTab from '../../components/admin/ProfilTab'
import { useStatistik } from '../../hooks/useAdminData'
import { MENU_ADMIN } from '../../lib/adminMenu'

const ISI_MENU = {
  produk: ProdukTab,
  stok: StokTab,
  'data-user': DataUserTab,
  pengeluaran: PengeluaranTab,
  banner: BannerTab,
  pengajuan: PengajuanTab,
  profil: ProfilTab,
}

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const menuDiminta = searchParams.get('menu') || 'produk'
  const menu = MENU_ADMIN[menuDiminta] ? menuDiminta : 'produk'
  const Tab = ISI_MENU[menu]
  const { data: statistik } = useStatistik()

  const [flash, setFlash] = useState(location.state?.flash ?? '')

  // Pesan sekali pakai dari halaman lain (mis. setelah edit produk).
  useEffect(() => {
    if (!location.state?.flash) return
    setFlash(location.state.flash)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (!flash) return undefined
    const timer = setTimeout(() => setFlash(''), 5000)
    return () => clearTimeout(timer)
  }, [flash])

  return (
    <>
      {flash ? <div className="alert-success">{flash}</div> : null}

      {menu !== 'profil' ? <StatCards statistik={statistik} /> : null}

      <Tab />
    </>
  )
}
