import { useState, useEffect } from 'react'

let mapsLoaded = false
let pendingCallbacks = []

function ensureMapsLoaded() {
  if (mapsLoaded || (typeof window !== 'undefined' && window.google)) {
    mapsLoaded = true
    return
  }
  if (document.querySelector('script[src*="maps.googleapis.com"]')) return
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDL-wZEWHToMMlbCF2YybG4CC-20X3tpn4&libraries=places,visualization`
  script.async = true
  script.onload = () => {
    mapsLoaded = true
    pendingCallbacks.forEach(cb => cb())
    pendingCallbacks = []
  }
  document.head.appendChild(script)
}

ensureMapsLoaded()

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(() => !!(typeof window !== 'undefined' && window.google))
  useEffect(() => {
    if (window.google) { setIsLoaded(true); return }
    const cb = () => setIsLoaded(true)
    pendingCallbacks.push(cb)
    return () => { pendingCallbacks = pendingCallbacks.filter(c => c !== cb) }
  }, [])
  return isLoaded
}
