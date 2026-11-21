// Kolom data pembeli yang muncul saat unit ditandai Terjual.
// Dipakai di form tambah produk dan edit produk supaya isiannya sama.
export default function DataPembeliFields({ form, ubahForm }) {
  return (
    <>
      <h3 className="edit-subjudul">🧾 Data Pembeli</h3>
      <div className="edit-hint">
        Terisi otomatis saat unit dikonfirmasi terjual. Data ini hanya tampil di dashboard admin,
        tidak pernah dikirim ke halaman publik.
      </div>

      <div className="form-row form-row-2">
        <div className="form-group">
          <label htmlFor="nama_pembeli">Nama Pembeli</label>
          <input
            id="nama_pembeli"
            type="text"
            name="nama_pembeli"
            placeholder="Nama lengkap pembeli"
            required
            value={form?.nama_pembeli ?? ''}
            onChange={ubahForm}
          />
        </div>

        <div className="form-group">
          <label htmlFor="wa_pembeli">No. WhatsApp</label>
          <input
            id="wa_pembeli"
            type="tel"
            name="wa_pembeli"
            placeholder="Contoh: 08123456789"
            required
            value={form?.wa_pembeli ?? ''}
            onChange={ubahForm}
          />
        </div>
      </div>

      <div className="form-row form-row-2">
        <div className="form-group">
          <label htmlFor="alamat_pembeli">Alamat (opsional)</label>
          <input
            id="alamat_pembeli"
            type="text"
            name="alamat_pembeli"
            placeholder="Kota / alamat pengiriman"
            value={form?.alamat_pembeli ?? ''}
            onChange={ubahForm}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tanggal_terjual">Tanggal Terjual</label>
          <input
            id="tanggal_terjual"
            type="date"
            name="tanggal_terjual"
            required
            value={form?.tanggal_terjual ?? ''}
            onChange={ubahForm}
          />
        </div>
      </div>
    </>
  )
}
