import { useState, useEffect, useRef, useCallback } from 'react'
import { GoogleMap, StreetViewPanorama } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import { db } from '../firebase.js'
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'

const STATUS_OPTIONS = [
  { value: 'not_called', label: 'Not Called', color: '#60a5fa' },
  { value: 'called', label: 'Called', color: '#34d399' },
  { value: 'interested', label: 'Interested 🔥', color: '#f59e0b' },
  { value: 'not_interested', label: 'Not Interested', color: '#94a3b8' },
  { value: 'under_nda', label: 'Under NDA', color: '#a78bfa' },
  { value: 'listed', label: 'Listed / Active', color: '#f87171' },
  { value: 'under_development', label: '🏗 Under Development', color: '#fb923c' },
]
const NOTE_TYPES = [
  { id: 'call', label: '📞 Call' }, { id: 'note', label: '📝 Note' },
  { id: 'email', label: '📧 Email' }, { id: 'meeting', label: '🤝 Meeting' },
  { id: 'voicemail', label: '📱 Voicemail' },
]
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }
function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

function ContactButtons({ phone, email, name }) {
  if (!phone && !email) return null
  return (
    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
      {phone && <>
        <a href={`tel:${phone}`} style={{ padding: '4px 10px', background: '#1e3a5f', border: '1px solid #2d5a8e', borderRadius: '5px', color: '#60a5fa', fontSize: '11px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>📞 Call</a>
        <a href={`sms:${phone}`} style={{ padding: '4px 10px', background: '#1a3a2a', border: '1px solid #2d5e40', borderRadius: '5px', color: '#34d399', fontSize: '11px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>💬 Text</a>
      </>}
      {email && <a href={`mailto:${email}${name ? `?subject=Regarding ${name}` : ''}`} style={{ padding: '4px 10px', background: '#2a1a3a', border: '1px solid #5e2d8e', borderRadius: '5px', color: '#a78bfa', fontSize: '11px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>✉️ Email</a>}
    </div>
  )
}

// Photo panel — paste or click to upload, saves to Firestore
function PhotoPanel({ propId, heroPhoto, onSave }) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onSave(e.target.result)
    reader.readAsDataURL(file)
  }

  // Paste from clipboard (Cmd+V anywhere in panel)
  const onPaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        processFile(item.getAsFile())
        return
      }
    }
  }, [onSave])

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  if (heroPhoto) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
        <img src={heroPhoto} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
          <button onClick={() => fileRef.current.click()}
            style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.7)', border: '1px solid #475569', borderRadius: '5px', color: '#e2e8f0', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
            📷 Replace
          </button>
          <button onClick={() => onSave(null)}
            style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.7)', border: '1px solid #475569', borderRadius: '5px', color: '#f87171', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
            ✕ Remove
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
      onClick={() => fileRef.current.click()}
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer',
        background: dragging ? '#1a2d4a' : '#080d1a',
        border: `2px dashed ${dragging ? '#60a5fa' : '#1e2d47'}`,
        borderRadius: '4px', transition: 'all 0.15s',
      }}>
      <div style={{ fontSize: '32px' }}>📷</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Add a property photo</div>
      <div style={{ fontSize: '11px', color: '#334155', textAlign: 'center', lineHeight: 1.5 }}>
        Click to upload · Drag & drop<br/>or <strong style={{ color: '#60a5fa' }}>⌘V</strong> to paste a screenshot
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => processFile(e.target.files[0])} />
    </div>
  )
}

export default function PropertyDetail({ property, onClose, updateProperty, currentUser }) {
  const isLoaded = useGoogleMaps()
  const [view, setView] = useState('satellite') // satellite | street | photo
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('call')
  const [notes, setNotes] = useState([])
  const [heroPhoto, setHeroPhoto] = useState(property.heroPhoto || null)
  const p = property
  const propId = String(p.id)
  const statusOpt = STATUS_OPTIONS.find(s => s.value === p.callStatus) || STATUS_OPTIONS[0]

  // Auto-switch to photo tab if photo exists
  useEffect(() => {
    if (property.heroPhoto) {
      setHeroPhoto(property.heroPhoto)
    }
  }, [property.heroPhoto])

  useEffect(() => {
    const q = query(collection(db, 'gentz_notes'), where('linkedProperties', 'array-contains', propId))
    const unsub = onSnapshot(q, snap => {
      setNotes(snap.docs.map(d => ({ _docId: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||'')))
    })
    return () => unsub()
  }, [propId])

  const savePhoto = async (dataUrl) => {
    setHeroPhoto(dataUrl)
    if (dataUrl) setView('photo')
    // Save to Firestore property document
    try {
      await updateDoc(doc(db, 'storvault_properties', propId), { heroPhoto: dataUrl || '' })
    } catch (e) {
      // Also update via updateProperty for local state
    }
    updateProperty(p.id, { heroPhoto: dataUrl || null })
  }

  const addNote = async () => {
    if (!note.trim()) return
    await addDoc(collection(db, 'gentz_notes'), {
      id: uid(), text: note.trim(), type: noteType,
      author: currentUser?.name || 'Unknown', authorId: currentUser?.id || 'U',
      timestamp: new Date().toISOString(), source: 'storvault',
      linkedProperties: [propId],
      linkedLeads: [], linkedDeals: [], linkedProjects: [], linkedTenants: [], linkedContacts: [],
    })
    if (noteType === 'call') {
      const callLog = [...(p.callLog||[]), { date: new Date().toISOString().split('T')[0], note: note.trim(), status: p.callStatus }]
      updateProperty(p.id, { callLog })
    }
    setNote('')
  }
  const deleteNote = async (docId) => { await deleteDoc(doc(db, 'gentz_notes', docId)) }

  const position = { lat: p.lat, lng: p.lng }
  const typeIco = { call:'📞', note:'📝', email:'📧', meeting:'🤝', voicemail:'📱' }

  const row = (label, val, color) => val && val !== 'nan' && val !== '—' ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1a2540' }}>
      <span style={{ color: '#475569', fontSize: '11px' }}>{label}</span>
      <span style={{ color: color || '#e2e8f0', fontSize: '11px', fontWeight: color ? 600 : 400, maxWidth: '55%', textAlign: 'right' }}>{val}</span>
    </div>
  ) : null

  const tabBtn = (v, label) => (
    <button key={v} onClick={() => setView(v)} style={{
      padding: '5px 12px', border: 'none', borderRadius: '5px', cursor: 'pointer',
      fontSize: '11px', fontWeight: 700,
      background: view === v ? '#f59e0b' : '#1e2d47',
      color: view === v ? '#000' : '#94a3b8',
    }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '12px', width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2d47', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a1122', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{p.name || p.address}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{p.name ? p.address + ', ' : ''}{p.city}, CA {p.zip}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={p.callStatus} onChange={e => updateProperty(p.id, { callStatus: e.target.value })}
              style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${statusOpt.color}`, background: `${statusOpt.color}22`, color: statusOpt.color, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={onClose} style={{ background: '#1e2d47', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px', padding: '6px 12px', fontSize: '13px' }}>✕ Close</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: Map / Photo */}
          <div style={{ width: '55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e2d47', flexShrink: 0 }}>
            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', background: '#080d1a', borderBottom: '1px solid #1e2d47', alignItems: 'center' }}>
              {tabBtn('satellite', '🛰 Aerial')}
              {tabBtn('street', '🚶 Street View')}
              <button onClick={() => setView('photo')} style={{
                padding: '5px 12px', border: heroPhoto ? '1px solid #f59e0b44' : 'none',
                borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                background: view === 'photo' ? '#f59e0b' : heroPhoto ? '#1e2d4799' : '#1e2d47',
                color: view === 'photo' ? '#000' : heroPhoto ? '#f59e0b' : '#94a3b8',
              }}>
                {heroPhoto ? '📷 Photo ✓' : '📷 Photo'}
              </button>
              {view !== 'photo' && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer"
                  style={{ marginLeft: 'auto', padding: '5px 12px', background: '#1e2d47', border: 'none', borderRadius: '5px', color: '#60a5fa', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                  🗺 Open in Maps
                </a>
              )}
            </div>

            {/* View area */}
            <div style={{ flex: 1, position: 'relative' }}>
              {view === 'photo' ? (
                <PhotoPanel propId={propId} heroPhoto={heroPhoto} onSave={savePhoto} />
              ) : isLoaded && p.lat && p.lng ? (
                view === 'satellite' ? (
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={position} zoom={17}
                    options={{ mapTypeId: 'satellite', mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true }} />
                ) : (
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={position} zoom={14}
                    options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}>
                    <StreetViewPanorama position={position} visible={true}
                      options={{ enableCloseButton: false, addressControl: false, linksControl: true, panControl: true, zoomControl: true }} />
                  </GoogleMap>
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>Loading…</div>
              )}
            </div>
          </div>

          {/* Right: Details + Notes */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'SIZE', val: p.sf > 0 ? `${p.sf.toLocaleString()} SF` : '—', color: '#60a5fa' },
                  { label: 'ACRES', val: p.acres > 0 ? `${p.acres.toFixed(2)} ac` : '—', color: '#34d399' },
                  { label: 'BUILT', val: p.yearBuilt > 0 ? p.yearBuilt : '—', color: '#a78bfa' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#0a1122', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: m.color }}>{m.val}</div>
                    <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.08em' }}>{m.label}</div>
                  </div>
                ))}
              </div>
              {p.forSale && (
                <div style={{ padding: '7px 12px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '7px', marginBottom: '12px', textAlign: 'center' }}>
                  <span style={{ color: '#f87171', fontWeight: 700, fontSize: '12px' }}>🔴 FOR SALE {p.forSalePrice > 0 ? `— ${fmt$(p.forSalePrice)}` : ''}</span>
                </div>
              )}

              {/* Owner */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>OWNER</div>
                {row('True Owner', p.trueOwner, '#f59e0b')}
                {row('Owner', p.owner !== p.trueOwner ? p.owner : null)}
                {row('Contact', p.ownerContact)}
                {row('Mailing', p.ownerAddress)}
                {row('Phone', p.ownerPhone)}
                {row('Submarket', p.submarket)}
                {p.parentCompany && row('Parent Company', p.parentCompany)}
                <ContactButtons phone={p.ownerPhone} email={p.ownerEmail} name={p.name || p.address} />
              </div>

              {/* Transaction */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>LAST TRANSACTION</div>
                {row('Sale Date', p.lastSaleDate)}
                {row('Sale Price', fmt$(p.lastSalePrice))}
                {p.lastSalePrice && p.sf ? row('Price / SF', `$${(p.lastSalePrice/p.sf).toFixed(0)}/SF`) : null}
                {row('Parcel', p.parcel)}
              </div>

              {/* Loan */}
              {(p.lender || p.loanAmount) && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '6px' }}>LOAN</div>
                  {row('Lender', p.lender)}
                  {row('Amount', fmt$(p.loanAmount))}
                  {row('Type', p.loanType)}
                  {row('Maturity', p.loanMaturity,
                    p.loanMaturity && new Date(p.loanMaturity) < new Date(Date.now() + 1000*60*60*24*365*2) ? '#f59e0b' : null)}
                </div>
              )}

              {/* Notes */}
              <div>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  NOTES <span style={{ color: '#334155', fontSize: '9px', marginLeft: '6px' }}>synced · Campo · Birdie · Topo</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {NOTE_TYPES.map(t => (
                    <button key={t.id} onClick={() => setNoteType(t.id)} style={{
                      padding: '3px 8px', border: `1px solid ${noteType===t.id ? '#f59e0b' : '#1e2d47'}`,
                      borderRadius: '12px', background: noteType===t.id ? '#f59e0b22' : 'transparent',
                      color: noteType===t.id ? '#f59e0b' : '#64748b', fontSize: '10px', cursor: 'pointer',
                    }}>{t.label}</button>
                  ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`Add ${noteType}…`} rows={2}
                  style={{ width: '100%', padding: '8px', background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '5px', color: '#e2e8f0', fontSize: '12px', resize: 'none', marginBottom: '6px', boxSizing: 'border-box' }} />
                <button onClick={addNote} style={{ width: '100%', padding: '7px', background: '#f59e0b', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginBottom: '10px' }}>
                  + SAVE NOTE
                </button>
                {notes.map(n => (
                  <div key={n._docId} style={{ padding: '7px', background: '#1a2540', borderRadius: '5px', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>{typeIco[n.type]||'📝'} {n.author} · {n.timestamp?.slice(0,10)}</span>
                      <button onClick={() => deleteNote(n._docId)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '11px', padding: 0 }}>✕</button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
