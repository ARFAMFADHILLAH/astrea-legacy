import { formatRupiah } from '../lib/format'

export default function StatCards({ statistik }) {
  const data = statistik ?? {}

  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon green">📦</div>
        </div>
        <div className="stat-num">{data.totalUnit ?? 0}</div>
        <div className="stat-label">Total Unit</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon blue">✅</div>
        </div>
        <div className="stat-num">{data.totalReady ?? 0}</div>
        <div className="stat-label">Stok Ready</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon red">🏷️</div>
        </div>
        <div className="stat-num">{data.totalTerjual ?? 0}</div>
        <div className="stat-label">Terjual</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon teal">💰</div>
        </div>
        <div className="stat-num stat-num-teal stat-num-money">
          {formatRupiah(data.totalPendapatan)}
        </div>
        <div className="stat-label">Total Pendapatan</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon yellow">💸</div>
        </div>
        <div className="stat-num stat-num-plain stat-num-money">
          {formatRupiah(data.totalPengeluaran)}
        </div>
        <div className="stat-label">Total Pengeluaran</div>
      </div>

      <div className="stat-card">
        <div className="stat-card-top">
          <div className="stat-icon indigo">📊</div>
        </div>
        <div
          className={`stat-num stat-num-money ${
            Number(data.labaBersih ?? 0) >= 0 ? 'laba-positif' : 'laba-negatif'
          }`}
        >
          {formatRupiah(data.labaBersih)}
        </div>
        <div className="stat-label">Laba Bersih</div>
      </div>
    </div>
  )
}
