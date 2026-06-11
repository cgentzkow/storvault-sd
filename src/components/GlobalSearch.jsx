import { useState, useEffect, useRef } from 'react'

const GMAPS_KEY = 'AIzaSyDL-wZEWHToMMlbCF2YybG4CC-20X3tpn4'

export default function GlobalSearch({ properties, onSelectProperty, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [placeResults, setPlaceResults] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const dropRef = useRef(null)

  // Load Google Places autocomplete
  useEffect(() => {
    if (!window.google || !inputRef.current) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (place?.geometry) {
        const addr = place.formatted_address || place.name
        setQuery(addr)
        setOpen(false)
        onNavigate?.({ type: 'address', address: addr, lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
      }
    })
    autocompleteRef.current = ac
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const q = query.toLowerCase()
    const matches = properties.filter(p =>
      (p.address||'').toLowerCase().includes(q) ||
      (p.name||'').toLowerCase().includes(q) ||
      (p.owner||'').toLowerCase().includes(q) ||
      (p.trueOwner||'').toLowerCase().includes(q) ||
      (p.parentCompany||'').toLowerCase().includes(q) ||
      (p.city||'').toLowerCase().includes(q) ||
      (p.submarket||'').toLowerCase().includes(q) ||
      (p.ownerContact||'').toLowerCase().includes(q)
    ).slice(0, 8)
    setResults(matches)
    setOpen(matches.length > 0 || query.length > 3)
  }, [query, properties])

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (!dropRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (prop) => {
    setQuery(prop.name || prop.address)
    setOpen(false)
    onSelectProperty?.(prop)
    onNavigate?.({ type: 'property', property: prop })
  }

  const STATUS_COLORS = { not_called:'#60a5fa', called:'#34d399', interested:'#f59e0b', not_interested:'#94a3b8', under_nda:'#a78bfa', listed:'#f87171' }

  return (
    <div ref={dropRef} style={{ position: 'relative', width: '320px' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => query && setOpen(true)}
          placeholder="Search properties, owners, addresses…"
          style={{ width: '100%', padding: '7px 10px 7px 32px', background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
        {query && <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
          style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>×</button>}
      </div>

      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'8px', zIndex:500, maxHeight:'360px', overflowY:'auto', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
          {results.map(p => (
            <div key={p.id} onClick={() => select(p)}
              style={{ padding:'10px 14px', borderBottom:'1px solid #0a0f1e', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='#1a2540'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{ fontSize:'13px', color:'#e2e8f0', fontWeight:600 }}>{p.name || p.address}</div>
                {p.name && <div style={{ fontSize:'11px', color:'#475569' }}>{p.address}</div>}
                <div style={{ fontSize:'11px', color:'#475569' }}>{p.city} · {p.submarket} · {p.sf > 0 ? `${(p.sf/1000).toFixed(0)}K SF` : ''}</div>
                {(p.trueOwner || p.owner) && <div style={{ fontSize:'11px', color:'#f59e0b' }}>{p.trueOwner || p.owner}</div>}
              </div>
              <span style={{ padding:'2px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:600, background:`${STATUS_COLORS[p.callStatus]||'#60a5fa'}20`, color:STATUS_COLORS[p.callStatus]||'#60a5fa', flexShrink:0, marginLeft:'8px' }}>
                {p.callStatus?.replace(/_/g,' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
