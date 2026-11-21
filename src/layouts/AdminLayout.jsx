import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { supabase } from '../lib/supabase'
import { fotoUrl } from '../lib/foto'
import { MENU_ADMIN, URUTAN_MENU_ADMIN } from '../lib/adminMenu'
import { URL_PUBLIK } from '../lib/mode'
import PengajuanRealtime from '../components/PengajuanRealtime'

function kelasNav(aktif) {
  return aktif ? 'nav-item active' : 'nav-item'
}

async function hitungPengajuanPending() {
  const { count, error } = await supabase
    .from('pengajuan_jual')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  return count ?? 0
}

export default function AdminLayout() {
  const { profile, user, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const menu = searchParams.get('menu') || 'produk'
  const diDashboard = location.pathname === '/admin'
  const menuAktif = diDashboard ? menu : null

  const [sidebarBuka, setSidebarBuka] = useState(false)

  // Tutup drawer setiap pindah halaman.
  useEffect(() => {
    setSidebarBuka(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!sidebarBuka) return undefined

    function tekanEsc(event) {
      if (event.key === 'Escape') setSidebarBuka(false)
    }

    document.addEventListener('keydown', tekanEsc)
    return () => document.removeEventListener('keydown', tekanEsc)
  }, [sidebarBuka])

  const { data: pengajuanPending = 0 } = useQuery({
    queryKey: ['pengajuan', 'pending-count'],
    queryFn: hitungPengajuanPending,
    enabled: isAdmin,
  })

  useEffect(() => {
    document.body.classList.add('admin-page')
    return () => document.body.classList.remove('admin-page')
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname, location.search])

  let judul = 'Admin Dashboard'
  let sub = ''

  if (diDashboard) {
    const item = MENU_ADMIN[menu] ?? MENU_ADMIN.produk
    judul = item.judul
    sub = item.sub
  } else if (location.pathname === '/admin/produk/baru') {
    judul = 'Tambah Motor'
    sub = 'Tambahkan unit baru ke katalog'
  } else if (location.pathname.startsWith('/admin/produk/')) {
    judul = 'Edit Motor'
    sub = 'Perbarui data dan foto motor'
  } else if (location.pathname === '/admin/laporan') {
    judul = 'Laporan Kas & Stok'
    sub = 'Rekap pemasukan, pengeluaran, dan pergerakan stok'
  } else if (location.pathname === '/admin/user') {
    judul = 'Kelola User'
    sub = 'Atur akses admin dan user'
  }

  useDocumentTitle(
    `${pengajuanPending > 0 ? `(${pengajuanPending}) ` : ''}${
      diDashboard ? 'Admin Dashboard' : judul
    } – Astrea Legacy`
  )

  const nama = profile?.username || user?.email?.split('@')[0] || 'Admin'
  const labelRole = isAdmin ? 'Administrator' : profile?.role ? profile.role[0].toUpperCase() + profile.role.slice(1) : 'User'
  const avatar = profile?.foto_profil ? fotoUrl(profile.foto_profil, null) : null

  const produkAktif =
    location.pathname === '/admin/produk/baru' ||
    /^\/admin\/produk\/\d+$/.test(location.pathname) ||
    menuAktif === 'produk'

  async function keluar() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <div id="sidebar-admin" className={sidebarBuka ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="brand-name">🏍️ ASTREA LEGACY</div>
          <div className="brand-sub">Admin Dashboard</div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-label">Menu Utama</div>
          <Link to="/admin?menu=produk" className={kelasNav(produkAktif)}>
            <span className="nav-icon">🏍️</span> Kelola Produk
          </Link>
          <Link to="/admin?menu=stok" className={kelasNav(menuAktif === 'stok')}>
            <span className="nav-icon">📦</span> Stok Astrea
          </Link>
          <Link to="/admin?menu=data-user" className={kelasNav(menuAktif === 'data-user')}>
            <span className="nav-icon">🧾</span> Data User
          </Link>
          <Link to="/admin?menu=pengeluaran" className={kelasNav(menuAktif === 'pengeluaran')}>
            <span className="nav-icon">💸</span> Pengeluaran
          </Link>
          <Link to="/admin?menu=banner" className={kelasNav(menuAktif === 'banner')}>
            <span className="nav-icon">🖼️</span> Ganti Banner
          </Link>
          <Link to="/admin?menu=pengajuan" className={kelasNav(menuAktif === 'pengajuan')}>
            <span className="nav-icon">📋</span> Pengajuan Jual
            {pengajuanPending > 0 && <span className="nav-pending-badge">{pengajuanPending}</span>}
          </Link>

          <div className="nav-label nav-label-section">Lainnya</div>
          <Link to="/admin?menu=profil" className={kelasNav(menuAktif === 'profil')}>
            <span className="nav-icon">👤</span> Profil Saya
          </Link>
          <NavLink to="/admin/user" className={kelasNav(location.pathname === '/admin/user')}>
            <span className="nav-icon">👥</span> Kelola User
          </NavLink>
          <NavLink to="/admin/laporan" className={kelasNav(location.pathname === '/admin/laporan')}>
            <span className="nav-icon">📊</span> Laporan Kas &amp; Stok
          </NavLink>
          <a href={URL_PUBLIK || '/'} className="nav-item" target="_blank" rel="noopener">
            <span className="nav-icon">🌐</span> Lihat Toko
          </a>
        </div>
        <div className="sidebar-footer">
          <button type="button" className="btn-logout" onClick={keluar}>
            <span>🚪</span> Keluar
          </button>
        </div>
      </div>

      {sidebarBuka ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Tutup menu admin"
          onClick={() => setSidebarBuka(false)}
        />
      ) : null}

      <div className="main">
        <div className="topbar">
          <div className="topbar-kiri">
            <button
              type="button"
              className="menu-toggle"
              aria-label={sidebarBuka ? 'Tutup menu admin' : 'Buka menu admin'}
              aria-expanded={sidebarBuka}
              aria-controls="sidebar-admin"
              onClick={() => setSidebarBuka((buka) => !buka)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <div className="topbar-judul">
              <div className="page-title">{judul}</div>
              <div className="page-sub">{sub}</div>
            </div>
          </div>
          <Link to="/admin?menu=profil" className="admin-info">
            <div>
              <div className="admin-name">{nama}</div>
              <div className="admin-role">{labelRole}</div>
            </div>
            <div className="admin-avatar">
              {avatar ? <img src={avatar} alt="Foto profil" /> : nama.charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>

      <PengajuanRealtime aktif={isAdmin} />
    </>
  )
}
