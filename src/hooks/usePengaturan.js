import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Nilai default = isi seed.sql, dipakai saat .env belum diisi / query gagal.
export const PENGATURAN_DEFAULT = {
  id: 1,
  foto_banner: null,
  wa_admin: '62895321022558',
  alamat:
    'Kp. Warung Jengkol No. 29, RT 002/RW 013, Penggangsaan Dua, Kelapa Gading, Kota Administrasi Jakarta Utara, DKI Jakarta',
  lat: null,
  lng: null,
  facebook: 'https://www.facebook.com/aditiya.dwi.658673',
  tiktok: 'https://www.tiktok.com/@astrea.kuyy',
}

async function ambilPengaturan() {
  const { data, error } = await supabase
    .from('pengaturan')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return data ?? PENGATURAN_DEFAULT
}

export function usePengaturan() {
  const query = useQuery({
    queryKey: ['pengaturan'],
    queryFn: ambilPengaturan,
    staleTime: 5 * 60 * 1000,
  })

  return {
    pengaturan: { ...PENGATURAN_DEFAULT, ...(query.data ?? {}) },
    isLoading: query.isLoading,
    error: query.error,
  }
}
