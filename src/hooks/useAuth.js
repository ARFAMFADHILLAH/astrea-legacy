import { useContext } from 'react'
import { AuthContext } from '../context/AuthProvider'

export function useAuth() {
  const konteks = useContext(AuthContext)
  if (!konteks) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.')
  }
  return konteks
}
