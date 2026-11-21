import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fotoUrl } from '../../lib/foto'
import { ekstensiDari, hapusFotoStorage, kompresGambar, unggahFoto } from '../../lib/upload'
import { useAuth } from '../../hooks/useAuth'

const PESAN = {
  foto_sukses: ['alert-success', 'Foto profil berhasil diperbarui!'],
  foto_gagal: ['alert-error', 'Gagal upload foto, coba lagi ya.'],
  foto_format_salah: ['alert-error', 'Format foto harus JPG/PNG/WEBP, maksimal 5MB.'],
  pw_sukses: ['alert-success', 'Password berhasil diganti!'],
  pw_salah: ['alert-error', 'Password lama yang kamu masukkan salah.'],
  pw_pendek: ['alert-error', 'Password baru minimal 6 karakter.'],
  pw_beda: ['alert-error', 'Konfirmasi password baru tidak cocok.'],
  username_sukses: ['alert-success', 'Username berhasil diganti!'],
  username_pendek: ['alert-error', 'Username minimal 3 karakter.'],
  username_panjang: ['alert-error', 'Username maksimal 30 karakter.'],
  username_spasi: ['alert-error', 'Username tidak boleh mengandung spasi.'],
  username_duplikat: ['alert-error', 'Username sudah dipakai akun lain, pilih yang lain.'],
  username_gagal: ['alert-error', 'Gagal menyimpan username, coba lagi.'],
}

export default function ProfilTab() {
  const { profile, user, refreshProfile } = useAuth()
  const queryClient = useQueryClient()

  const inputFotoRef = useRef(null)
  const [pesan, setPesan] = useState('')
  const [hint, setHint] = useState('JPG/PNG/WEBP — foto otomatis dikompres, maksimal 5MB')
  const [hintError, setHintError] = useState(false)
  const [mengunggah, setMengunggah] = useState(false)

  const [pwLama, setPwLama] = useState('')
  const [pwBaru, setPwBaru] = useState('')
  const [pwKonfirmasi, setPwKonfirmasi] = useState('')
  const [memprosesPw, setMemprosesPw] = useState(false)

  const [editUsername, setEditUsername] = useState(false)
  const [usernameBaru, setUsernameBaru] = useState('')
  const [menyimpanUsername, setMenyimpanUsername] = useState(false)

  // Samakan isian dengan username terbaru setiap profil selesai dimuat ulang.
  useEffect(() => {
    setUsernameBaru(profile?.username ?? '')
  }, [profile?.username])

  const fotoSekarang = profile?.foto_profil ? fotoUrl(profile.foto_profil, null) : null
  const inisial = (profile?.username || user?.email || 'A').charAt(0).toUpperCase()
  const kelasPesan = PESAN[pesan]?.[0]
  const isiPesan = PESAN[pesan]?.[1]

  function ubahHint(teks, salah = false) {
    setHint(teks)
    setHintError(salah)
  }

  async function gantiFoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user?.id) return

    const ekstensi = ekstensiDari(file.name)
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ekstensi) || file.size > 5 * 1024 * 1024) {
      setPesan('foto_format_salah')
      return
    }

    setPesan('')
    setMengunggah(true)
    ubahHint('Memproses foto...')

    try {
      const siapKirim = await kompresGambar(file)
      ubahHint('Mengupload foto...')

      const pathBaru = await unggahFoto('profil', siapKirim, user.id)
      const { error } = await supabase
        .from('profiles')
        .update({ foto_profil: pathBaru })
        .eq('id', user.id)
      if (error) throw error

      if (profile?.foto_profil) await hapusFotoStorage([profile.foto_profil])

      await refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      setPesan('foto_sukses')
      ubahHint('JPG/PNG/WEBP — foto otomatis dikompres, maksimal 5MB')
    } catch {
      setPesan('foto_gagal')
      ubahHint('Upload gagal, cek koneksi internet kamu lalu coba lagi.', true)
    } finally {
      setMengunggah(false)
    }
  }

  async function gantiUsername(event) {
    event.preventDefault()
    if (menyimpanUsername || !user?.id) return

    const baru = usernameBaru.trim()

    if (baru === profile?.username) {
      setEditUsername(false)
      return
    }
    if (baru.length < 3) {
      setPesan('username_pendek')
      return
    }
    if (baru.length > 30) {
      setPesan('username_panjang')
      return
    }
    if (/\s/.test(baru)) {
      setPesan('username_spasi')
      return
    }

    setPesan('')
    setMenyimpanUsername(true)

    const { error } = await supabase
      .from('profiles')
      .update({ username: baru })
      .eq('id', user.id)

    setMenyimpanUsername(false)

    if (error) {
      setPesan(error.code === '23505' ? 'username_duplikat' : 'username_gagal')
      return
    }

    await refreshProfile()
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    setUsernameBaru(baru)
    setEditUsername(false)
    setPesan('username_sukses')
  }

  function batalUbahUsername() {
    setUsernameBaru(profile?.username ?? '')
    setEditUsername(false)
    setPesan('')
  }

  async function gantiPassword(event) {
    event.preventDefault()
    if (memprosesPw) return

    if (pwBaru.length < 6) {
      setPesan('pw_pendek')
      return
    }
    if (pwBaru !== pwKonfirmasi) {
      setPesan('pw_beda')
      return
    }

    setPesan('')
    setMemprosesPw(true)

    try {
      const { error: errorLama } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: pwLama,
      })

      if (errorLama) {
        setPesan('pw_salah')
        return
      }

      const { error: errorBaru } = await supabase.auth.updateUser({ password: pwBaru })
      if (errorBaru) {
        setPesan('pw_pendek')
        return
      }

      setPwLama('')
      setPwBaru('')
      setPwKonfirmasi('')
      setPesan('pw_sukses')
    } catch {
      setPesan('pw_salah')
    } finally {
      setMemprosesPw(false)
    }
  }

  return (
    <>
      {kelasPesan && isiPesan ? <div className={kelasPesan}>{isiPesan}</div> : null}

      <div className="profil-grid">
        <div className="panel profil-card">
          <div className="panel-head">
            <div>
              <h2>Foto Profil</h2>
              <p>Foto ini muncul di pojok kanan atas dashboard</p>
            </div>
          </div>
          <div className="profil-foto-area">
            <div className="profil-foto-preview">
              {fotoSekarang ? <img src={fotoSekarang} alt="Foto profil" /> : <span>{inisial}</span>}
            </div>

            <label
              htmlFor="foto_profil_baru"
              className="btn-green profil-upload-btn"
              aria-disabled={mengunggah}
            >
              🖼️ {mengunggah ? 'Mengupload…' : 'Ganti Foto'}
            </label>
            <input
              id="foto_profil_baru"
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={gantiFoto}
              disabled={mengunggah}
            />

            <div className="profil-foto-hint" style={hintError ? { color: '#ef4444' } : undefined}>
              {hint}
            </div>
          </div>
        </div>

        <div className="panel profil-card">
          <div className="panel-head">
            <div>
              <h2>Info Akun</h2>
              <p>Detail akun kamu saat ini</p>
            </div>
          </div>
          <div className="profil-info-list">
            {editUsername ? (
              <form className="profil-info-row profil-info-row-edit" onSubmit={gantiUsername}>
                <label className="profil-info-lbl" htmlFor="username-baru">
                  Username
                </label>
                <div className="profil-username-edit">
                  <input
                    id="username-baru"
                    type="text"
                    value={usernameBaru}
                    onChange={(event) => setUsernameBaru(event.target.value)}
                    maxLength={30}
                    autoComplete="username"
                    autoFocus
                    disabled={menyimpanUsername}
                  />
                  <button type="submit" className="btn-green btn-sm" disabled={menyimpanUsername}>
                    {menyimpanUsername ? 'Menyimpan…' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-batal"
                    onClick={batalUbahUsername}
                    disabled={menyimpanUsername}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div className="profil-info-row">
                <div className="profil-info-lbl">Username</div>
                <div className="profil-info-val profil-info-username-val">
                  <span className="profil-info-username">{profile?.username || '-'}</span>
                  <button
                    type="button"
                    className="btn-sm btn-edit"
                    onClick={() => {
                      setUsernameBaru(profile?.username ?? '')
                      setPesan('')
                      setEditUsername(true)
                    }}
                  >
                    Ubah
                  </button>
                </div>
              </div>
            )}
            <div className="profil-info-row">
              <div className="profil-info-lbl">Role</div>
              <div className="profil-info-val">
                <span className="badge badge-ready">
                  {(profile?.role || 'user').charAt(0).toUpperCase() + (profile?.role || 'user').slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel profil-card profil-card-wide">
          <div className="panel-head">
            <div>
              <h2>Ganti Password</h2>
              <p>Pastikan password baru minimal 6 karakter</p>
            </div>
          </div>

          <form className="profil-pw-form" onSubmit={gantiPassword}>
            <div className="form-row profil-pw-row">
              <div className="form-group">
                <label htmlFor="password-lama">Password Lama</label>
                <input
                  id="password-lama"
                  type="password"
                  placeholder="Masukkan password saat ini"
                  autoComplete="current-password"
                  required
                  value={pwLama}
                  onChange={(event) => setPwLama(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password-baru">Password Baru</label>
                <input
                  id="password-baru"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={pwBaru}
                  onChange={(event) => setPwBaru(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password-konfirmasi">Konfirmasi Password Baru</label>
                <input
                  id="password-konfirmasi"
                  type="password"
                  placeholder="Ulangi password baru"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={pwKonfirmasi}
                  onChange={(event) => setPwKonfirmasi(event.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-green" disabled={memprosesPw}>
              {memprosesPw ? 'Menyimpan…' : 'Simpan Password Baru'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
