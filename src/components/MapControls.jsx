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
  showMorenoValleyGreen, setShowMorenoValleyGreen,
  showMorenoValleyCup, setShowMorenoValleyCup,
  showMorenoValleyRed, setShowMorenoValleyRed,
  showCoronaCup, setShowCoronaCup,
  showCoronaRed, setShowCoronaRed,
  showMenifeeGreen, setShowMenifeeGreen,
  showMenifeeCup, setShowMenifeeCup,
  showMenifeeRed, setShowMenifeeRed,
  showTemeculaGreen, setShowTemeculaGreen,
  showTemeculaCup, setShowTemeculaCup,
  showTemeculaRed, setShowTemeculaRed,
  showJurupaValleyCup, setShowJurupaValleyCup,
  showJurupaValleyRed, setShowJurupaValleyRed,
  showMurrietaCup, setShowMurrietaCup,
  showMurrietaRed, setShowMurrietaRed,
  showHemetCup, setShowHemetCup,
  showHemetRed, setShowHemetRed,
  showIndioRed, setShowIndioRed,
  showPerrisGreen, setShowPerrisGreen,
  showPerrisCup, setShowPerrisCup,
  showPerrisRed, setShowPerrisRed,
  showEastvaleGreen, setShowEastvaleGreen,
  showEastvaleCup, setShowEastvaleCup,
  showEastvaleRed, setShowEastvaleRed,
  showLakeElsinoreGreen, setShowLakeElsinoreGreen,
  showLakeElsinoreCup, setShowLakeElsinoreCup,
  showLakeElsinoreRed, setShowLakeElsinoreRed,
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
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>MORENO VALLEY</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowMorenoValleyGreen(v=>!v)} style={btn(showMorenoValleyGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} Industrial (I) — By Right
          </button>
          <button onClick={()=>setShowMorenoValleyCup(v=>!v)} style={btn(showMorenoValleyCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} Community Commercial (CC) — CUP
          </button>
          <button onClick={()=>setShowMorenoValleyRed(v=>!v)} style={btn(showMorenoValleyRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} NC, VC, OC, O, P, LI, BP, BPX, OS (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>CORONA</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowCoronaCup(v=>!v)} style={btn(showCoronaCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} M-1 Light Manufacturing — CUP
          </button>
          <button onClick={()=>setShowCoronaRed(v=>!v)} style={btn(showCoronaRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} M-2, M-3, M-4, C-P, O-P, C-2, C-3 (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>MENIFEE</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowMenifeeGreen(v=>!v)} style={btn(showMenifeeGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} Heavy Industrial/Mfg (HI) — By Right
          </button>
          <button onClick={()=>setShowMenifeeCup(v=>!v)} style={btn(showMenifeeCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} Commercial Retail (CR), Business Park/Light Ind (BP) — CUP
          </button>
          <button onClick={()=>setShowMenifeeRed(v=>!v)} style={btn(showMenifeeRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} CO, EDC-NG/MB/CC/NR/SG (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>TEMECULA</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowTemeculaGreen(v=>!v)} style={btn(showTemeculaGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} SC, LI — By Right
          </button>
          <button onClick={()=>setShowTemeculaCup(v=>!v)} style={btn(showTemeculaCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} CC, BP — CUP
          </button>
          <button onClick={()=>setShowTemeculaRed(v=>!v)} style={btn(showTemeculaRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} NC, HT, PO (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>JURUPA VALLEY</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowJurupaValleyCup(v=>!v)} style={btn(showJurupaValleyCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} C-1/C-P, I-P, M-SC, M-M, M-H, R-VC — CUP/Site Dev Permit
          </button>
          <button onClick={()=>setShowJurupaValleyRed(v=>!v)} style={btn(showJurupaValleyRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} B-P, C-O, C-P-S, C-R (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>MURRIETA</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowMurrietaCup(v=>!v)} style={btn(showMurrietaCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} BP, GI, NC, CC — CUP Required
          </button>
          <button onClick={()=>setShowMurrietaRed(v=>!v)} style={btn(showMurrietaRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} GI-A, O, ORP, RC, INN, C/I (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>HEMET</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowHemetCup(v=>!v)} style={btn(showHemetCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} C-M, M-1, M-2 — CUP Required
          </button>
          <button onClick={()=>setShowHemetRed(v=>!v)} style={btn(showHemetRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} O-P, C-1, C-2, B-P (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>INDIO</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowIndioRed(v=>!v)} style={btn(showIndioRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} IL, IH, RC, RR, CN-14, CN-20, NC, MUN (Not Permitted)
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>PERRIS</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowPerrisGreen(v=>!v)} style={btn(showPerrisGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} LI, GI (Light/General Industrial) — By Right
          </button>
          <button onClick={()=>setShowPerrisCup(v=>!v)} style={btn(showPerrisCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} BP, PO (Business Park, Professional Office) — CUP
          </button>
          <button onClick={()=>setShowPerrisRed(v=>!v)} style={btn(showPerrisRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} CN, CC (Commercial Neighborhood/Community) — Not Permitted
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>EASTVALE</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowEastvaleGreen(v=>!v)} style={btn(showEastvaleGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} M-SC, M-M, M-H (Manufacturing) — By Right
          </button>
          <button onClick={()=>setShowEastvaleCup(v=>!v)} style={btn(showEastvaleCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} C-1/C-P, I-P, LI (Commercial, Industrial Park, Light Industrial) — CUP
          </button>
          <button onClick={()=>setShowEastvaleRed(v=>!v)} style={btn(showEastvaleRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} C-P-S, W-1 (Scenic Hwy Commercial, Watercourse/Conservation) — Not Permitted
          </button>
        </div>
      </div>

      <div>
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>LAKE ELSINORE</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowLakeElsinoreGreen(v=>!v)} style={btn(showLakeElsinoreGreen,'#4ade80',34,197,94)}>
            {swatch('#4ade80')} M-2 (General Manufacturing) — By Right
          </button>
          <button onClick={()=>setShowLakeElsinoreCup(v=>!v)} style={btn(showLakeElsinoreCup,'#f97316',249,115,22)}>
            {swatch('#f97316')} M-1, C-M (Limited Manufacturing, Commercial Manufacturing) — CUP
          </button>
          <button onClick={()=>setShowLakeElsinoreRed(v=>!v)} style={btn(showLakeElsinoreRed,'#f87171',239,68,68)}>
            {swatch('#ef4444')} C-1, C-2, C-O, C-P, CMU (Commercial, Office, Mixed Use) — Not Permitted
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
