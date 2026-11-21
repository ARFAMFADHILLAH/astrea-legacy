import { supabase } from './supabase'

export const EKSTENSI_GAMBAR = ['jpg', 'jpeg', 'png', 'webp']
export const MAKS_UKURAN_FOTO = 5 * 1024 * 1024

export function ekstensiDari(nama) {
  return (String(nama ?? '').split('.').pop() || '').toLowerCase()
}

export function namaFileUnik(ekstensi) {
  const acak =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${acak}.${ekstensi || 'jpg'}`
}

// Pesan mengikuti helper.php: hanya JPG/JPEG/PNG/WEBP, maksimal 5 MB.
export function pesanValidasiFoto(file, maksMb = 5) {
  if (!file) return 'File foto tidak terbaca.'
  if (!EKSTENSI_GAMBAR.includes(ekstensiDari(file.name))) {
    return 'Format foto harus JPG/PNG/WEBP.'
  }
  if (file.size > maksMb * 1024 * 1024) {
    return `Ukuran foto maksimal ${maksMb} MB.`
  }
  return ''
}

// Mengembalikan path yang disimpan di kolom foto: "bucket/namafile".
export async function unggahFoto(bucket, file, folder = '') {
  const ekstensi = ekstensiDari(file.name) || 'jpg'
  const nama = folder ? `${folder}/${namaFileUnik(ekstensi)}` : namaFileUnik(ekstensi)

  const { error } = await supabase.storage.from(bucket).upload(nama, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })

  if (error) throw error
  return `${bucket}/${nama}`
}

// "motor/abc.jpg" -> { bucket: "motor", nama: "abc.jpg" }. URL penuh dilewati.
export function pecahPathFoto(path) {
  const nilai = String(path ?? '').trim()
  if (!nilai || /^https?:\/\//i.test(nilai)) return null

  const batas = nilai.indexOf('/')
  if (batas < 1) return null

  const bucket = nilai.slice(0, batas)
  const nama = nilai.slice(batas + 1)
  if (!nama) return null
  return { bucket, nama }
}

// Hapus file SETELAH operasi database sukses. Gagal hapus tidak mengganggu alur.
export async function hapusFotoStorage(daftar) {
  const perBucket = new Map()

  for (const item of daftar ?? []) {
    const pecah = pecahPathFoto(item)
    if (!pecah) continue
    const isi = perBucket.get(pecah.bucket) ?? []
    isi.push(pecah.nama)
    perBucket.set(pecah.bucket, isi)
  }

  for (const [bucket, nama] of perBucket) {
    if (!nama.length) continue
    try {
      await supabase.storage.from(bucket).remove(nama)
    } catch (error) {
      console.warn('[Astrea] Gagal menghapus foto lama:', error?.message)
    }
  }
}

// Kompres foto profil di browser (maks 1000 px, JPEG 0.82) seperti script di admin_dashboard.php.
export function kompresGambar(file, maxDim = 1000, kualitas = 0.82) {
  return new Promise((resolve) => {
    const selesai = (hasil) => resolve(hasil || file)

    try {
      const reader = new FileReader()
      reader.onerror = () => selesai(file)
      reader.onload = (event) => {
        const img = new Image()
        img.onerror = () => selesai(file)
        img.onload = () => {
          let { width: w, height: h } = img
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            } else {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return selesai(file)
          ctx.drawImage(img, 0, 0, w, h)

          canvas.toBlob(
            (blob) => {
              if (!blob) return selesai(file)
              const nama = `${(file.name || 'foto').replace(/\.[^.]+$/, '')}.jpg`
              selesai(new File([blob], nama, { type: 'image/jpeg' }))
            },
            'image/jpeg',
            kualitas
          )
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    } catch {
      selesai(file)
    }
  })
}
