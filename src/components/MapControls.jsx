export default function MapControls({ mapType, setMapType, showParcel, setShowParcel, showGreen, setShowGreen, showRed, setShowRed, showOrange, setShowOrange, showIndustrial, setShowIndustrial }) {
  const redOn = showRed !== undefined ? showRed : showIndustrial
  const setRedOn = setShowRed || setShowIndustrial

  const mapBtn = (v) => ({
    padding: '5px 9px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '10px', fontWeight: 600,
    background: mapType === v ? '#f59e0b' : '#1e2d47',
    color: mapType === v ? '#000' : '#94a3b8',
  })

  const overlayBtn = (active, r, g, b) => ({
    padding: '5px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '10px',
    fontWeight: 600, textAlign: 'left', width: '100%',
    background: active ? `rgba(${r},${g},${b},0.20)` : '#1e2d47',
    color: active ? `rgb(${r},${g},${b})` : '#94a3b8',
    border: active ? `1px solid rgba(${r},${g},${b},0.40)` : '1px solid transparent',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>MAP STYLE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
          {[['dark','🌑 Dark'],['street','🗺 Street'],['aerial','🛰 Aerial'],['hybrid','🌐 Hybrid']].map(([v, l]) => (
            <button key={v} onClick={() => setMapType(v)} style={mapBtn(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>OVERLAYS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>

          <button onClick={() => setShowGreen && setShowGreen(v => !v)} style={overlayBtn(showGreen, 34,197,94)}>
            🟢 Storage Allowed (By-Right)
          </button>

          <button onClick={() => setRedOn(v => !v)} style={overlayBtn(redOn, 239,68,68)}>
            🔴 No Storage (Prime · IP)
          </button>

          <button onClick={() => setShowOrange && setShowOrange(v => !v)} style={overlayBtn(showOrange, 249,115,22)}>
            🟠 Pending Restriction (CUPD)
          </button>

          <button onClick={() => setShowParcel(v => !v)} style={overlayBtn(showParcel, 255,235,59)}>
            🟡 SD Parcels{showParcel ? ' (zoom 14+)' : ''}
          </button>

        </div>
      </div>

      <div style={{ fontSize: '8px', color: '#475569', lineHeight: 1.6, paddingTop: 2, borderTop: '1px solid #1e2d47', marginTop: 2 }}>
        <div style={{ color: '#4ade80', marginBottom: 1 }}>🟢 <b>By-Right:</b> IL · IH · IBT · CR · CC-4 · CC-5</div>
        <div style={{ color: '#f87171', marginBottom: 1 }}>🔴 <b>Banned:</b> Prime Industrial · IP</div>
        <div style={{ color: '#fb923c' }}>🟠 <b>Pending:</b> CUPD (2026 restriction)</div>
      </div>
    </div>
  )
}
