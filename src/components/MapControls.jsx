export default function MapControls({
  mapType, setMapType,
  showGreen, setShowGreen,
  showCup, setShowCup,
  showRed, setShowRed,
  showOrange, setShowOrange,
  showPIL, setShowPIL,
  showParcel, setShowParcel,
  showLocations, setShowLocations,
  showRiversideUnincorporatedCup, setShowRiversideUnincorporatedCup,
  showRiversideUnincorporatedRed, setShowRiversideUnincorporatedRed,
  showRiversideCityCup, setShowRiversideCityCup,
  showRiversideCityRed, setShowRiversideCityRed,
}) {
  const mapBtn=(v)=>({padding:'5px 9px',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,background:mapType===v?'#f59e0b':'#1e2d47',color:mapType===v?'#000':'#94a3b8'})

  const btn=(active,hex,r,g,b)=>({
    display:'flex',alignItems:'center',
    padding:'5px 9px',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,
    textAlign:'left',width:'100%',
    background:active?`rgba(${r},${g},${b},0.20)`:'#1e2d47',
    color:active?hex:'#94a3b8',
    border:active?`1px solid rgba(${r},${g},${b},0.40)`:'1px solid transparent'
  })

  const swatch=(color,extra)=>(
    <span style={{display:'inline-block',width:13,height:11,borderRadius:2,backgroundColor:color,marginRight:7,flexShrink:0,...extra}} />
  )

  const hatchSwatch=(
    <span style={{
      display:'inline-block',width:13,height:11,borderRadius:2,marginRight:7,flexShrink:0,
      background:'repeating-linear-gradient(45deg,rgba(220,38,38,0.85) 0px,rgba(220,38,38,0.85) 2px,transparent 2px,transparent 6px)',
      border:'1px solid #dc2626'
    }} />
  )

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
            {swatch('#4ade80')} Allowed
          </button>
          <button onClick={()=>setShowCup(v=>!v)} style={btn(showCup,'#f59e0b',245,158,11)}>
            {swatch('#f59e0b')} CUP
          </button>
          <button onClick={()=>setShowRed(v=>!v)} style={btn(showRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} Zoning Prohibits
          </button>
          <button onClick={()=>setShowPIL(v=>!v)} style={btn(showPIL,'#dc2626',220,38,38)}>
            {hatchSwatch} PIL
          </button>
          <button onClick={()=>setShowOrange(v=>!v)} style={btn(showOrange,'#f9a8d4',244,114,182)}>
            {swatch('#f9a8d4')} Ban Coming Soon
          </button>
          <button onClick={()=>setShowParcel(v=>!v)} style={btn(showParcel,'#fde047',253,224,71)}>
            {swatch('#fde047')} Parcels{showParcel?' (zoom 14+)':''}
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>RIVERSIDE COUNTY (UNINC.)</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowRiversideUnincorporatedCup(v=>!v)} style={btn(showRiversideUnincorporatedCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} C-1/C-P, I-P, M-SC/M-M/M-H (CUP/Plot Plan)
          </button>
          <button onClick={()=>setShowRiversideUnincorporatedRed(v=>!v)} style={btn(showRiversideUnincorporatedRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} C-P-S, C-R, C-O, C-T, MU, C/V (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>CITY OF RIVERSIDE</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowRiversideCityCup(v=>!v)} style={btn(showRiversideCityCup,'#f59e0b',245,158,11)}>
            {swatch('#f59e0b')} BMP/I/BMP-CS w/ CS Overlay (Design Review)
          </button>
          <button onClick={()=>setShowRiversideCityRed(v=>!v)} style={btn(showRiversideCityRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} CG/CR/CRC/O/BMP/I/MU (Not Permitted)
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
    </div>
  )
}
