import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ToastHost, useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDaftarUser } from '../../hooks/useAdminData'

export default function KelolaUser() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()
  const { data: daftar = [], isLoading, error } = useDaftarUser()
  const [target, setTarget] = useState(null)

  const ubahRole = useMutation({
    mutationFn: async (profil) => {
      const roleBaru = profil.role === 'admin' ? 'user' : 'admin'
      const { error: errorRole } = await supabase.rpc('set_user_role', {
        p_user_id: profil.id,
        p_role: roleBaru,
      })
      if (errorRole) throw errorRole
      return roleBaru
    },
    onSuccess: (roleBaru) => {
      setTarget(null)
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['pengajuan'] })
      tampil(
        'ok',
        roleBaru === 'admin' ? 'User dijadikan admin!' : 'Akses admin dicabut.',
        roleBaru === 'admin'
          ? 'User ini sekarang bisa membuka dashboard admin.'
          : 'User ini kembali jadi user biasa.'
      )
    },
    onError: (kesalahan) => {
      setTarget(null)
      tampil('err', 'Gagal mengubah role', kesalahan.message)
    },
  })

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>👥 Daftar User</h2>
            <p>Atur siapa saja yang boleh masuk ke dashboard admin</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="ku-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th className="ku-th-aksi">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="empty-row">
                  <td colSpan="3">Memuat daftar user…</td>
                </tr>
              ) : error ? (
                <tr className="empty-row">
                  <td colSpan="3">Gagal memuat user: {error.message}</td>
                </tr>
              ) : daftar.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="3">Belum ada user terdaftar.</td>
                </tr>
              ) : (
                daftar.map((profil) => {
                  const akunSendiri = profil.id === user?.id

                  return (
                    <tr key={profil.id}>
                      <td className="td-bold">{profil.username}</td>
                      <td>
                        <span
                          className={`ku-badge ${
                            profil.role === 'admin' ? 'ku-badge-admin' : 'ku-badge-user'
                          }`}
                        >
                          {profil.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        {akunSendiri ? (
                          <span className="ku-me">(akun kamu)</span>
                        ) : (
                          <button
                            type="button"
                            className={`ku-btn ${
                              profil.role === 'admin' ? 'ku-btn-turun' : 'ku-btn-naik'
                            }`}
                            onClick={() => setTarget(profil)}
                          >
                            {profil.role === 'admin' ? 'Turunkan jadi User' : 'Jadikan Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastHost toasts={toasts} onClose={tutup} />

      <ConfirmDialog
        buka={Boolean(target)}
        ikon="👥"
        judul={
          target?.role === 'admin' ? 'Turunkan user ini jadi User?' : 'Jadikan user ini admin?'
        }
        deskripsi={
          target?.role === 'admin' ? (
            <>
              <b>{target?.username}</b> tidak akan bisa membuka dashboard admin lagi.
            </>
          ) : (
            <>
              <b>{target?.username}</b> akan mendapat akses penuh ke dashboard admin, termasuk
              menghapus produk dan memproses pengajuan.
            </>
          )
        }
        labelYa={target?.role === 'admin' ? 'Ya, Turunkan' : 'Ya, Jadikan Admin'}
        jenis={target?.role === 'admin' ? 'tolak' : 'setujui'}
        memproses={ubahRole.isPending}
        onBatal={() => setTarget(null)}
        onYa={() => target && ubahRole.mutate(target)}
      />
    </>
  )
}
