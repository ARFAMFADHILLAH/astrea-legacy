import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

const KOLOM_PROFIL = 'id, username, role, foto_profil'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let berjalan = true

    supabase.auth.getSession().then(({ data }) => {
      if (!berjalan) return
      const sesi = data.session ?? null
      setSession(sesi)
      if (!sesi) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, sesiBaru) => {
      setSession(sesiBaru ?? null)

      if (!sesiBaru?.user) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Token refresh tidak perlu memuat ulang profil, cukup saat login baru.
      if (event === 'SIGNED_IN') setLoading(true)
    })

    return () => {
      berjalan = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return undefined

    let berjalan = true
    setLoading(true)

    supabase
      .from('profiles')
      .select(KOLOM_PROFIL)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!berjalan) return
        if (error) console.error('[Astrea] Gagal mengambil profil:', error.message)

        // Hanya admin yang boleh punya sesi. Kalau ada sesi lama milik akun
        // non-admin, langsung diakhiri di sini juga.
        if (!error && data && data.role !== 'admin') {
          setProfile(null)
          setLoading(false)
          supabase.auth.signOut()
          return
        }

        setProfile(error ? null : data ?? null)
        setLoading(false)
      })

    return () => {
      berjalan = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(KOLOM_PROFIL)
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[Astrea] Gagal mengambil profil:', error.message)
      return null
    }

    setProfile(data ?? null)
    return data ?? null
  }, [userId])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[Astrea] Gagal logout dari server:', error?.message)
    }
    setSession(null)
    setProfile(null)
    setLoading(false)
  }, [])

  const nilai = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      isAdmin: profile?.role === 'admin',
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}
