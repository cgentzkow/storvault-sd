import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import PropertyDrawer from './PropertyDrawer.jsx'
import PropertyDetail from './PropertyDetail.jsx'
import { db } from '../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import MapControls from './MapControls.jsx'
import { useLogoMap } from '../hooks/useLogoMap.js'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'

const PARCEL_URL = 'https://gis-public.sandiegocounty.gov/arcgis/rest/services/Lots/MapServer/export'
const PARCEL_LAYERS = encodeURIComponent(JSON.stringify([{
  id: 0, source: { type: 'mapLayer', mapLayerId: 0 },
  drawingInfo: { renderer: { type: 'simple', symbol: {
    type: 'esriSFS', style: 'esriSFSNull',
    outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [255, 235, 59, 255], width: 1.5 }
  }}}
}]))

const STATUS_COLORS = {
  not_called: '#60a5fa', called: '#34d399', interested: '#f59e0b',
  not_interested: '#94a3b8', under_nda: '#a78bfa', listed: '#f87171',
}

const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop','nsa ','stor-quest','storquest']
const UHAUL = ['u-haul','uhaul']

function classifyOwner(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (UHAUL.some(k => n.includes(k))) return 'uhaul'
  if (REITS.some(k => n.includes(k))) return 'reit'
  return 'private'
}

function getLogoName(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (n.includes('public storage')) return 'Public Storage'
  if (n.includes('extra space')) return 'Extra Space Storage'
  if (n.includes('cubesmart')) return 'CubeSmart'
  if (n.includes('life storage')) return 'Life Storage'
  if (n.includes('simply self')) return 'Simply Self Storage'
  if (n.includes('smartstop') || n.includes('strategic storage')) return 'SmartStop Self Storage'
  if (n.includes('national storage')) return 'National Storage Affiliates'
  if (n.includes('u-haul') || n.includes('uhaul')) return 'Uhaul'
  if (n.includes('william warren') || n.includes('storquest') || n.includes('stor-quest')) return 'StorQuest'
  if (n.includes('caster')) return 'The Caster Group'
  if (n.includes('trojan storage')) return 'Trojan Storage'
  if (n.includes('insite') || n.includes('securespace')) return 'InSite Property Group'
  return null
}

const LEAD_NEON = {
  active: '#00ffcc', interested: '#00ff66', under_nda: '#cc00ff',
  loi_sent: '#ff9900', dead: '#ff4444', closed: '#00ff99',
}
function LeadDot({ lead }) {
  const color = LEAD_NEON[lead.status] || '#00ffcc'
  if (!lead.lat || !lead.lng) return null
  return (
    <OverlayView position={{ lat: lead.lat, lng: lead.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div title={'LEAD: ' + lead.name} style={{ cursor: 'pointer', transform: 'translate(-50%,-50%)' }}>
        <svg width="22" height="22" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 4px ' + color + ')' }}>
          <circle cx="11" cy="11" r="9" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
          <circle cx="11" cy="11" r="5" fill={color} fillOpacity="0.95" />
        </svg>
      </div>
    </OverlayView>
  )
}

function getMarkerColor(prop, colorMode) {
  if (colorMode === 'status') return STATUS_COLORS[prop.callStatus] || '#60a5fa'
  if (colorMode === 'owner') {
    const cls = classifyOwner(prop)
    if (cls === 'uhaul') return '#ef4444'
    if (cls === 'reit') return '#3b82f6'
    return '#f59e0b'
  }
  if (colorMode === 'size') {
    if (prop.sf > 100000) return '#ef4444'
    if (prop.sf > 60000) return '#f59e0b'
    if (prop.sf > 30000) return '#34d399'
    return '#60a5fa'
  }
  return STATUS_COLORS[prop.callStatus] || '#60a5fa'
}

function tile2mercBbox(x, y, z) {
  const n = Math.pow(2, z)
  const lonToMerc = lon => lon * 20037508.34 / 180
  const latToMerc = lat => Math.log(Math.tan((90+lat)*Math.PI/360)) / (Math.PI/180) * 20037508.34 / 180
  const tile2lng = x => x/n*360-180
  const tile2lat = y => { const r=Math.PI-2*Math.PI*y/n; return 180/Math.PI*Math.atan(0.5*(Math.exp(r)-Math.exp(-r))) }
  const w=lonToMerc(tile2lng(x)), s=latToMerc(tile2lat(y+1)), e=lonToMerc(tile2lng(x+1)), nn=latToMerc(tile2lat(y))
  return `${w},${s},${e},${nn}`
}

function Marker({ prop, colorMode, onClick, isSelected, logoMap }) {
  const color = getMarkerColor(prop, colorMode)
  const size = prop.sf > 100000 ? 16 : prop.sf > 60000 ? 13 : prop.sf > 30000 ? 10 : 8
  const knownLogo = getLogoName(prop)
  const ownerName = prop.parentCompany || prop.trueOwner || prop.owner || null
  const logoName = knownLogo || (ownerName && logoMap?.get(ownerName) === true ? ownerName : null)
  const showLogo = !!logoName

  return (
    <OverlayView position={{ lat: prop.lat, lng: prop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={() => onClick(prop)} title={prop.name || prop.address}
        style={{ cursor: 'pointer', transform: 'translate(-50%,-50%)', position: 'relative' }}>
        {showLogo ? (
          <div style={{
            width: `${size*2+8}px`, height: `${size*2+8}px`,
            borderRadius: '6px', background: '#fff', border: `2px solid ${isSelected ? '#fff' : color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isSelected ? '0 0 0 3px white, 0 0 0 5px ' + color : '0 1px 4px rgba(0,0,0,0.5)',
            overflow: 'hidden', padding: '2px',
          }}>
            <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(logoName)}`}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <svg width={size*2+4} height={size*2+4} style={{ overflow: 'visible' }}>
            {isSelected && <circle cx={size+2} cy={size+2} r={size+5} fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />}
            {prop.forSale && <circle cx={size+2} cy={size+2} r={size+3} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4,2" />}
            <circle cx={size+2} cy={size+2} r={size} fill={color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </OverlayView>
  )
}

const MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1526' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1526' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2d47' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d3f5e' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040d1a' }] },
]

export default function MapView({ properties, selectedProperty, setSelectedProperty, updateProperty, currentUser }) {
  const isLoaded = useGoogleMaps()
  const mapRef = useRef(null)
  const parcelOverlayRef = useRef(null)
  const industrialLayerRef = useRef(null)
  const [industrialData, setIndustrialData] = useState(null)
  const [mapType, setMapType] = useState('dark')
  const [showParcel, setShowParcel] = useState(false)
  const [showIndustrial, setShowIndustrial] = useState(true)
  const [colorMode, setColorMode] = useState('status')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [leads, setLeads] = useState([])
  const [detailProp, setDetailProp] = useState(null)
  const ownerNames = useMemo(() => [...new Set(properties.map(p => p.parentCompany || p.trueOwner || p.owner).filter(Boolean))], [properties.length])
  const logoMap = useLogoMap(ownerNames)

  // Fetch leads from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storvault_leads'), snap => {
      setLeads(snap.docs.map(d => ({ _docId: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  // Geocode leads missing lat/lng once maps is ready
  useEffect(() => {
    if (!isLoaded || !window.google) return
    const needsGeo = leads.filter(l => !l.lat || !l.lng)
    if (!needsGeo.length) return
    const geocoder = new window.google.maps.Geocoder()
    needsGeo.forEach(lead => {
      const q = [lead.address || lead.name, lead.city, 'CA'].filter(Boolean).join(', ')
      if (!q.trim()) return
      geocoder.geocode({ address: q }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location
          setLeads(prev => prev.map(l =>
            l._docId === lead._docId ? { ...l, lat: loc.lat(), lng: loc.lng() } : l
          ))
        }
      })
    })
  }, [leads.length, isLoaded])

  const submarkets = useMemo(() => [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort(), [properties])

  const filteredProps = useMemo(() => properties.filter(p => {
    if (filterStatus !== 'all' && p.callStatus !== filterStatus) return false
    if (filterSubmarket !== 'all' && p.submarket !== filterSubmarket) return false
    if (filterOwner !== 'all') {
      const cls = classifyOwner(p)
      if (filterOwner === 'uhaul' && cls !== 'uhaul') return false
      if (filterOwner === 'reit' && cls !== 'reit') return false
      if (filterOwner === 'private' && cls !== 'private') return false
    }
    return true
  }), [properties, filterStatus, filterSubmarket, filterOwner])

  useEffect(() => {
    fetch('/industrial_overlay.geojson').then(r => r.json()).then(setIndustrialData).catch(() => {})
  }, [])

  // Industrial overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map || !industrialData || !window.google) return
    if (industrialLayerRef.current) industrialLayerRef.current.setMap(null)
    if (!showIndustrial) return
    const layer = new window.google.maps.Data()
    layer.addGeoJson(industrialData)
    layer.setStyle({ fillColor: '#ef4444', fillOpacity: 0.18, strokeColor: '#ef4444', strokeWeight: 1, strokeOpacity: 0.4 })
    layer.setMap(map)
    industrialLayerRef.current = layer
  }, [showIndustrial, industrialData, mapRef.current])

  // Parcel overlay — using SD County ArcGIS exactly like Atlas
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.google) return
    if (parcelOverlayRef.current) {
      const arr = map.overlayMapTypes.getArray()
      const idx = arr.indexOf(parcelOverlayRef.current)
      if (idx > -1) map.overlayMapTypes.removeAt(idx)
      parcelOverlayRef.current = null
    }
    if (!showParcel) return
    const overlay = new window.google.maps.ImageMapType({
      name: 'Parcels',
      tileSize: new window.google.maps.Size(256, 256),
      maxZoom: 21, minZoom: 14, opacity: 1.0,
      getTileUrl: (coord, zoom) => {
        if (zoom < 14) return null
        const bbox = tile2mercBbox(coord.x, coord.y, zoom)
        return `${PARCEL_URL}?bbox=${bbox}&size=256,256&imageSR=3857&bboxSR=3857&format=png32&transparent=true&f=image&dynamicLayers=${PARCEL_LAYERS}`
      }
    })
    map.overlayMapTypes.push(overlay)
    parcelOverlayRef.current = overlay
  }, [showParcel, mapRef.current])

  const onMapLoad = useCallback((map) => { mapRef.current = map }, [])

  // Pan to selected WITHOUT changing zoom
  useEffect(() => {
    if (selectedProperty && mapRef.current) {
      mapRef.current.panTo({ lat: selectedProperty.lat, lng: selectedProperty.lng })
    }
  }, [selectedProperty])

  const mapOptions = useMemo(() => ({
    center: { lat: 32.78, lng: -117.1 },
    zoom: 10,
    mapTypeId: mapType === 'aerial' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'roadmap',
    styles: mapType === 'dark' ? MAP_DARK_STYLE : mapType === 'street' ? [] : undefined,
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    gestureHandling: 'greedy',
  }), [mapType])

  const btnStyle = (active, accent) => ({
    padding: '5px 9px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '10px', fontWeight: 600, transition: 'all 0.15s',
    background: active ? (accent || '#f59e0b') : '#1e2d47',
    color: active ? (accent ? '#fff' : '#000') : '#94a3b8',
  })
  const selStyle = { background: '#1e2d47', border: '1px solid #2d3f5e', borderRadius: '5px', color: '#e2e8f0', fontSize: '11px', padding: '5px 7px', width: '100%' }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: '185px', background: '#0d1526', borderRight: '1px solid #1e2d47', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flexShrink: 0 }}>

        <MapControls
          mapType={mapType} setMapType={setMapType}
          showIndustrial={showIndustrial} setShowIndustrial={setShowIndustrial}
          showParcel={showParcel} setShowParcel={setShowParcel}
        />

        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>COLOR BY</div>
          {[['status','Call Status'],['owner','Owner Type'],['size','Building Size']].map(([v,l]) => (
            <button key={v} onClick={() => setColorMode(v)} style={{ ...btnStyle(colorMode===v), display: 'block', width: '100%', textAlign: 'left', marginBottom: '3px', fontSize: '10px' }}>{l}</button>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '4px' }}>FILTER OWNER</div>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selStyle}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '4px' }}>FILTER STATUS</div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="all">All</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '4px' }}>SUBMARKET</div>
          <select value={filterSubmarket} onChange={e => setFilterSubmarket(e.target.value)} style={selStyle}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {colorMode === 'status' && (
          <div>
            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>LEGEND</div>
            {Object.entries(STATUS_COLORS).map(([k,c]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{k.replace(/_/g,' ')}</span>
              </div>
            ))}
          </div>
        )}
        {leads.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ffcc', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Leads ({leads.length})</span>
          </div>
        )}

        <div style={{ fontSize: '10px', color: '#475569', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #1e2d47' }}>
          <strong style={{ color: '#60a5fa' }}>{filteredProps.length}</strong> of {properties.length}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} options={mapOptions} onLoad={onMapLoad}>
            {filteredProps.map(prop => (
              prop.lat && prop.lng ? (
                <Marker key={prop.id} prop={prop} colorMode={colorMode} logoMap={logoMap}
                  onClick={setSelectedProperty} isSelected={selectedProperty?.id === prop.id} />
              ) : null
            ))}
            {leads.filter(l => l.lat && l.lng).map(lead => (
              <LeadDot key={lead._docId} lead={lead} />
            ))}
          </GoogleMap>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>Loading map…</div>
        )}
      </div>

      {selectedProperty && (
        <PropertyDrawer currentUser={currentUser}
          property={properties.find(p => p.id === selectedProperty.id) || selectedProperty}
          onClose={() => setSelectedProperty(null)}
          updateProperty={updateProperty}
          onViewDetail={(prop) => setDetailProp(prop)} />
      )}
      {detailProp && (
        <PropertyDetail property={properties.find(p => p.id === detailProp.id) || detailProp}
          onClose={() => setDetailProp(null)} updateProperty={updateProperty} currentUser={currentUser} />
      )}
    </div>
  )
}
