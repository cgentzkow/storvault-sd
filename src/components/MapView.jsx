import { useState, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView, InfoWindow } from '@react-google-maps/api'
import PropertyDrawer from './PropertyDrawer.jsx'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'
const LIBRARIES = ['visualization']

const STATUS_COLORS = {
  not_called: '#60a5fa',
  called: '#34d399',
  interested: '#f59e0b',
  not_interested: '#94a3b8',
  under_nda: '#a78bfa',
  listed: '#f87171',
}

const MAP_STYLES = {
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#0d1526' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1526' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2d47' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d3f5e' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#040d1a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  ],
  street: [],
  aerial: null,
  hybrid: null,
}

function getMarkerColor(prop, colorMode) {
  if (colorMode === 'status') return STATUS_COLORS[prop.callStatus] || '#60a5fa'
  if (colorMode === 'owner') {
    const n = (prop.parentCompany || prop.owner || '').toLowerCase()
    if (n.includes('u-haul') || n.includes('uhaul')) return '#ef4444'
    if (['public storage', 'extra space', 'cubesmart', 'life storage', 'national storage'].some(r => n.includes(r))) return '#3b82f6'
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

function Marker({ prop, colorMode, onClick, isSelected }) {
  const color = getMarkerColor(prop, colorMode)
  const size = prop.sf > 100000 ? 14 : prop.sf > 60000 ? 11 : prop.sf > 30000 ? 9 : 7
  return (
    <OverlayView position={{ lat: prop.lat, lng: prop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={() => onClick(prop)} style={{ cursor: 'pointer', transform: 'translate(-50%,-50%)' }}>
        <svg width="24" height="24" style={{ overflow: 'visible' }}>
          {isSelected && <circle cx="12" cy="12" r={size + 5} fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />}
          {prop.forSale && <circle cx="12" cy="12" r={size + 3} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4,2" />}
          <circle cx="12" cy="12" r={size} fill={color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5" />
        </svg>
      </div>
    </OverlayView>
  )
}

export default function MapView({ properties, selectedProperty, setSelectedProperty, updateProperty, currentUser }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GMAPS_KEY, libraries: LIBRARIES })
  const mapRef = useRef(null)
  const [mapType, setMapType] = useState('dark')
  const [showParcelOverlay, setShowParcelOverlay] = useState(false)
  const [showIndustrialOverlay, setShowIndustrialOverlay] = useState(true)
  const [industrialData, setIndustrialData] = useState(null)
  const industrialLayerRef = useRef(null)
  const [colorMode, setColorMode] = useState('status')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [tooltip, setTooltip] = useState(null)

  const submarkets = [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort()

  const filteredProps = properties.filter(p => {
    if (filterStatus !== 'all' && p.callStatus !== filterStatus) return false
    if (filterSubmarket !== 'all' && p.submarket !== filterSubmarket) return false
    if (filterOwner !== 'all') {
      const n = (p.parentCompany || p.owner || '').toLowerCase()
      if (filterOwner === 'uhaul' && !(n.includes('u-haul') || n.includes('uhaul'))) return false
      if (filterOwner === 'reit' && !['public storage','extra space','cubesmart','life storage'].some(r => n.includes(r))) return false
      if (filterOwner === 'private' && ['u-haul','uhaul','public storage','extra space','cubesmart','life storage'].some(r => n.includes(r))) return false
    }
    return true
  })

  // Load industrial overlay geojson
  useEffect(() => {
    fetch('/industrial_overlay.geojson').then(r => r.json()).then(setIndustrialData).catch(() => {})
  }, [])

  // Manage industrial overlay on map
  useEffect(() => {
    const map = mapRef.current
    if (!map || !industrialData || !window.google) return
    if (industrialLayerRef.current) { industrialLayerRef.current.setMap(null) }
    if (!showIndustrialOverlay) return
    const layer = new window.google.maps.Data()
    layer.addGeoJson(industrialData)
    layer.setStyle({ fillColor: '#ef4444', fillOpacity: 0.18, strokeColor: '#ef4444', strokeWeight: 1, strokeOpacity: 0.4 })
    layer.setMap(map)
    industrialLayerRef.current = layer
  }, [showIndustrialOverlay, industrialData, mapRef.current])

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  const mapOptions = {
    center: { lat: 32.78, lng: -117.1 },
    zoom: 10,
    disableDefaultUI: false,
    mapTypeId: mapType === 'aerial' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'roadmap',
    styles: mapType === 'dark' ? MAP_STYLES.dark : mapType === 'street' ? [] : undefined,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  }

  // Pan to selected
  useEffect(() => {
    if (selectedProperty && mapRef.current) {
      mapRef.current.panTo({ lat: selectedProperty.lat, lng: selectedProperty.lng })
    }
  }, [selectedProperty])

  const btnStyle = (active, color) => ({
    padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600,
    background: active ? (color || '#f59e0b') : '#1e2d47',
    color: active ? (color ? '#fff' : '#000') : '#94a3b8',
  })

  const selStyle = { background: '#1e2d47', border: '1px solid #2d3f5e', borderRadius: '5px', color: '#e2e8f0', fontSize: '11px', padding: '5px 8px', width: '100%' }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left sidebar */}
      <div style={{ width: '190px', background: '#0d1526', borderRight: '1px solid #1e2d47', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flexShrink: 0 }}>
        
        {/* Map style */}
        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>MAP STYLE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {[['dark','🌑 Dark'],['street','🗺 Street'],['aerial','🛰 Aerial'],['hybrid','🌐 Hybrid']].map(([val,label]) => (
              <button key={val} onClick={() => setMapType(val)} style={btnStyle(mapType === val)}>{label}</button>
            ))}
          </div>
        </div>

        {/* Overlays */}
        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>OVERLAYS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button onClick={() => setShowIndustrialOverlay(v => !v)} style={{
              ...btnStyle(showIndustrialOverlay, '#ef4444'),
              background: showIndustrialOverlay ? 'rgba(239,68,68,0.2)' : '#1e2d47',
              color: showIndustrialOverlay ? '#f87171' : '#94a3b8',
              border: showIndustrialOverlay ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
              textAlign: 'left', fontSize: '10px',
            }}>🔴 Industrial Zones</button>
            <button onClick={() => setShowParcelOverlay(v => !v)} style={{
              ...btnStyle(showParcelOverlay, '#a78bfa'),
              background: showParcelOverlay ? 'rgba(167,139,250,0.2)' : '#1e2d47',
              color: showParcelOverlay ? '#a78bfa' : '#94a3b8',
              border: showParcelOverlay ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
              textAlign: 'left', fontSize: '10px',
            }}>🟣 SD Parcels</button>
          </div>
          <div style={{ fontSize: '9px', color: '#334155', marginTop: '5px', lineHeight: 1.4 }}>
            Red = No self-storage (City SD industrial)
          </div>
        </div>

        {/* Color by */}
        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>COLOR BY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[['status','Call Status'],['owner','Owner Type'],['size','Building Size']].map(([val,label]) => (
              <button key={val} onClick={() => setColorMode(val)} style={{ ...btnStyle(colorMode === val), textAlign: 'left', fontSize: '10px' }}>{label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>FILTER OWNER</div>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selStyle}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>FILTER STATUS</div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="all">All</option>
            <option value="not_called">Not Called</option>
            <option value="called">Called</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="under_nda">Under NDA</option>
            <option value="listed">Listed</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '5px' }}>SUBMARKET</div>
          <select value={filterSubmarket} onChange={e => setFilterSubmarket(e.target.value)} style={selStyle}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Legend */}
        {colorMode === 'status' && (
          <div>
            <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>LEGEND</div>
            {Object.entries(STATUS_COLORS).map(([k,c]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{k.replace(/_/g,' ')}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#475569', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #1e2d47' }}>
          <strong style={{ color: '#60a5fa' }}>{filteredProps.length}</strong> of {properties.length} properties
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {filteredProps.map(prop => (
              prop.lat && prop.lng ? (
                <Marker key={prop.id} prop={prop} colorMode={colorMode}
                  onClick={setSelectedProperty}
                  isSelected={selectedProperty?.id === prop.id} />
              ) : null
            ))}

            {/* SD Assessor parcel overlay via WMS */}
            {showParcelOverlay && window.google && (() => {
              // Parcel layer as WMS tile overlay
              return null // rendered via useEffect below
            })()}
          </GoogleMap>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
            Loading map…
          </div>
        )}
      </div>

      {/* Property Drawer */}
      {selectedProperty && (
        <PropertyDrawer currentUser={currentUser}
          property={properties.find(p => p.id === selectedProperty.id) || selectedProperty}
          onClose={() => setSelectedProperty(null)}
          updateProperty={updateProperty}
        />
      )}
    </div>
  )
}
