import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import PropertyDrawer from './PropertyDrawer.jsx'
import PropertyDetail from './PropertyDetail.jsx'
import { db } from '../firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'
import MapControls from './MapControls.jsx'

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
  const logoName = getLogoName(prop)
  const [logoErr, setLogoErr] = useState(false)
  const showLogo = logoName && !logoErr

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
            <img src={LOGO_URLS[logoName]}
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
  const greenLayerRef = useRef(null)
  const cupLayerRef = useRef(null)
  const redLayerRef = useRef(null)
  const zoneBannedLayerRef = useRef(null)
  const sanMarcosCupLayerRef = useRef(null)
  const sanMarcosBannedLayerRef = useRef(null)
  const ipLayerRef = useRef(null)
  const orangeLayerRef = useRef(null)
  const elcajonCupLayerRef = useRef(null)
  const elcajonRedLayerRef = useRef(null)
  const carlsbadCupLayerRef = useRef(null)
  const carlsbadRedLayerRef = useRef(null)
  const oceansideGreenLayerRef = useRef(null)
  const oceansideCupLayerRef = useRef(null)
  const oceansideRedLayerRef = useRef(null)
  const vistaGreenLayerRef = useRef(null)
  const vistaRedLayerRef = useRef(null)
  const [greenData, setGreenData] = useState(null)
  const [cupData, setCupData] = useState(null)
  const [redData, setRedData] = useState(null)
  const [zoneBannedData, setZoneBannedData] = useState(null)
  const [ipData, setIpData] = useState(null)
  const [orangeData, setOrangeData] = useState(null)
  const [sanMarcosCupData, setSanMarcosCupData] = useState(null)
  const [sanMarcosBannedData, setSanMarcosBannedData] = useState(null)
  const [elcajonCupData, setElcajonCupData] = useState(null)
  const [elcajonRedData, setElcajonRedData] = useState(null)
  const [carlsbadCupData, setCarlsbadCupData] = useState(null)
  const [carlsbadRedData, setCarlsbadRedData] = useState(null)
  const [oceansideGreenData, setOceansideGreenData] = useState(null)
  const [oceansideCupData, setOceansideCupData] = useState(null)
  const [oceansideRedData, setOceansideRedData] = useState(null)
  const [vistaGreenData, setVistaGreenData] = useState(null)
  const [vistaRedData, setVistaRedData] = useState(null)
  const [mapType, setMapType] = useState('dark')
  const [showParcel, setShowParcel] = useState(false)
  const [showGreen, setShowGreen] = useState(false)
  const [showCup, setShowCup] = useState(false)
  const [showRed, setShowRed] = useState(true)
  const [showPIL, setShowPIL] = useState(true)
  const [showZoneBanned, setShowZoneBanned] = useState(false)
  const [showOrange, setShowOrange] = useState(false)
  const [showSanMarcosCup, setShowSanMarcosCup] = useState(false)
  const [showSanMarcosBanned, setShowSanMarcosBanned] = useState(false)
  const [showElCajonCup, setShowElCajonCup] = useState(false)
  const [showElCajonRed, setShowElCajonRed] = useState(false)
  const [showCarlsbadCup, setShowCarlsbadCup] = useState(false)
  const [showCarlsbadRed, setShowCarlsbadRed] = useState(false)
  const [showOceansideGreen, setShowOceansideGreen] = useState(false)
  const [showOceansideCup, setShowOceansideCup] = useState(false)
  const [showOceansideRed, setShowOceansideRed] = useState(false)
  const [showVistaGreen, setShowVistaGreen] = useState(false)
  const [showVistaRed, setShowVistaRed] = useState(false)
  const showIndustrial = showRed
  const setShowIndustrial = setShowRed
  const [colorMode, setColorMode] = useState('status')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [leads, setLeads] = useState([])
  const [detailProp, setDetailProp] = useState(null)
  const [mapReady, setMapReady] = useState(false)

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

  // Load all overlay data
  useEffect(() => {
    fetch('/green_overlay.geojson').then(r => r.json()).then(setGreenData).catch(() => {})
    fetch('/green_cup.geojson').then(r => r.json()).then(setCupData).catch(() => {})
    fetch('/industrial_overlay.geojson').then(r => r.json()).then(setRedData).catch(() => {})
    fetch('/red_zonebanned.geojson').then(r => r.json()).then(setZoneBannedData).catch(() => {})
    fetch('/ip_zones.geojson').then(r => r.json()).then(setIpData).catch(() => {})
    fetch('/orange_overlay.geojson').then(r => r.json()).then(setOrangeData).catch(() => {})
    fetch('/elcajon_cup.geojson').then(r => r.json()).then(setElcajonCupData).catch(() => {})
    fetch('/elcajon_red.geojson').then(r => r.json()).then(setElcajonRedData).catch(() => {})
    fetch('/carlsbad_cup.geojson').then(r => r.json()).then(setCarlsbadCupData).catch(() => {})
    fetch('/carlsbad_red.geojson').then(r => r.json()).then(setCarlsbadRedData).catch(() => {})
    fetch('/oceanside_green.geojson').then(r => r.json()).then(setOceansideGreenData).catch(() => {})
    fetch('/oceanside_cup.geojson').then(r => r.json()).then(setOceansideCupData).catch(() => {})
    fetch('/oceanside_red.geojson').then(r => r.json()).then(setOceansideRedData).catch(() => {})
    fetch('/vista_green.geojson').then(r => r.json()).then(setVistaGreenData).catch(() => {})
    fetch('/vista_red.geojson').then(r => r.json()).then(setVistaRedData).catch(() => {})
  }, [])

  // Helper to render a data layer
  function renderLayer(layerRef, data, show, fill, stroke, fillOp) {
    const map = mapRef.current
    if (!map || !window.google) return
    if (layerRef.current) { layerRef.current.setMap(null); layerRef.current = null }
    if (!show || !data) return
    const layer = new window.google.maps.Data()
    layer.addGeoJson(data)
    layer.setStyle({ fillColor: fill, fillOpacity: fillOp, strokeColor: stroke, strokeWeight: 1.5, strokeOpacity: 0.75 })
    layer.setMap(map)
    layerRef.current = layer
  }

  useEffect(() => { renderLayer(greenLayerRef, greenData, showGreen, '#22c55e', '#16a34a', 0.30) }, [showGreen, greenData, mapReady])
  useEffect(() => { renderLayer(cupLayerRef, cupData, showCup, '#f97316', '#ea580c', 0.28) }, [showCup, cupData, mapReady])
  useEffect(() => { renderLayer(redLayerRef, redData, showRed, '#ef4444', '#dc2626', 0.32) }, [showRed, redData, mapReady])
  useEffect(() => { renderLayer(zoneBannedLayerRef, zoneBannedData, showRed, '#ef4444', '#dc2626', 0.28) }, [showRed, zoneBannedData, mapReady])
  useEffect(() => { renderLayer(ipLayerRef, ipData, showPIL, '#b91c1c', '#991b1b', 0.35) }, [showPIL, ipData, mapReady])
  useEffect(() => { renderLayer(orangeLayerRef, orangeData, showOrange, '#f472b6', '#ec4899', 0.30) }, [showOrange, orangeData, mapReady])
  useEffect(() => { renderLayer(sanMarcosCupLayerRef, sanMarcosCupData, showSanMarcosCup, '#f97316', '#ea580c', 0.30) }, [showSanMarcosCup, sanMarcosCupData, mapReady])
  useEffect(() => { renderLayer(sanMarcosBannedLayerRef, sanMarcosBannedData, showSanMarcosBanned, '#ef4444', '#dc2626', 0.30) }, [showSanMarcosBanned, sanMarcosBannedData, mapReady])
  useEffect(() => { renderLayer(elcajonCupLayerRef, elcajonCupData, showElCajonCup, '#f97316', '#ea580c', 0.28) }, [showElCajonCup, elcajonCupData, mapReady])
  useEffect(() => { renderLayer(elcajonRedLayerRef, elcajonRedData, showElCajonRed, '#ef4444', '#dc2626', 0.32) }, [showElCajonRed, elcajonRedData, mapReady])
  useEffect(() => { renderLayer(carlsbadCupLayerRef, carlsbadCupData, showCarlsbadCup, '#f97316', '#ea580c', 0.28) }, [showCarlsbadCup, carlsbadCupData, mapReady])
  useEffect(() => { renderLayer(carlsbadRedLayerRef, carlsbadRedData, showCarlsbadRed, '#ef4444', '#dc2626', 0.32) }, [showCarlsbadRed, carlsbadRedData, mapReady])
  useEffect(() => { renderLayer(oceansideGreenLayerRef, oceansideGreenData, showOceansideGreen, '#22c55e', '#16a34a', 0.30) }, [showOceansideGreen, oceansideGreenData, mapReady])
  useEffect(() => { renderLayer(oceansideCupLayerRef, oceansideCupData, showOceansideCup, '#f97316', '#ea580c', 0.28) }, [showOceansideCup, oceansideCupData, mapReady])
  useEffect(() => { renderLayer(oceansideRedLayerRef, oceansideRedData, showOceansideRed, '#ef4444', '#dc2626', 0.32) }, [showOceansideRed, oceansideRedData, mapReady])
  useEffect(() => { renderLayer(vistaGreenLayerRef, vistaGreenData, showVistaGreen, '#22c55e', '#16a34a', 0.30) }, [showVistaGreen, vistaGreenData, mapReady])
  useEffect(() => { renderLayer(vistaRedLayerRef, vistaRedData, showVistaRed, '#ef4444', '#dc2626', 0.32) }, [showVistaRed, vistaRedData, mapReady])

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

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
    setMapReady(true)
    if (window.google) map.setOptions({ styles: MAP_DARK_STYLE })
  }, [])

  // Pan to selected WITHOUT changing zoom
  useEffect(() => {
    if (selectedProperty && mapRef.current) {
      mapRef.current.panTo({ lat: selectedProperty.lat, lng: selectedProperty.lng })
    }
  }, [selectedProperty])

  // Stable initial options — never recreated so map never resets zoom/pan
  const [mapOptions] = useState({
    center: { lat: 32.78, lng: -117.1 },
    zoom: 10,
    mapTypeId: 'roadmap',
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    gestureHandling: 'greedy',
  })

  // Apply map style/type changes imperatively so zoom & pan are preserved
  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.google) return
    const typeId = mapType === 'aerial' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'roadmap'
    const styles = mapType === 'dark' ? MAP_DARK_STYLE : []
    map.setMapTypeId(typeId)
    map.setOptions({ styles })
  }, [mapType, mapReady])

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
          showGreen={showGreen} setShowGreen={setShowGreen}
          showCup={showCup} setShowCup={setShowCup}
          showRed={showRed} setShowRed={setShowRed}
          showZoneBanned={showZoneBanned} setShowZoneBanned={setShowZoneBanned}
          showOrange={showOrange} setShowOrange={setShowOrange}
          showPIL={showPIL} setShowPIL={setShowPIL}
          showParcel={showParcel} setShowParcel={setShowParcel}
          showIndustrial={showIndustrial} setShowIndustrial={setShowIndustrial}
          showElCajonCup={showElCajonCup} setShowElCajonCup={setShowElCajonCup}
          showElCajonRed={showElCajonRed} setShowElCajonRed={setShowElCajonRed}
          showCarlsbadCup={showCarlsbadCup} setShowCarlsbadCup={setShowCarlsbadCup}
          showCarlsbadRed={showCarlsbadRed} setShowCarlsbadRed={setShowCarlsbadRed}
          showOceansideGreen={showOceansideGreen} setShowOceansideGreen={setShowOceansideGreen}
          showOceansideCup={showOceansideCup} setShowOceansideCup={setShowOceansideCup}
          showOceansideRed={showOceansideRed} setShowOceansideRed={setShowOceansideRed}
          showVistaGreen={showVistaGreen} setShowVistaGreen={setShowVistaGreen}
          showVistaRed={showVistaRed} setShowVistaRed={setShowVistaRed}
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
                <Marker key={prop.id} prop={prop} colorMode={colorMode}
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
