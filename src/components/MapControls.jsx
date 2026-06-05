export default function MapControls({ mapType, setMapType, showParcel, setShowParcel, showGreen, setShowGreen, showRed, setShowRed, showOrange, setShowOrange, showIndustrial, setShowIndustrial }) {
  // Support both legacy (showIndustrial) and new (showRed) prop names
  const redOn = showRed !== undefined ? showRed : showIndustrial
  const setRedOn = setShowRed || setShowIndustrial

  const mapBtn = (v) => ({
    padding: '5px 9px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '10px', fontWeight: 600,
    background: mapType === v ? '#f59e0b' : '#1e2d47',
    color: mapType === v ? '#000' : '#94a3b8',
  })

  const overlayBtn = (active, color, bgAlpha) => ({
    padding: '5px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '10px',
    fontWeight: 600, textAlign: 'left', width: '100%',
    background: active ? `rgba(${color},${bgAlpha})` : '#1e2d47',
    color: active ? `rgb(${color})` : '#94a3b8',
    border: active ? `1px solid rgba(${color},0.35)` : '1px solid transparent',
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

          <button onClick={() => setShowGreen && setShowGreen(v => !v)} style={overlayBtn(showGreen, '34,197,94', 0.18)}>
            🟢 Storage Allowed (IL/IH/IBT)
          </button>

          <button onClick={() => setRedOn(v => !v)} style={overlayBtn(redOn, '239,68,68', 0.18)}>
            🔴 No Storage (Prime Ind. + IP)
          </button>

          <button onClick={() => setShowOrange && setShowOrange(v => !v)} style={overlayBtn(showOrange, '249,115,22', 0.18)}>
            🟠 Pending Restriction (CUPD)
          </button>

          <button onClick={() => setShowParcel(v => !v)} style={overlayBtn(showParcel, '255,235,59', 0.13)}>
            🟡 SD Parcels{showParcel ? ' (zoom 14+)' : ''}
          </button>

        </div>
      </div>

      <div style={{ fontSize: '8px', color: '#334155', lineHeight: 1.4, paddingTop: 2 }}>
        <div>🟢 IL · IH · IBT = by-right</div>
        <div>🔴 Prime Industrial · IP = banned</div>
        <div>🟠 CUPD corridor = pending 2026</div>
      </div>
    </div>
  )
}
