import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import { useMapOverlays } from '../hooks/useMapOverlays.js'
import MapControls from './MapControls.jsx'
import PropertyDetail from './PropertyDetail.jsx'

const STATUS_COLORS = {
  not_called:'#60a5fa', called:'#34d399', interested:'#f59e0b',
  not_interested:'#94a3b8', under_nda:'#a78bfa', listed:'#f87171', under_development:'#fb923c',
}

const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop','william warren','storquest','stor-quest','trojan storage','strategic storage']
const UHAUL = ['u-haul','uhaul']

function getLogoName(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (n.includes('public storage')) return 'Public Storage'
  if (n.includes('extra space')) return 'Extra Space Storage'
  if (n.includes('cubesmart')) return 'CubeSmart'
  if (n.includes('u-haul') || n.includes('uhaul')) return 'Uhaul'
  if (n.includes('national storage affiliates')) return 'National Storage Affiliates'
  if (n.includes('smartstop') || n.includes('strategic storage')) return 'SmartStop Self Storage'
  if (n.includes('simply self')) return 'Simply Self Storage'
  if (n.includes('life storage')) return 'Life Storage'
  if (n.includes('william warren') || n.includes('storquest') || n.includes('stor-quest')) return 'StorQuest Self Storage'
  if (n.includes('trojan storage')) return 'Trojan Storage'
  if (n.includes('insite') || n.includes('securespace')) return 'InSite Property Group'
  if (n.includes('san diego self storage')) return 'San Diego Self Storage'
  if (n.includes('miramar self storage')) return 'Miramar Self Storage'
  if (n.includes('caster') || n.includes('a-1 self storage') || n.includes('a-1 oceanside')) return 'The Caster Group'
  if (n.includes('baco properties')) return 'BACO Properties'
  if (n.includes('baranof')) return 'Baranof Holdings'
  if (n.includes('tierra corporation')) return 'Tierra Corporation'
  if (n.includes('danube properties')) return 'Danube Properties'
  if (n.includes('ezralow')) return 'The Ezralow Company'
  if (n.includes('westport properties')) return 'Westport Properties'
  if (n.includes('pacifica companies')) return 'Pacifica Companies'
  if (n.includes('price self storage')) return 'Price Self Storage'
  if (n.includes('ares management')) return 'Ares Management Corporation'
  if (n.includes('artemis real estate')) return 'Artemis Real Estate Partners'
  if (n.includes('blue vista')) return 'Blue Vista'
  if (n.includes('clear sky capital')) return 'Clear Sky Capital'
  if (n.includes('prime group')) return 'Prime Group Holdings'
  if (n.includes('merit hill')) return 'Merit Hill Capital'
  if (n.includes('encinitas self storage')) return 'Encinitas Self Storage'
  if (n.includes('greens global')) return 'Greens Global'
  if (n.includes('northwest building')) return 'Northwest Building, LLC'
  if (n.includes('sentry storage')) return 'Sentry Storage Solutions'
  if (n.includes('chicago capital funds')) return 'Chicago Capital Funds'
  if (n.includes('cbre investment')) return 'CBRE Investment Management'
  if (n.includes('floit')) return 'Dan Floit'
  return null
}
// Hardcoded direct logo URLs (by Firebase key — no scanning needed)
const LOGO_URLS = {
  'Public Storage':             'https://logos.gentz.co/logo/public_storage',
  'Extra Space Storage':        'https://logos.gentz.co/logo/extra-space-storage',
  'CubeSmart':                  'https://logos.gentz.co/logo/cubesmart',
  'Uhaul':                      'https://logos.gentz.co/logo/Uhaul',
  'National Storage Affiliates':'https://logos.gentz.co/logo/national-storage-affiliates',
  'SmartStop Self Storage':     'https://logos.gentz.co/logo/smartstop',
  'Simply Self Storage':        'https://logos.gentz.co/logo/simply-self-storage',
  'Life Storage':               'https://logos.gentz.co/logo/life-storage',
  'StorQuest Self Storage':     'https://logos.gentz.co/logo/storquest',
  'Trojan Storage':             'https://logos.gentz.co/logo/trojan-storage',
  'InSite Property Group':      'https://logos.gentz.co/logo/insite_property_group',
  'San Diego Self Storage':     'https://logos.gentz.co/logo/san_diego_self_storage',
  'Miramar Self Storage':       'https://logos.gentz.co/logo/miramar-self-storage',
  'The Caster Group':           'https://logos.gentz.co/logo/the_caster_group',
  'BACO Properties':            'https://logos.gentz.co/logo/baco-properties',
  'Baranof Holdings':           'https://logos.gentz.co/logo/baranof-holdings',
  'Tierra Corporation':         'https://logos.gentz.co/logo/tierra-corporation',
  'Danube Properties':          'https://logos.gentz.co/logo/danube-properties',
  'The Ezralow Company':        'https://logos.gentz.co/logo/ezralow',
  'Westport Properties':        'https://logos.gentz.co/logo/westport-properties',
  'Pacifica Companies':         'https://logos.gentz.co/logo/pacifica-companies',
  'Price Self Storage':         'https://logos.gentz.co/logo/price_self_storage',
  'Ares Management Corporation':'https://logos.gentz.co/logo/ares-management',
  'Artemis Real Estate Partners':'https://logos.gentz.co/logo/artemis-real-estate',
  'Blue Vista':                 'https://logos.gentz.co/logo/blue-vista',
  'Clear Sky Capital':          'https://logos.gentz.co/logo/clear-sky-capital',
  'Prime Group Holdings':       'https://logos.gentz.co/logo/prime_group_holdings',
  'Merit Hill Capital':         'https://logos.gentz.co/logo/merit_hill_capital',
  'Encinitas Self Storage':     'https://logos.gentz.co/logo/encinitas_self_storage',
  'Greens Global':              'https://logos.gentz.co/logo/greens_global',
  'Northwest Building, LLC':    'https://logos.gentz.co/logo/northwest_building',
  'Sentry Storage Solutions':   'https://logos.gentz.co/logo/sentry_storage',
  'Chicago Capital Funds':      'https://logos.gentz.co/logo/chicago_capital_funds',
  'CBRE Investment Management': 'https://logos.gentz.co/logo/cbre_investment',
  'Dan Floit':                  'https://logos.gentz.co/logo/dan_floit',
}

function LogoCell({ property }) {
  const [err, setErr] = useState(false)
  const logoName = getLogoName(property)
  if (!logoName || err) return null
  return <img src={LOGO_URLS[logoName]}
    onError={()=>setErr(true)} alt={logoName}
    style={{ height:'20px', maxWidth:'64px', objectFit:'contain', verticalAlign:'middle', marginLeft:'6px', flexShrink:0 }} />
}

function MapMarker({ prop, onClick, isSelected }) {
  const [logoErr, setLogoErr] = useState(false)
  const color = STATUS_COLORS[prop.callStatus]||'#60a5fa'
  const size = prop.sf > 100000 ? 14 : prop.sf > 60000 ? 11 : prop.sf > 30000 ? 9 : 7
  const logoName = getLogoName(prop)
  const showLogo = logoName && !logoErr
  return (
    <OverlayView position={{ lat: prop.lat, lng: prop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={() => onClick(prop)} title={prop.name||prop.address} style={{ cursor:'pointer', transform:'translate(-50%,-50%)' }}>
        {showLogo ? (
          <div style={{ width:`${size*2+8}px`, height:`${size*2+8}px`, borderRadius:'5px', background:'#fff', border:`2px solid ${isSelected?'#f59e0b':color}`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'2px', boxShadow: isSelected?'0 0 0 2px #f59e0b':'0 1px 3px rgba(0,0,0,0.5)' }}>
            <img src={LOGO_URLS[logoName]} onError={()=>setLogoErr(true)} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
        ) : (
          <svg width={size*2+4} height={size*2+4} style={{ overflow:'visible' }}>
            {isSelected && <circle cx={size+2} cy={size+2} r={size+4} fill="none" stroke="#f59e0b" strokeWidth="2"/>}
            <circle cx={size+2} cy={size+2} r={size} fill={color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5"/>
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
  const rows = [['Address','City','Owner','Phone','SF','Last Sale','Loan Maturity','Status','Submarket','Parcel'].join(',')]
  props.forEach(p => {
    const e = v => `"${String(v||'').replace(/"/g,'""')}"`
    rows.push([e(p.address),e(p.city),e(p.trueOwner||p.owner),e(p.ownerPhone),p.sf||'',e(p.lastSaleDate),e(p.loanMaturity),e(p.callStatus),e(p.submarket),e(p.parcel)].join(','))
  })
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})),download:`storvault-${new Date().toISOString().slice(0,10)}.csv`})
  a.click()
}

export default function PropertyList({ properties, selectedProperty, setSelectedProperty, updateProperty, currentUser }) {
  const isLoaded = useGoogleMaps()
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [filterMinSF, setFilterMinSF] = useState('')
  const [filterMaxSF, setFilterMaxSF] = useState('')
  const [listWidth, setListWidth] = useState(680)
  const [isDragging, setIsDragging] = useState(false)
  const [detailProp, setDetailProp] = useState(null)
  const [showMapControls, setShowMapControls] = useState(false)
  const [mapType, setMapType] = useState('dark')
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const { showIndustrial, setShowIndustrial, showParcel, setShowParcel, mapOptions } = useMapOverlays(mapRef, mapType, false)

  const submarkets = useMemo(() => [...new Set(properties.map(p=>p.submarket))].filter(Boolean).sort(), [properties])

  const filtered = useMemo(() => {
    let arr = [...properties]
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(p => [p.address,p.name,p.owner,p.trueOwner,p.city,p.submarket,p.parentCompany].some(v=>(v||'').toLowerCase().includes(s)))
    }
    if (filterStatus !== 'all') arr = arr.filter(p=>p.callStatus===filterStatus)
    if (filterSubmarket !== 'all') arr = arr.filter(p=>p.submarket===filterSubmarket)
    if (filterOwner !== 'all') arr = arr.filter(p=>{
      const n=(p.parentCompany||p.owner||'').toLowerCase()
      if (filterOwner==='uhaul') return UHAUL.some(k=>n.includes(k))
      if (filterOwner==='reit') return REITS.some(k=>n.includes(k))
      if (filterOwner==='private') return !REITS.some(k=>n.includes(k))&&!UHAUL.some(k=>n.includes(k))
      return true
    })
    if (filterMinSF) arr = arr.filter(p=>p.sf>=parseInt(filterMinSF))
    if (filterMaxSF) arr = arr.filter(p=>p.sf<=parseInt(filterMaxSF))
    return arr.sort((a,b)=>(b.sf||0)-(a.sf||0))
  }, [properties, search, filterOwner, filterStatus, filterSubmarket, filterMinSF, filterMaxSF])

  const onMapLoad = useCallback(m=>{ mapRef.current=m }, [])

  const onDragStart = useCallback((e) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = listWidth
    setIsDragging(true)
  }, [listWidth])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e) => {
      const delta = e.clientX - dragStartX.current
      setListWidth(Math.max(300, Math.min(900, dragStartWidth.current + delta)))
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  // Stable initial options — center/zoom only; style applied imperatively in useMapOverlays
  const fullMapOptions = { center: { lat: 32.78, lng: -117.1 }, zoom: 10, ...mapOptions }

  const inpStyle = { background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'6px', color:'#e2e8f0', padding:'6px 10px', fontSize:'12px' }
  const selStyle = { ...inpStyle, cursor:'pointer' }

  return (
    <div ref={containerRef} style={{ display:'flex', height:'100%', background:'#080d1a', userSelect: isDragging?'none':'auto' }}>

      {/* LEFT: Table */}
      <div style={{ width: listWidth, display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
        <div style={{ padding:'8px 12px', background:'#0d1526', borderBottom:'1px solid #1e2d47', display:'flex', gap:'7px', flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…" style={{ ...inpStyle, width:'160px' }} />
          <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)} style={selStyle}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={selStyle}>
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select value={filterSubmarket} onChange={e=>setFilterSubmarket(e.target.value)} style={selStyle}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input value={filterMinSF} onChange={e=>setFilterMinSF(e.target.value)} placeholder="Min SF" type="number" style={{ ...inpStyle, width:'70px' }} />
          <input value={filterMaxSF} onChange={e=>setFilterMaxSF(e.target.value)} placeholder="Max SF" type="number" style={{ ...inpStyle, width:'70px' }} />
          <div style={{ marginLeft:'auto', display:'flex', gap:'8px', alignItems:'center' }}>
            <span style={{ fontSize:'11px', color:'#475569' }}><strong style={{ color:'#60a5fa' }}>{filtered.length}</strong> of {properties.length}</span>
            <button onClick={()=>exportCSV(filtered)} style={{ padding:'5px 10px', background:'#1e2d47', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#34d399', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>⬇ CSV</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead style={{ position:'sticky', top:0, background:'#0a0f1e', zIndex:1 }}>
              <tr>
                <th style={{ width:'8px', padding:'8px 8px', borderBottom:'1px solid #1e2d47' }}/>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left' }}>ADDRESS / NAME</th>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left' }}>OWNER</th>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left' }}>SF</th>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left', whiteSpace:'nowrap' }}>LAST SALE</th>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left', whiteSpace:'nowrap' }}>LOAN MAT.</th>
                <th style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSelected = selectedProperty?.id === p.id
                const statusColor = STATUS_COLORS[p.callStatus]||'#60a5fa'
                const loanWarn = p.loanMaturity && p.loanMaturity!=='nan' && new Date(p.loanMaturity) < new Date(Date.now()+1000*60*60*24*365*2)
                return (
                  <tr key={p.id}
                    onClick={() => { setSelectedProperty(isSelected?null:p); if(!isSelected&&p.lat) mapRef.current?.panTo({lat:p.lat,lng:p.lng}) }}
                    onDoubleClick={() => setDetailProp(p)}
                    title="Click to highlight on map · Double-click for full detail"
                    style={{ cursor:'pointer', borderBottom:'1px solid #0f1929', background: isSelected?'#1a2540':'transparent' }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background='#111827' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=isSelected?'#1a2540':'transparent' }}>
                    <td style={{ padding:'7px 8px' }}>{p.forSale && <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#f87171' }}/>}</td>
                    <td style={{ padding:'7px 10px', maxWidth:'180px' }}>
                      <div style={{ fontWeight:500, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name||p.address}</div>
                      {p.name && <div style={{ color:'#475569', fontSize:'10px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.address}</div>}
                      <div style={{ color:'#334155', fontSize:'10px' }}>{p.city}</div>
                    </td>
                    <td style={{ padding:'7px 10px', maxWidth:'160px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ color:'#f59e0b', fontSize:'11px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{p.trueOwner||p.owner||'—'}</span>
                        <LogoCell property={p} />
                      </div>
                    </td>
                    <td style={{ padding:'7px 10px', color:'#94a3b8', whiteSpace:'nowrap' }}>{p.sf>0?p.sf.toLocaleString():'—'}</td>
                    <td style={{ padding:'7px 10px', color:'#64748b', fontSize:'11px', whiteSpace:'nowrap' }}>{p.lastSaleDate||'—'}</td>
                    <td style={{ padding:'7px 10px', color:loanWarn?'#f59e0b':'#64748b', fontSize:'11px', whiteSpace:'nowrap' }}>
                      {p.loanMaturity&&p.loanMaturity!=='nan'?p.loanMaturity:'—'}{loanWarn?' ⚠️':''}
                    </td>
                    <td style={{ padding:'7px 10px' }}>
                      <span style={{ padding:'2px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:600, background:`${statusColor}20`, color:statusColor, whiteSpace:'nowrap' }}>
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

      {/* Drag handle */}
      <div onMouseDown={onDragStart}
        style={{ width:'4px', background: isDragging?'#f59e0b':'#1e2d47', cursor:'col-resize', flexShrink:0, zIndex:10, transition: isDragging?'none':'background 0.15s' }} />

      {/* RIGHT: Map */}
      <div style={{ flex:1, position:'relative', minWidth:0 }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={{ width:'100%', height:'100%' }}
            options={fullMapOptions}
            onLoad={onMapLoad}>
            {filtered.map(prop => prop.lat && prop.lng ? (
              <MapMarker key={prop.id} prop={prop}
                onClick={p=>{ setSelectedProperty(p); mapRef.current?.panTo({lat:p.lat,lng:p.lng}) }}
                isSelected={selectedProperty?.id===prop.id} />
            ) : null)}
          </GoogleMap>
        ) : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#475569' }}>Loading map…</div>}

        {/* Floating Map Controls */}
        <div style={{ position:'absolute', top:'10px', right:'10px', zIndex:10 }}>
          <button
            onClick={() => setShowMapControls(v => !v)}
            style={{ padding:'6px 10px', background:'#0d1526cc', border:'1px solid #1e2d47', borderRadius:'6px', color:'#94a3b8', fontSize:'11px', cursor:'pointer', backdropFilter:'blur(4px)', marginBottom:'4px', display:'block', width:'100%' }}
          >🗺 Map {showMapControls ? '▲' : '▼'}</button>
          {showMapControls && (
            <div style={{ background:'#0d1526ee', border:'1px solid #1e2d47', borderRadius:'8px', padding:'10px', backdropFilter:'blur(4px)', minWidth:'160px' }}>
              <MapControls
                mapType={mapType} setMapType={setMapType}
                showIndustrial={showIndustrial} setShowIndustrial={setShowIndustrial}
                showParcel={showParcel} setShowParcel={setShowParcel}
              />
            </div>
          )}
        </div>

        {selectedProperty && (
          <div style={{ position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)', background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'10px', padding:'12px 16px', minWidth:'280px', maxWidth:'380px', zIndex:10, boxShadow:'0 4px 20px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
              <div>
                <div style={{ fontWeight:700, color:'#f8fafc', fontSize:'13px' }}>{selectedProperty.name||selectedProperty.address}</div>
                <div style={{ color:'#64748b', fontSize:'11px' }}>{selectedProperty.city} · {selectedProperty.submarket}</div>
              </div>
              <button onClick={()=>setSelectedProperty(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:'16px', padding:0, marginLeft:'12px' }}>×</button>
            </div>
            <div style={{ display:'flex', gap:'12px', fontSize:'11px', marginBottom:'10px' }}>
              {selectedProperty.sf>0&&<span style={{ color:'#60a5fa' }}>{selectedProperty.sf.toLocaleString()} SF</span>}
              {selectedProperty.trueOwner&&<span style={{ color:'#f59e0b' }}>{selectedProperty.trueOwner}</span>}
              {selectedProperty.lastSaleDate&&<span style={{ color:'#64748b' }}>{selectedProperty.lastSaleDate}</span>}
            </div>
            <button onClick={()=>setDetailProp(selectedProperty)} style={{ width:'100%', padding:'8px', background:'#f59e0b', border:'none', borderRadius:'6px', color:'#000', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>
              View Full Detail →
            </button>
          </div>
        )}
      </div>

      {detailProp && (
        <PropertyDetail property={properties.find(p=>p.id===detailProp.id)||detailProp}
          onClose={()=>setDetailProp(null)} updateProperty={updateProperty} currentUser={currentUser} />
      )}
    </div>
  )
}
