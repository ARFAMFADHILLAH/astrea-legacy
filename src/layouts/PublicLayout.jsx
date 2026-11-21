import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function PublicLayout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const elemen = document.getElementById(hash.slice(1))
      if (elemen) {
        elemen.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname, hash])

  return (
    <>
      <Header />
      <Outlet />
      <Footer showMap={pathname === '/'} />
    </>
  )
}
