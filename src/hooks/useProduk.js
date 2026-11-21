import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const KOLOM =
  'id, nama_motor, tahun, harga, deskripsi, foto, foto_pembeli, status, created_at'

export function useProdukKatalog() {
  return useQuery({
    queryKey: ['produk', 'katalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM)
        .order('id', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

export function useProdukDetail(id) {
  const idAngka = Number(id)
  const idValid = Number.isInteger(idAngka) && idAngka > 0

  return useQuery({
    queryKey: ['produk', 'detail', idAngka],
    enabled: idValid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM)
        .eq('id', idAngka)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
  })
}

export function useProdukTerjual(limit = 6) {
  return useQuery({
    queryKey: ['produk', 'terjual', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produk')
        .select(KOLOM)
        .eq('status', 'Terjual')
        .order('id', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data ?? []
    },
  })
}
