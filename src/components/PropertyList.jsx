import { useState, useMemo, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import PropertyDetail from './PropertyDetail.jsx'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'
const LIBRARIES = ['visualization']

const STATUS_COLORS = {
  not_called:'#60a5fa', called:'#34d399', interested:'#f59e0b',
  not_interested:'#94a3b8', under_nda:'#a78bfa', listed:'#f87171', under_development:'#fb923c',
}
const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop']
const UHAUL = ['u-haul','uhaul']

function getLogoName(p) {
  const n = (p.parentCompany||p.trueOwner||p.owner||'').toLowerCase()
  if (n.includes('public storage')) return 'Public Storage'
  if (n.includes('extra space')) return 'Extra Space Storage'
  if (n.includes('cubesmart')) return 'CubeSmart'
  if (n.includes('life storage')) return 'Life Storage'
  if (n.includes('smartstop')) return 'SmartStop Self Storage'
  if (n.includes('u-haul')||n.includes('uhaul')) return 'U-Haul'
  return null
}

function LogoCell({ property }) {
  const [err, setErr] = useState(false)
  const logoName = getLogoName(property)
  if (!logoName || err) return null
  return (
    <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(logoName)}`}
      onError={() => setErr(true)} alt={logoName}
      style={{ height: '18px', maxWidth: '60px', objectFit: 'contain', verticalAlign: 'middle', marginLeft: '6px' }} />
  )
}

function MapMarker({ prop, onClick, isSelected }) {
  const [logoErr, setLogoErr] = useState(false)
  const color = STATUS_COLORS[prop.callStatus] || '#60a5fa'
  const size = prop.sf > 100000 ? 14 : prop.sf > 60000 ? 11 : prop.sf > 30000 ? 9 : 7
  const logoName = getLogoName(prop)
  const showLogo = logoName && !logoErr
  return (
    <OverlayView position={{ lat: prop.lat, lng: prop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={() => onClick(prop)} style={{ cursor: 'pointer', transform: 'translate(-50%,-50%)' }}>
        {showLogo ? (
          <div style={{ width: `${size*2+8}px`, height: `${size*2+8}px`, borderRadius: '5px', background: '#fff', border: `2px solid ${isSelected?'#f59e0b':color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '2px', boxShadow: isSelected ? '0 0 0 2px #f59e0b' : '0 1px 3px rgba(0,0,0,0.5)' }}>
            <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(logoName)}`} onError={() => setLogoErr(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <svg width={size*2+4} height={size*2+4} style={{ overflow:'visible' }}>
            {isSelected && <circle cx={size+2} cy={size+2} r={size+4} fill="none" stroke="#f59e0b" strokeWidth="2" />}
            <circle cx={size+2} cy={size+2} r={size} fill={color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </OverlayView>
  )
}

function fmt$(n) {
  if (!n) return '—'
  if (n>=1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n>=1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

function exportCSV(props) {
  const rows = [['Property Address','City','Zip','Property Name','SF','Submarket','True Owner','Owner Contact','Owner Phone','Lender','Loan Maturity','For Sale','Call Status','Parcel'].join(',')]
  props.forEach(p => {
    const esc = v => `"${String(v||'').replace(/"/g,'""')}"`
    rows.push([esc(p.address),esc(p.city),esc(p.zip),esc(p.name),p.sf||'',esc(p.submarket),esc(p.trueOwner||p.owner),esc(p.ownerContact),esc(p.ownerPhone),esc(p.lender),esc(p.loanMaturity),p.forSale?'Yes':'No',esc(p.callStatus),esc(p.parcel)].join(','))
  })
  const blob = new Blob([rows.join('\n')],{type:'text/csv'})
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`storvault-${new Date().toISOString().slice(0,10)}.csv`})
  a.click()
}

export default function PropertyList({ properties, selectedProperty, setSelectedProperty, updateProperty, currentUser }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GMAPS_KEY, libraries: LIBRARIES })
  const mapRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [filterMinSF, setFilterMinSF] = useState('')
  const [filterMaxSF, setFilterMaxSF] = useState('')
  const [sortBy, setSortBy] = useState('sf')
  const [sortDir, setSortDir] = useState('desc')
  const [mapWidth, setMapWidth] = useState(380)
  const [dragging, setDragging] = useState(false)
  const [detailProp, setDetailProp] = useState(null)

  const submarkets = useMemo(() => [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort(), [properties])

  const filtered = useMemo(() => {
    let arr = [...properties]
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(p => [p.address,p.name,p.owner,p.trueOwner,p.city,p.submarket,p.parentCompany].some(v => (v||'').toLowerCase().includes(s)))
    }
    if (filterStatus !== 'all') arr = arr.filter(p => p.callStatus === filterStatus)
    if (filterSubmarket !== 'all') arr = arr.filter(p => p.submarket === filterSubmarket)
    if (filterOwner !== 'all') arr = arr.filter(p => {
      const n = (p.parentCompany||p.owner||'').toLowerCase()
      if (filterOwner==='uhaul') return UHAUL.some(k=>n.includes(k))
      if (filterOwner==='reit') return REITS.some(k=>n.includes(k))
      if (filterOwner==='private') return !REITS.some(k=>n.includes(k)) && !UHAUL.some(k=>n.includes(k))
      return true
    })
    if (filterMinSF) arr = arr.filter(p => p.sf >= parseInt(filterMinSF))
    if (filterMaxSF) arr = arr.filter(p => p.sf <= parseInt(filterMaxSF))
    arr.sort((a,b) => {
      const av=a[sortBy]||0, bv=b[sortBy]||0
      if (typeof av==='string') return sortDir==='asc'?av.localeCompare(bv):bv.localeCompare(av)
      return sortDir==='asc'?(av-bv):(bv-av)
    })
    return arr
  }, [properties, search, sortBy, sortDir, filterOwner, filterStatus, filterSubmarket, filterMinSF, filterMaxSF])

  const onMapLoad = useCallback(map => { mapRef.current = map }, [])

  // Drag-to-resize
  const onDragStart = (e) => { e.preventDefault(); setDragging(true) }
  useMemo(() => {
    if (!dragging) return
    const onMove = (e) => { const x = e.clientX || (e.touches && e.touches[0].clientX); if (x) setMapWidth(Math.max(200, Math.min(800, x)) ) }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging])

  const handleSort = col => { if (sortBy===col) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortBy(col); setSortDir('desc') } }
  const th = (label, col) => <th onClick={() => handleSort(col)} style={{ padding:'8px 10px', fontSize:'10px', color: sortBy===col?'#f59e0b':'#475569', letterSpacing:'0.08em', cursor:'pointer', whiteSpace:'nowrap', userSelect:'none', borderBottom:'1px solid #1e2d47', textAlign:'left' }}>{label}{sortBy===col?(sortDir==='asc'?'↑':'↓'):''}</th>

  const inpStyle = { background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'6px', color:'#e2e8f0', padding:'6px 10px', fontSize:'12px' }

  return (
    <div style={{ display:'flex', height:'100%', background:'#080d1a' }}>
      {/* Map panel */}
      <div style={{ width: mapWidth, flexShrink:0, borderRight:'1px solid #1e2d47', position:'relative' }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={{ width:'100%', height:'100%' }}
            options={{ center:{lat:32.78,lng:-117.1}, zoom:10, mapTypeId:'roadmap', styles:[{featureType:'poi',stylers:[{visibility:'off'}]}], mapTypeControl:false, streetViewControl:false, fullscreenControl:false }}
            onLoad={onMapLoad}>
            {filtered.map(prop => prop.lat && prop.lng ? (
              <MapMarker key={prop.id} prop={prop} onClick={p => { setSelectedProperty(p); mapRef.current?.panTo({lat:p.lat,lng:p.lng}) }} isSelected={selectedProperty?.id===prop.id} />
            ) : null)}
          </GoogleMap>
        ) : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#475569' }}>Loading map…</div>}
      </div>

      {/* Drag handle */}
      <div onMouseDown={onDragStart} style={{ width:'4px', background: dragging?'#f59e0b':'#1e2d47', cursor:'col-resize', flexShrink:0, transition:'background 0.15s', zIndex:10 }} />

      {/* Table panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding:'8px 12px', background:'#0d1526', borderBottom:'1px solid #1e2d47', display:'flex', gap:'7px', flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{ ...inpStyle, width:'180px' }} />
          <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={{ ...inpStyle, cursor:'pointer' }}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ ...inpStyle, cursor:'pointer' }}>
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select value={filterSubmarket} onChange={e=>setFilterSubmarket(e.target.value)} style={{ ...inpStyle, cursor:'pointer' }}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input value={filterMinSF} onChange={e=>setFilterMinSF(e.target.value)} placeholder="Min SF" type="number" style={{ ...inpStyle, width:'70px' }} />
          <input value={filterMaxSF} onChange={e=>setFilterMaxSF(e.target.value)} placeholder="Max SF" type="number" style={{ ...inpStyle, width:'70px' }} />
          <div style={{ marginLeft:'auto', display:'flex', gap:'8px', alignItems:'center' }}>
            <span style={{ fontSize:'11px', color:'#475569' }}><strong style={{ color:'#60a5fa' }}>{filtered.length}</strong> of {properties.length}</span>
            <button onClick={() => exportCSV(filtered)} style={{ padding:'6px 12px', background:'#1e2d47', border:'1px solid #2d3f5e', borderRadius:'6px', color:'#34d399', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>⬇ Export CSV</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead style={{ position:'sticky', top:0, background:'#0a0f1e', zIndex:1 }}>
              <tr>
                <th style={{ width:'8px', padding:'8px 10px', borderBottom:'1px solid #1e2d47' }} />
                {th('ADDRESS / NAME','address')}
                {th('OWNER','trueOwner')}
                {th('PHONE','ownerPhone')}
                {th('SUBMARKET','submarket')}
                {th('SIZE ↓','sf')}
                {th('LAST SALE','lastSaleDate')}
                {th('LOAN MATURITY','loanMaturity')}
                {th('STATUS','callStatus')}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSelected = selectedProperty?.id === p.id
                const statusColor = STATUS_COLORS[p.callStatus]||'#60a5fa'
                const loanWarn = p.loanMaturity && p.loanMaturity!=='nan' && new Date(p.loanMaturity) < new Date(Date.now()+1000*60*60*24*365*2)
                return (
                  <tr key={p.id}
                    onClick={() => { setSelectedProperty(isSelected?null:p); if (!isSelected && p.lat) mapRef.current?.panTo({lat:p.lat,lng:p.lng}) }}
                    onDoubleClick={() => setDetailProp(p)}
                    title="Click to select · Double-click for full detail"
                    style={{ cursor:'pointer', borderBottom:'1px solid #0f1929', background: isSelected?'#1a2540':'transparent' }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background='#111827' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=isSelected?'#1a2540':'transparent' }}>
                    <td style={{ padding:'6px 10px' }}>{p.forSale && <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#f87171' }} />}</td>
                    <td style={{ padding:'6px 10px' }}>
                      <div style={{ display:'flex', alignItems:'center' }}>
                        <div>
                          <div style={{ color:'#e2e8f0', fontWeight:500 }}>{p.name||p.address}</div>
                          {p.name && <div style={{ color:'#475569', fontSize:'10px' }}>{p.address}</div>}
                          <div style={{ color:'#475569', fontSize:'10px' }}>{p.city}</div>
                        </div>
                        <LogoCell property={p} />
                      </div>
                    </td>
                    <td style={{ padding:'6px 10px' }}>
                      <div style={{ color:'#f59e0b', fontSize:'11px', fontWeight:600 }}>{p.trueOwner||p.owner||'—'}</div>
                      {p.ownerContact && <div style={{ color:'#64748b', fontSize:'10px' }}>{p.ownerContact}</div>}
                    </td>
                    <td style={{ padding:'6px 10px' }}>
                      {p.ownerPhone ? (
                        <div style={{ display:'flex', gap:'4px' }}>
                          <a href={`tel:${p.ownerPhone}`} onClick={e=>e.stopPropagation()} style={{ color:'#60a5fa', fontSize:'10px', textDecoration:'none', padding:'2px 6px', background:'#1e3a5f', borderRadius:'4px' }}>📞</a>
                          <a href={`sms:${p.ownerPhone}`} onClick={e=>e.stopPropagation()} style={{ color:'#34d399', fontSize:'10px', textDecoration:'none', padding:'2px 6px', background:'#1a3a2a', borderRadius:'4px' }}>💬</a>
                          <span style={{ color:'#64748b', fontSize:'10px', alignSelf:'center' }}>{p.ownerPhone}</span>
                        </div>
                      ) : <span style={{ color:'#334155', fontSize:'10px' }}>—</span>}
                    </td>
                    <td style={{ padding:'6px 10px', color:'#64748b', fontSize:'11px' }}>{p.submarket||'—'}</td>
                    <td style={{ padding:'6px 10px', color:'#94a3b8' }}>{p.sf>0?p.sf.toLocaleString():'—'}</td>
                    <td style={{ padding:'6px 10px', color:'#64748b', fontSize:'11px', whiteSpace:'nowrap' }}>{p.lastSaleDate||'—'}</td>
                    <td style={{ padding:'6px 10px', color:loanWarn?'#f59e0b':'#64748b', fontSize:'11px', whiteSpace:'nowrap' }}>{p.loanMaturity&&p.loanMaturity!=='nan'?p.loanMaturity:'—'}{loanWarn?' ⚠️':''}</td>
                    <td style={{ padding:'6px 10px' }}>
                      <span style={{ padding:'3px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:600, background:`${statusColor}20`, color:statusColor, whiteSpace:'nowrap' }}>
                        {p.callStatus?.replace(/_/g,' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Property Detail Modal */}
      {detailProp && (
        <PropertyDetail property={properties.find(p=>p.id===detailProp.id)||detailProp}
          onClose={() => setDetailProp(null)}
          updateProperty={updateProperty}
          currentUser={currentUser} />
      )}
    </div>
  )
}
