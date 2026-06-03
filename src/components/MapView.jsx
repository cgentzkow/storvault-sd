import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PropertyDrawer from './PropertyDrawer.jsx'

const STATUS_COLORS = {
  not_called: '#60a5fa',
  called: '#34d399',
  interested: '#f59e0b',
  not_interested: '#94a3b8',
  under_nda: '#a78bfa',
  listed: '#f87171',
}

const OWNER_COLORS = {
  uhaul: '#ef4444',
  reit: '#3b82f6',
  private: '#f59e0b',
}

function getMarkerColor(prop, colorMode) {
  if (colorMode === 'status') return STATUS_COLORS[prop.callStatus] || '#60a5fa'
  if (colorMode === 'owner') return OWNER_COLORS[prop.ownerType] || '#f59e0b'
  if (colorMode === 'size') {
    if (prop.sf > 100000) return '#ef4444'
    if (prop.sf > 60000) return '#f59e0b'
    if (prop.sf > 30000) return '#34d399'
    return '#60a5fa'
  }
  return STATUS_COLORS[prop.callStatus] || '#60a5fa'
}

function createSVGIcon(color, sf, forSale) {
  const size = sf > 100000 ? 14 : sf > 60000 ? 11 : sf > 30000 ? 9 : 7
  const ring = forSale ? `<circle cx="12" cy="12" r="${size + 3}" fill="none" stroke="#f87171" stroke-width="2" stroke-dasharray="4,2"/>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    ${ring}
    <circle cx="12" cy="12" r="${size}" fill="${color}" fill-opacity="0.9" stroke="#fff" stroke-width="1.5"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function MapView({ properties, selectedProperty, setSelectedProperty, updateProperty }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const overlayLayerRef = useRef(null)
  const [showOverlay, setShowOverlay] = useState(true)
  const [colorMode, setColorMode] = useState('status')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')

  const submarkets = [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort()

  const filteredProps = properties.filter(p => {
    if (filterOwner !== 'all' && p.ownerType !== filterOwner) return false
    if (filterStatus !== 'all' && p.callStatus !== filterStatus) return false
    if (filterSubmarket !== 'all' && p.submarket !== filterSubmarket) return false
    return true
  })

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return
    const map = L.map(mapRef.current, {
      center: [32.78, -117.07],
      zoom: 10,
      zoomControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map)
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  // Load industrial overlay
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current)
      overlayLayerRef.current = null
    }
    if (!showOverlay) return

    fetch('/industrial_overlay.geojson')
      .then(r => r.json())
      .then(data => {
        const layer = L.geoJSON(data, {
          style: {
            fillColor: '#ef4444',
            fillOpacity: 0.18,
            color: '#ef4444',
            weight: 1,
            opacity: 0.4,
          }
        })
        layer.addTo(map)
        overlayLayerRef.current = layer
      })
      .catch(console.error)
  }, [showOverlay])

  // Update markers when properties or filters change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove all existing markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    filteredProps.forEach(prop => {
      if (!prop.lat || !prop.lng) return
      const color = getMarkerColor(prop, colorMode)
      const icon = createSVGIcon(color, prop.sf, prop.forSale)

      const marker = L.marker([prop.lat, prop.lng], { icon })
      const displayName = prop.name || prop.address
      const sfFmt = prop.sf > 0 ? `${(prop.sf / 1000).toFixed(0)}K SF` : ''
      
      marker.bindTooltip(`
        <div style="font-family:system-ui;padding:4px 0">
          <strong>${displayName}</strong><br/>
          <span style="color:#94a3b8">${prop.owner}</span><br/>
          <span style="color:#60a5fa">${sfFmt}${prop.city ? ` · ${prop.city}` : ''}</span>
          ${prop.forSale ? '<br/><span style="color:#f87171;font-weight:700">● FOR SALE</span>' : ''}
        </div>
      `, { direction: 'top', offset: [0, -8] })

      marker.on('click', () => setSelectedProperty(prop))
      marker.addTo(map)
      markersRef.current[prop.id] = marker
    })
  }, [filteredProps, colorMode])

  // Pan to selected property
  useEffect(() => {
    if (!selectedProperty || !mapInstanceRef.current) return
    mapInstanceRef.current.panTo([selectedProperty.lat, selectedProperty.lng], { animate: true })
  }, [selectedProperty])

  const btnStyle = (active) => ({
    padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600,
    background: active ? '#f59e0b' : '#1e2d47',
    color: active ? '#000' : '#94a3b8',
    transition: 'all 0.15s',
  })

  const selStyle = {
    background: '#1e2d47', border: '1px solid #2d3f5e', borderRadius: '5px',
    color: '#e2e8f0', fontSize: '11px', padding: '5px 8px', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left sidebar - filters */}
      <div style={{
        width: '220px', background: '#0d1526', borderRight: '1px solid #1e2d47',
        padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
        overflowY: 'auto', flexShrink: 0
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
            PRIME INDUSTRIAL OVERLAY
          </div>
          <button onClick={() => setShowOverlay(v => !v)} style={{
            ...btnStyle(showOverlay), width: '100%',
            background: showOverlay ? 'rgba(239,68,68,0.2)' : '#1e2d47',
            color: showOverlay ? '#f87171' : '#94a3b8',
            border: showOverlay ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
          }}>
            {showOverlay ? '🔴 Overlay ON' : '⚫ Overlay OFF'}
          </button>
          <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px', lineHeight: 1.4 }}>
            Red zones = No self-storage per City of SD Prime Industrial Land designation
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
            COLOR BY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[['status', 'Call Status'], ['owner', 'Owner Type'], ['size', 'Building Size']].map(([val, label]) => (
              <button key={val} onClick={() => setColorMode(val)} style={{ ...btnStyle(colorMode === val), textAlign: 'left' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
            FILTER OWNER
          </div>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selStyle}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
            FILTER STATUS
          </div>
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
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
            SUBMARKET
          </div>
          <select value={filterSubmarket} onChange={e => setFilterSubmarket(e.target.value)} style={{ ...selStyle, width: '100%' }}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Legend */}
        {colorMode === 'status' && (
          <div>
            <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>LEGEND</div>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#475569', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #1e2d47' }}>
          <strong style={{ color: '#60a5fa' }}>{filteredProps.length}</strong> of {properties.length} properties
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Property Drawer */}
      {selectedProperty && (
        <PropertyDrawer
          property={properties.find(p => p.id === selectedProperty.id) || selectedProperty}
          onClose={() => setSelectedProperty(null)}
          updateProperty={updateProperty}
        />
      )}
    </div>
  )
}
