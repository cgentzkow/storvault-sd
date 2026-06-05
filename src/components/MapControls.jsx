export default function MapControls({ mapType, setMapType, showParcel, setShowParcel, showGreen, setShowGreen, showCup, setShowCup, showRed, setShowRed, showZoneBanned, setShowZoneBanned, showOrange, setShowOrange, showIndustrial, setShowIndustrial }) {
  const redOn = showRed !== undefined ? showRed : showIndustrial
  const setRedOn = setShowRed || setShowIndustrial
  const mapBtn = (v) => ({ padding:'5px 9px',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,background:mapType===v?'#f59e0b':'#1e2d47',color:mapType===v?'#000':'#94a3b8'})
  const btn = (active,hex,r,g,b) => ({padding:'5px 9px',borderRadius:'5px',cursor:'pointer',fontSize:'10px',fontWeight:600,textAlign:'left',width:'100%',background:active?`rgba(${r},${g},${b},0.20)`:'#1e2d47',color:active?hex:'#94a3b8',border:active?`1px solid rgba(${r},${g},${b},0.40)`:'1px solid transparent'})
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
        <div style={{fontSize:'9px',color:'#475569',letterSpacing:'0.1em',marginBottom:'5px'}}>OVERLAYS</div>
        <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
          <button onClick={()=>setShowGreen&&setShowGreen(v=>!v)} style={btn(showGreen,'#4ade80',34,197,94)}>🟢 Storage OK — By-Right</button>
          <button onClick={()=>setShowCup&&setShowCup(v=>!v)} style={btn(showCup,'#86efac',134,239,172)}>🟩 Storage OK — CUP Required</button>
          <button onClick={()=>setRedOn(v=>!v)} style={btn(redOn,'#f87171',239,68,68)}>🔴 Prime Industrial Overlay</button>
          <button onClick={()=>setShowZoneBanned&&setShowZoneBanned(v=>!v)} style={btn(showZoneBanned,'#fca5a5',159,18,57)}>🟥 Zone-Banned</button>
          <button onClick={()=>setShowOrange&&setShowOrange(v=>!v)} style={btn(showOrange,'#fb923c',249,115,22)}>🟠 Pending Restriction</button>
          <button onClick={()=>setShowParcel(v=>!v)} style={btn(showParcel,'#fde047',255,235,59)}>🟡 SD Parcels{showParcel?' (zoom 14+)':''}</button>
        </div>
      </div>
      <div style={{fontSize:'8px',color:'#475569',lineHeight:1.65,paddingTop:2,borderTop:'1px solid #1e2d47',marginTop:2}}>
        <div style={{color:'#4ade80',marginBottom:1}}>
          🟢 <b>By-Right:</b><br/>
          <span style={{paddingLeft:8}}>City SD: IL·IH·IBT·CR·CC-4·5</span><br/>
          <span style={{paddingLeft:8}}>County: M50-M58·C36-C38</span><br/>
          <span style={{paddingLeft:8}}>Chula Vista: IL·ILP·IG·IP·I</span>
        </div>
        <div style={{color:'#86efac',marginBottom:1}}>🟩 <b>CUP:</b> Escondido M-1</div>
        <div style={{color:'#f87171',marginBottom:1}}>🔴 <b>Prime Ind.</b> overlay (City SD)</div>
        <div style={{color:'#fca5a5',marginBottom:1}}>
          🟥 <b>Banned:</b> City SD: IP·CC-1/2/3·CO<br/>
          <span style={{paddingLeft:8}}>County: C30-C35·C40-C46</span><br/>
          <span style={{paddingLeft:8}}>CV: commercial · Esc: M-2·I-P</span>
        </div>
        <div style={{color:'#fb923c'}}>🟠 CUPD corridor (pending 2026)</div>
      </div>
    </div>
  )
}
