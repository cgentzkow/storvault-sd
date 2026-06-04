import { useState, useEffect, useRef, useMemo } from 'react'

export const MAP_DARK_STYLE = [
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

const PARCEL_URL = 'https://gis-public.sandiegocounty.gov/arcgis/rest/services/Lots/MapServer/export'
const PARCEL_LAYERS = encodeURIComponent(JSON.stringify([{
  id: 0, source: { type: 'mapLayer', mapLayerId: 0 },
  drawingInfo: { renderer: { type: 'simple', symbol: {
    type: 'esriSFS', style: 'esriSFSNull',
    outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [255, 235, 59, 255], width: 1.5 }
  }}}
}]))

export function tile2mercBbox(x, y, z) {
  const n = Math.pow(2, z)
  const lonToMerc = lon => lon * 20037508.34 / 180
  const latToMerc = lat => Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180
  const tile2lng = x => x / n * 360 - 180
  const tile2lat = y => { const r = Math.PI - 2 * Math.PI * y / n; return 180 / Math.PI * Math.atan(0.5 * (Math.exp(r) - Math.exp(-r))) }
  const w = lonToMerc(tile2lng(x)), s = latToMerc(tile2lat(y + 1)), e = lonToMerc(tile2lng(x + 1)), nn = latToMerc(tile2lat(y))
  return `${w},${s},${e},${nn}`
}

export function useMapOverlays(mapRef, mapType, defaultIndustrial = false) {
  const parcelOverlayRef = useRef(null)
  const industrialLayerRef = useRef(null)
  const [industrialData, setIndustrialData] = useState(null)
  const [showParcel, setShowParcel] = useState(false)
  const [showIndustrial, setShowIndustrial] = useState(defaultIndustrial)

  useEffect(() => {
    fetch('/industrial_overlay.geojson').then(r => r.json()).then(setIndustrialData).catch(() => {})
  }, [])

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

  const mapOptions = useMemo(() => ({
    mapTypeId: mapType === 'aerial' ? 'satellite' : mapType === 'hybrid' ? 'hybrid' : 'roadmap',
    styles: mapType === 'dark' ? MAP_DARK_STYLE : (mapType === 'street' ? [] : undefined),
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
    gestureHandling: 'greedy',
  }), [mapType])

  return { showIndustrial, setShowIndustrial, showParcel, setShowParcel, mapOptions }
}
