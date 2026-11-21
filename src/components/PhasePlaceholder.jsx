export default function PhasePlaceholder({ ikon = '🚧', judul, keterangan, fase }) {
  return (
    <div className="phase-card">
      <div className="phase-icon">{ikon}</div>
      <h1>{judul}</h1>
      {keterangan && <p>{keterangan}</p>}
      {fase && <div className="phase-badge">{fase}</div>}
    </div>
  )
}
