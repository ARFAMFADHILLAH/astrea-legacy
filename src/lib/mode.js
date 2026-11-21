// Mode build menentukan bagian aplikasi yang ikut dilayani.
//
//   public -> situs toko (Vercel)      : tanpa rute /admin, tanpa form login
//   admin  -> panel admin (Cloudflare) : entry berupa form login + dashboard
//   all    -> pengembangan lokal       : toko + panel dalam satu origin
//
// Nilai ini dibaca saat build (bukan runtime), jadi tidak bisa diubah dari
// browser. Build tanpa VITE_APP_MODE dianggap "public" supaya aman kalau env
// var lupa dipasang di hosting.
const modeMentah = import.meta.env.VITE_APP_MODE

export const APP_MODE =
  modeMentah === 'admin' || modeMentah === 'public'
    ? modeMentah
    : import.meta.env.DEV
      ? 'all'
      : 'public'

export const modeToko = APP_MODE !== 'admin'
export const modePanel = APP_MODE !== 'public'
export const hanyaPanel = APP_MODE === 'admin'

// Link "Lihat Toko" di panel harus menunjuk ke situs publik, bukan ke origin
// panel sendiri. Kosong berarti pakai origin yang sama (mode dev).
export const URL_PUBLIK = String(import.meta.env.VITE_PUBLIC_URL || '').replace(/\/+$/, '')
