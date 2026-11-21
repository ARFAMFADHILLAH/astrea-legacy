import { supabase } from './supabase'

export const FOTO_FALLBACK = '/astrea.jpeg'

// Foto disimpan sebagai path "bucket/namafile" (mis. "motor/abc.jpeg").
// Dukung juga URL penuh agar data lama yang sudah berupa URL tetap tampil.
export function fotoUrl(path, fallback = FOTO_FALLBACK) {
  const nilai = String(path ?? '').trim()
  if (!nilai) return fallback
  if (/^https?:\/\//i.test(nilai)) return nilai

  const garisMiring = nilai.indexOf('/')
  if (garisMiring < 1) return fallback

  const bucket = nilai.slice(0, garisMiring)
  const nama = nilai.slice(garisMiring + 1)
  if (!nama) return fallback

  const { data } = supabase.storage.from(bucket).getPublicUrl(nama)
  return data?.publicUrl || fallback
}

export function fotoList(daftar, fallback = FOTO_FALLBACK) {
  const isi = Array.isArray(daftar) ? daftar : String(daftar ?? '').split(',')
  const hasil = isi.map((item) => String(item ?? '').trim()).filter(Boolean).map((item) => fotoUrl(item, ''))
  const valid = hasil.filter(Boolean)
  return valid.length ? valid : [fallback]
}
