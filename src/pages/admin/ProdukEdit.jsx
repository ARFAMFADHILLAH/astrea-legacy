import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ToastHost, useToast } from '../../components/Toast'
import DataPembeliFields from '../../components/admin/DataPembeliFields'
import { supabase } from '../../lib/supabase'
import { fotoUrl } from '../../lib/foto'
import { hapusFotoStorage, pesanValidasiFoto, unggahFoto } from '../../lib/upload'
import { useProdukSatu } from '../../hooks/useAdminData'
import { hariIni } from '../../lib/format'

const MAKS_FOTO = 6

export default function ProdukEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, tampil, tutup } = useToast()
  const { data: produk, isLoading, error } = useProdukSatu(id)

  const [form, setForm] = useState(null)
  const [slotFile, setSlotFile] = useState(Array(MAKS_FOTO).fill(null))
  const [slotPreview, setSlotPreview] = useState(Array(MAKS_FOTO).fill(''))
  const [hapusSlot, setHapusSlot] = useState(Array(MAKS_FOTO).fill(false))
  const [cover, setCover] = useState(0)
  const [pembeliFile, setPembeliFile] = useState(null)
  const [pembeliPreview, setPembeliPreview] = useState('')
  const [hapusPembeli, setHapusPembeli] = useState(false)
  const [galat, setGalat] = useState('')

  const fotoLama = Array.isArray(produk?.foto) ? produk.foto.slice(0, MAKS_FOTO) : []
  const fotoPembeliLama = String(produk?.foto_pembeli ?? '').trim()

  useEffect(() => {
    if (!produk) return

    setForm({
      nama_motor: produk.nama_motor ?? '',
      tahun: produk.tahun ?? '',
      harga: produk.harga ?? '',
      status: produk.status ?? 'Ready',
      deskripsi: produk.deskripsi ?? '',
      nama_pembeli: produk.nama_pembeli ?? '',
      wa_pembeli: produk.wa_pembeli ?? '',
      alamat_pembeli: produk.alamat_pembeli ?? '',
      tanggal_terjual: produk.tanggal_terjual ?? '',
    })
    setSlotFile(Array(MAKS_FOTO).fill(null))
    setSlotPreview(Array(MAKS_FOTO).fill(''))
    setHapusSlot(Array(MAKS_FOTO).fill(false))
    setCover(0)
    setPembeliFile(null)
    setPembeliPreview('')
    setHapusPembeli(false)
    setGalat('')
  }, [produk?.id])

  function ubahForm(event) {
    const { name, value } = event.target
    setForm((lama) => {
      const baru = { ...lama, [name]: value }
      // Saat unit baru ditandai terjual, isi tanggal hari ini kalau masih kosong.
      if (name === 'status' && value === 'Terjual' && !baru.tanggal_terjual) {
        baru.tanggal_terjual = hariIni()
      }
      return baru
    })
  }

  function bacaPreview(file, terapkan) {
    const reader = new FileReader()
    reader.onload = (event) => terapkan(String(event.target.result ?? ''))
    reader.readAsDataURL(file)
  }

  function pilihSlot(indeks, event) {
    const file = event.target.files?.[0]
    if (!file) return

    const pesan = pesanValidasiFoto(file)
    if (pesan) {
      setGalat(pesan)
      event.target.value = ''
      return
    }

    setGalat('')
    setSlotFile((lama) => lama.map((item, i) => (i === indeks ? file : item)))
    setHapusSlot((lama) => lama.map((item, i) => (i === indeks ? false : item)))
    bacaPreview(file, (dataUrl) =>
      setSlotPreview((lama) => lama.map((item, i) => (i === indeks ? dataUrl : item)))
    )
  }

  function toggleHapusSlot(indeks, dicentang) {
    setHapusSlot((lama) => lama.map((item, i) => (i === indeks ? dicentang : item)))
    const adaFileBaru = Boolean(slotFile[indeks])

    if (dicentang || adaFileBaru) {
      setSlotFile((lama) => lama.map((item, i) => (i === indeks ? null : item)))
      setSlotPreview((lama) => lama.map((item, i) => (i === indeks ? '' : item)))
    }
  }

  function pilihPembeli(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const pesan = pesanValidasiFoto(file)
    if (pesan) {
      setGalat(pesan)
      event.target.value = ''
      return
    }

    setGalat('')
    setPembeliFile(file)
    setHapusPembeli(false)
    bacaPreview(file, setPembeliPreview)
  }

  function toggleHapusPembeli(dicentang) {
    setHapusPembeli(dicentang)
    if (dicentang || pembeliFile) {
      setPembeliFile(null)
      setPembeliPreview('')
    }
  }

  const simpan = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Form belum siap.')
      const fileBaru = []
      const akanDihapus = []
      let databaseSukses = false

      try {
        const slot = Array(MAKS_FOTO).fill('')

        for (let i = 0; i < MAKS_FOTO; i += 1) {
          const lama = fotoLama[i] ?? ''
          const berkas = slotFile[i]

          if (berkas) {
            const path = await unggahFoto('motor', berkas)
            fileBaru.push(path)
            if (lama) akanDihapus.push(lama)
            slot[i] = path
          } else if (hapusSlot[i] && lama) {
            akanDihapus.push(lama)
            slot[i] = ''
          } else {
            slot[i] = lama
          }
        }

        let pembeliBaru = fotoPembeliLama
        if (pembeliFile) {
          const path = await unggahFoto('motor', pembeliFile, 'pembeli')
          fileBaru.push(path)
          if (fotoPembeliLama) akanDihapus.push(fotoPembeliLama)
          pembeliBaru = path
        } else if (hapusPembeli && fotoPembeliLama) {
          akanDihapus.push(fotoPembeliLama)
          pembeliBaru = ''
        }

        // Foto utama/cover naik ke urutan pertama; sisanya mengikuti urutan slot.
        const urut = []
        if (slot[cover]) urut.push(slot[cover])
        slot.forEach((path, i) => {
          if (path && i !== cover) urut.push(path)
        })

        if (urut.length === 0) {
          throw new Error('Minimal harus ada 1 foto motor.')
        }

        const { error: errorSimpan } = await supabase
          .from('produk')
          .update({
            nama_motor: form.nama_motor.trim(),
            tahun: Number(form.tahun),
            harga: Number(String(form.harga).replace(/[^0-9]/g, '')) || 0,
            status: form.status,
            deskripsi: form.deskripsi.trim(),
            foto: urut,
            foto_pembeli: pembeliBaru || null,
            nama_pembeli: (form.nama_pembeli ?? '').trim() || null,
            wa_pembeli: (form.wa_pembeli ?? '').trim() || null,
            alamat_pembeli: (form.alamat_pembeli ?? '').trim() || null,
            tanggal_terjual: form.tanggal_terjual || null,
          })
          .eq('id', produk.id)

        if (errorSimpan) throw errorSimpan

        databaseSukses = true

        // File lama dihapus setelah database sukses diupdate.
        await hapusFotoStorage(akanDihapus)
      } catch (error) {
        if (!databaseSukses) await hapusFotoStorage(fileBaru)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produk'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'statistik'] })
      queryClient.invalidateQueries({ queryKey: ['laporan'] })
      navigate('/admin?menu=produk', { replace: true, state: { flash: 'Data berhasil diubah!' } })
    },
    onError: (kesalahan) => {
      tampil('err', 'Gagal menyimpan perubahan', kesalahan.message)
    },
  })

  function kirim(event) {
    event.preventDefault()
    if (simpan.isPending || !form) return
    setGalat('')

    if (form.status === 'Terjual') {
      if (
        !(form.nama_pembeli ?? '').trim() ||
        !(form.wa_pembeli ?? '').trim() ||
        !form.tanggal_terjual
      ) {
        setGalat('Unit Terjual wajib punya Nama Pembeli, No. WhatsApp, dan Tanggal Terjual.')
        return
      }
    }

    simpan.mutate()
  }

  if (isLoading) {
    return <div className="panel app-loading">Memuat data motor…</div>
  }

  if (error || !produk) {
    return (
      <div className="panel">
        <div className="form-wrap">
          <div className="alert-error">{error?.message || 'Data tidak ditemukan!'}</div>
          <Link to="/admin?menu=produk" className="btn-sm btn-edit">
            ← Kembali ke Daftar Motor
          </Link>
        </div>
      </div>
    )
  }

  const previewPembeli =
    pembeliPreview ||
    (!hapusPembeli && fotoPembeliLama ? fotoUrl(fotoPembeliLama, '') : '')

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Edit Data Motor</h2>
            <p>Perbarui data, foto per slot, cover, dan foto bareng pembeli</p>
          </div>
          <Link to="/admin?menu=produk" className="btn-sm btn-edit">
            ← Kembali
          </Link>
        </div>

        <div className="form-wrap">
          {galat ? <div className="alert-error">⚠️ {galat}</div> : null}

          <form onSubmit={kirim}>
            <div className="form-row form-row-single">
              <div className="form-group">
                <label htmlFor="nama_motor">Nama Motor</label>
                <input
                  id="nama_motor"
                  type="text"
                  name="nama_motor"
                  required
                  value={form?.nama_motor ?? ''}
                  onChange={ubahForm}
                />
              </div>
            </div>

            <div className="form-row form-row-2">
              <div className="form-group">
                <label htmlFor="tahun">Tahun</label>
                <input
                  id="tahun"
                  type="number"
                  name="tahun"
                  required
                  value={form?.tahun ?? ''}
                  onChange={ubahForm}
                />
              </div>
              <div className="form-group">
                <label htmlFor="harga">Harga</label>
                <input
                  id="harga"
                  type="number"
                  name="harga"
                  min="0"
                  required
                  value={form?.harga ?? ''}
                  onChange={ubahForm}
                />
              </div>
            </div>

            <div className="form-row form-row-single">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={form?.status ?? 'Ready'} onChange={ubahForm}>
                  <option value="Ready">Ready</option>
                  <option value="Terjual">Terjual (Sold Out)</option>
                </select>
              </div>
            </div>

            {form?.status === 'Terjual' ? (
              <DataPembeliFields form={form} ubahForm={ubahForm} />
            ) : null}

            <div className="form-group">
              <label htmlFor="deskripsi">Deskripsi</label>
              <textarea
                id="deskripsi"
                name="deskripsi"
                rows={4}
                value={form?.deskripsi ?? ''}
                onChange={ubahForm}
              />
            </div>

            <h3 className="edit-subjudul">📷 Foto Motor (maks {MAKS_FOTO})</h3>
            <div className="edit-hint">
              Tiap kotak berdiri sendiri: ganti foto di kotak 3 <b>tidak</b> mengubah kotak lain.
              Pilih bulatan <b>&quot;Jadikan foto utama&quot;</b> untuk foto yang tampil di katalog
              &amp; urutan pertama. Kotak kosong = tinggal pilih file untuk menambah foto.
            </div>

            <div className="slot-grid">
              {Array.from({ length: MAKS_FOTO }, (_, i) => {
                const pratinjau =
                  slotPreview[i] || (!hapusSlot[i] && fotoLama[i] ? fotoUrl(fotoLama[i], '') : '')

                return (
                  <div className={`slot ${pratinjau ? 'slot-terisi' : ''}`} key={i}>
                    <span className="slot-no">Foto {i + 1}</span>
                    <div className="slot-img">
                      {pratinjau ? <img src={pratinjau} alt={`Foto ${i + 1}`} /> : 'Kosong'}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => pilihSlot(i, event)}
                    />
                    <div className="slot-opsi">
                      <label>
                        <input
                          type="radio"
                          name="cover"
                          value={i}
                          checked={cover === i}
                          onChange={() => setCover(i)}
                        />{' '}
                        Jadikan foto utama
                      </label>
                      {fotoLama[i] || slotFile[i] || hapusSlot[i] ? (
                        <label className="slot-hapus">
                          <input
                            type="checkbox"
                            checked={hapusSlot[i]}
                            onChange={(event) => toggleHapusSlot(i, event.target.checked)}
                          />{' '}
                          Hapus foto ini
                        </label>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <h3 className="edit-subjudul">🤝 Foto Bareng Pembeli (untuk unit Terjual)</h3>
            <div className="edit-hint">
              Kalau motor sudah laku, upload foto kamu bareng pembelinya di sini. Foto ini otomatis
              tampil di halaman <b>Jual Motor</b> (bagian &quot;Koleksi yang Pernah Kami
              Restorasi&quot;) dan jadi foto pertama di halaman detail. Kalau dikosongkan, yang
              tampil foto utama motor.
            </div>

            <div className="pembeli-box">
              <div className="slot-img pembeli-img">
                {previewPembeli ? (
                  <img src={previewPembeli} alt="Foto bareng pembeli" />
                ) : (
                  'Belum ada foto'
                )}
              </div>
              <div className="pembeli-kanan">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={pilihPembeli}
                />
                {fotoPembeliLama || pembeliFile ? (
                  <label className="slot-hapus">
                    <input
                      type="checkbox"
                      checked={hapusPembeli}
                      onChange={(event) => toggleHapusPembeli(event.target.checked)}
                    />{' '}
                    Hapus foto pembeli
                  </label>
                ) : null}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-green" disabled={simpan.isPending}>
                {simpan.isPending ? 'Menyimpan…' : 'SIMPAN PERUBAHAN'}
              </button>
              <Link to="/admin?menu=produk" className="produk-batal">
                Batal
              </Link>
            </div>
          </form>
        </div>
      </div>

      <ToastHost toasts={toasts} onClose={tutup} />
    </>
  )
}
