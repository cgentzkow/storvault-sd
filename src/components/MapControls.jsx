export default function MapControls({ mapType, setMapType, showParcel, setShowParcel, showGreen, setShowGreen, showCup, setShowCup, showRed, setShowRed, showOrange, setShowOrange, showIndustrial, setShowIndustrial }) {
  const redOn = showRed !== undefined ? showRed : showIndustrial
  const setRedOn = setShowRed || setShowIndustrial

  const mapBtn = (v) => ({
    padding: '5px 9px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '10px', fontWeight: 600,
    background: mapType === v ? '#f59e0b' : '#1e2d47',
    color: mapType === v ? '#000' : '#94a3b8',
  })

  const overlayBtn = (active, r, g, b, bgAlpha) => ({
    padding: '5px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '10px',
    fontWeight: 600, textAlign: 'left', width: '100%',
    background: active ? `rgba(${r},${g},${b},${bgAlpha})` : '#1e2d47',
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

          <button onClick={() => setShowGreen && setShowGreen(v => !v)} style={overlayBtn(showGreen, 34,197,94, 0.20)}>
            🟢 By-Right (IL · IH · IBT)
          </button>

          <button onClick={() => setShowCup && setShowCup(v => !v)} style={overlayBtn(showCup, 134,239,172, 0.25)}>
            🟩 CUP Required (CR)
          </button>

          <button onClick={() => setRedOn(v => !v)} style={overlayBtn(redOn, 239,68,68, 0.20)}>
            🔴 No Storage (Prime · IP)
          </button>

          <button onClick={() => setShowOrange && setShowOrange(v => !v)} style={overlayBtn(showOrange, 249,115,22, 0.20)}>
            🟠 Pending Restriction (CUPD)
          </button>

          <button onClick={() => setShowParcel(v => !v)} style={overlayBtn(showParcel, 255,235,59, 0.13)}>
            🟡 SD Parcels{showParcel ? ' (zoom 14+)' : ''}
          </button>

        </div>
      </div>

      <div style={{ fontSize: '8px', color: '#334155', lineHeight: 1.5, paddingTop: 2 }}>
        <div style={{ color: '#22c55e' }}>🟢 IL · IH · IBT = by-right</div>
        <div style={{ color: '#86efac' }}>🟩 CR = typically permitted (CUP)</div>
        <div style={{ color: '#ef4444' }}>🔴 Prime Ind. · IP = banned</div>
        <div style={{ color: '#f97316' }}>🟠 CUPD = pending 2026 restr.</div>
      </div>
    </div>
  )
}
