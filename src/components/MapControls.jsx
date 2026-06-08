export default function MapControls({
  mapType, setMapType,
  showGreen, setShowGreen,
  showPureGreen, setShowPureGreen,
  showCup, setShowCup,
  showRed, setShowRed,
  showOrange, setShowOrange,
  showPIL, setShowPIL,
  showParcel, setShowParcel,
  showLocations, setShowLocations,
}) {
  const mapBtn=(v)=>({padding:'5px 9px',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,background:mapType===v?'#f59e0b':'#1e2d47',color:mapType===v?'#000':'#94a3b8'})
  const btn=(active,hex,r,g,b)=>({padding:'5px 9px',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,textAlign:'left',width:'100%',background:active?`rgba(${r},${g},${b},0.20)`:'#1e2d47',color:active?hex:'#94a3b8',border:active?`1px solid rgba(${r},${g},${b},0.40)`:'1px solid transparent'})
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>MAP STYLE</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px'}}>
          {[['dark','🌑 Dark'],['street','🗺 Street'],['aerial','🛰 Aerial'],['hybrid','🌐 Hybrid']].map(([v,l])=>(
            <button key={v} onClick={()=>setMapType(v)} style={mapBtn(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>ZONING LAYERS</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowGreen(v=>!v)} style={btn(showGreen,'#4ade80',34,197,94)}>
            🟢 Allowed by Right
          </button>
          <button onClick={()=>setShowPureGreen(v=>!v)} style={{...btn(showPureGreen,'#00ff88',0,255,136),fontSize:'10px'}}>
            ✨ Pure Green Only
          </button>
          <button onClick={()=>setShowCup(v=>!v)} style={btn(showCup,'#fb923c',249,115,22)}>
            🟠 CUP Required
          </button>
          <button onClick={()=>setShowRed(v=>!v)} style={btn(showRed,'#f87171',239,68,68)}>
            🔴 Zoning Prohibits
          </button>
          <button onClick={()=>setShowPIL(v=>!v)} style={btn(showPIL,'#fca5a5',185,28,28)}>
            🔻 Prime Industrial Overlay
          </button>
          <button onClick={()=>setShowOrange(v=>!v)} style={btn(showOrange,'#f9a8d4',244,114,182)}>
            <span style={{marginRight:4}}>●</span>Soon to be Banned (2026)
          </button>
          <button onClick={()=>setShowParcel(v=>!v)} style={btn(showParcel,'#fde047',255,235,59)}>
            🟡 SD Parcels{showParcel?' (zoom 14+)':''}
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>LOCATIONS</div>
        <button onClick={()=>setShowLocations(v=>!v)} style={{
          ...btn(showLocations,'#60a5fa',96,165,250),
          width:'100%',textAlign:'left',
        }}>
          {showLocations?'📍 Locations On':'📍 Locations Off'}
        </button>
      </div>

      <div style={{fontSize:'8px',color:'#475569',lineHeight:1.65,paddingTop:2,borderTop:'1px solid #1e2d47',marginTop:2}}>
        <div style={{color:'#4ade80',marginBottom:1}}>🟢 <b>By-Right</b> — SD · County · CV · Oceanside · Vista</div>
        <div style={{color:'#00ff88',marginBottom:1}}>✨ <b>Pure Green</b> — No red/PIL overlay on top</div>
        <div style={{color:'#fb923c',marginBottom:1}}>🟠 <b>CUP</b> — Escondido · El Cajon · Carlsbad · Oceanside · San Marcos</div>
        <div style={{color:'#f87171',marginBottom:1}}>🔴 <b>Banned</b> — Zone prohibits self-storage</div>
        <div style={{color:'#fca5a5',marginBottom:1}}>🔻 <b>PIL</b> — Prime Industrial Land Overlay</div>
        <div style={{color:'#f9a8d4'}}>● <b>Pending</b> — El Cajon Blvd / University Ave (2026)</div>
        <div style={{color:'#94a3b8',marginTop:3,fontStyle:'italic'}}>Click any zone for details</div>
      </div>
    </div>
  )
}
