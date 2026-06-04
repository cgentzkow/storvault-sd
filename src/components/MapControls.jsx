export default function MapControls({ mapType, setMapType, showIndustrial, setShowIndustrial, showParcel, setShowParcel }) {
  const mapBtn = (v) => ({
    padding: '5px 9px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '10px', fontWeight: 600,
    background: mapType === v ? '#f59e0b' : '#1e2d47',
    color: mapType === v ? '#000' : '#94a3b8',
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
          <button onClick={() => setShowIndustrial(v => !v)} style={{
            padding: '5px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '10px', fontWeight: 600, textAlign: 'left',
            background: showIndustrial ? 'rgba(239,68,68,0.2)' : '#1e2d47',
            color: showIndustrial ? '#f87171' : '#94a3b8',
            border: showIndustrial ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
          }}>🔴 Industrial Zones</button>
          <button onClick={() => setShowParcel(v => !v)} style={{
            padding: '5px 9px', borderRadius: '5px', cursor: 'pointer', fontSize: '10px', fontWeight: 600, textAlign: 'left',
            background: showParcel ? 'rgba(255,235,59,0.15)' : '#1e2d47',
            color: showParcel ? '#fde047' : '#94a3b8',
            border: showParcel ? '1px solid rgba(255,235,59,0.3)' : '1px solid transparent',
          }}>🟡 SD Parcels{showParcel ? ' (zoom 14+)' : ''}</button>
        </div>
      </div>
    </div>
  )
}
