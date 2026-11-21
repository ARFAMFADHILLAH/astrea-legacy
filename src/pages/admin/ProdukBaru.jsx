import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastHost, useToast } from '../../components/Toast'
import DataPembeliFields from '../../components/admin/DataPembeliFields'
import { supabase } from '../../lib/supabase'
import { hapusFotoStorage, pesanValidasiFoto, unggahFoto } from '../../lib/upload'
import { hariIni } from '../../lib/format'

const MAKS_FOTO = 6

function daftarTahun() {
  const sekarang = new Date().getFullYear()
  const hasil = []
  for (let tahun = sekarang; tahun >= 1980; tahun -= 1) hasil.push(tahun)
  return hasil
}

const FORM_AWAL = {
  nama_motor: '',
  tahun: '',
  harga: '',
  deskripsi: '',
  status: 'Ready',
  nama_pembeli: '',
  wa_pembeli: '',
  alamat_pembeli: '',
  tanggal_terjual: '',
}

export default function ProdukBaru() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()
  const inputFoto = useRef(null)

  const [form, setForm] = useState(FORM_AWAL)
  const [foto, setFoto] = useState([])
  const [galat, setGalat] = useState('')

  function ubahForm(event) {
    const { name, value } = event.target
    setForm((lama) => {
      const baru = { ...lama, [name]: value }
      if (name === 'status' && value === 'Terjual' && !baru.tanggal_terjual) {
        baru.tanggal_terjual = hariIni()
      }
      return baru
    })
  }

  function pilihFoto(event) {
    const berkas = Array.from(event.target.files ?? [])

    if (berkas.length > MAKS_FOTO) {
      setGalat(`Maksimal ${MAKS_FOTO} foto. Kamu memilih ${berkas.length} file.`)
      event.target.value = ''
      setFoto([])
      return
    }

    for (const file of berkas) {
      const pesan = pesanValidasiFoto(file)
      if (pesan) {
        setGalat(pesan)
        event.target.value = ''
        setFoto([])
        return
      }
    }

    setGalat('')
    setFoto(berkas)
  }

  const simpan = useMutation({
    mutationFn: async () => {
      const pathFoto = []
      try {
        for (const file of foto) {
          pathFoto.push(await unggahFoto('motor', file))
        }

        const { error } = await supabase.from('produk').insert({
          nama_motor: form.nama_motor.trim(),
          tahun: Number(form.tahun),
          harga: Number(String(form.harga).replace(/[^0-9]/g, '')) || 0,
          deskripsi: form.deskripsi.trim(),
          status: form.status,
          foto: pathFoto,
          nama_pembeli: form.status === 'Terjual' ? form.nama_pembeli.trim() || null : null,
          wa_pembeli: form.status === 'Terjual' ? form.wa_pembeli.trim() || null : null,
          alamat_pembeli: form.status === 'Terjual' ? form.alamat_pembeli.trim() || null : null,
          tanggal_terjual: form.status === 'Terjual' ? form.tanggal_terjual || null : null,
        })

        if (error) throw error
        return pathFoto
      } catch (error) {
        // Buang file yang sudah terlanjur terupload kalau database gagal.
        await hapusFotoStorage(pathFoto)
        throw error
      }
    },
    onSuccess: () => {
      setForm(FORM_AWAL)
      setFoto([])
      setGalat('')
      if (inputFoto.current) inputFoto.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['produk'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
      queryClient.invalidateQueries({ queryKey: ['laporan'] })
      tampil('ok', 'Motor berhasil ditambahkan!', 'Unit baru sudah masuk katalog dan stok.')
    },
    onError: (error) => {
      tampil('err', 'Gagal menyimpan motor', error.message)
    },
  })

  function kirim(event) {
    event.preventDefault()
    if (simpan.isPending) return

    if (foto.length === 0) {
      setGalat('Pilih minimal 1 foto motor.')
      return
    }

    if (form.status === 'Terjual') {
      if (!form.nama_pembeli.trim() || !form.wa_pembeli.trim() || !form.tanggal_terjual) {
        setGalat('Unit Terjual wajib punya Nama Pembeli, No. WhatsApp, dan Tanggal Terjual.')
        return
      }
    }

    setGalat('')
    simpan.mutate()
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Formulir Tambah Produk Baru</h2>
            <p>Foto pertama otomatis jadi foto utama di katalog</p>
          </div>
          <Link to="/admin?menu=produk" className="btn-sm btn-edit">
            ← Kembali
          </Link>
        </div>

        <div className="form-wrap">
          {galat ? <div className="alert-error">{galat}</div> : null}

          <form onSubmit={kirim}>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="nama_motor">Nama Motor</label>
                <input
                  id="nama_motor"
                  type="text"
                  name="nama_motor"
                  placeholder="Contoh: Astrea Prima 1991"
                  required
                  value={form.nama_motor}
                  onChange={ubahForm}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tahun">Tahun</label>
                <select id="tahun" name="tahun" required value={form.tahun} onChange={ubahForm}>
                  <option value="">Pilih</option>
                  {daftarTahun().map((tahun) => (
                    <option key={tahun} value={tahun}>
                      {tahun}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="harga">Harga</label>
                <input
                  id="harga"
                  type="number"
                  name="harga"
                  placeholder="Contoh: 14500000"
                  min="0"
                  required
                  value={form.harga}
                  onChange={ubahForm}
                />
              </div>
            </div>

            <div className="form-group produk-deskripsi">
              <label htmlFor="deskripsi">Deskripsi</label>
              <textarea
                id="deskripsi"
                name="deskripsi"
                rows={4}
                placeholder="Detail lengkap, Surat, Kondisi"
                required
                value={form.deskripsi}
                onChange={ubahForm}
              />
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label htmlFor="foto">Foto Upload (Format JPG/PNG/WEBP, maks 6 foto)</label>
                <input
                  id="foto"
                  ref={inputFoto}
                  type="file"
                  name="foto"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  required
                  onChange={pilihFoto}
                />
                <small className="file-hint">
                  Pilih beberapa foto sekaligus. Foto pertama jadi foto utama. Nanti di menu Edit
                  bisa ganti per foto &amp; tambah foto bareng pembeli.
                </small>
                {foto.length > 0 ? (
                  <small className="file-hint">{foto.length} foto dipilih.</small>
                ) : null}
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-row">
                  {['Ready', 'Terjual'].map((status) => (
                    <label className="status-opt" key={status}>
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={form.status === status}
                        onChange={ubahForm}
                      />
                      <span className="status-lbl">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {form.status === 'Terjual' ? (
              <DataPembeliFields form={form} ubahForm={ubahForm} />
            ) : null}

            <div className="form-actions">
              <button type="submit" className="btn-green" disabled={simpan.isPending}>
                {simpan.isPending ? 'Menyimpan…' : 'TAMBAH PRODUK BARU'}
              </button>
              <button
                type="button"
                className="produk-batal"
                onClick={() => navigate('/admin?menu=produk')}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>

      <ToastHost toasts={toasts} onClose={tutup} />
    </>
  )
}
