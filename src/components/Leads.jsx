import { useState, useEffect, useRef, useCallback } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
import { db } from '../firebase.js'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'

const GMAPS_KEY = 'AIzaSyCLnBGWiIGI8OtYlHgLImzn0JY5FVjuQ6k'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

const STATUSES = [
  { value:'active',    label:'Researching',    color:'#60a5fa' },
  { value:'interested',label:'Interested 🔥',  color:'#34d399' },
  { value:'under_nda', label:'Under NDA',       color:'#a78bfa' },
  { value:'loi_sent',  label:'LOI Sent',        color:'#f59e0b' },
  { value:'dead',      label:'Dead — Won\'t Sell', color:'#475569' },
  { value:'closed',    label:'Closed',          color:'#34d399' },
]

function LeadMarker({ lead, onClick, isSelected }) {
  const status = STATUSES.find(s=>s.value===lead.status)||STATUSES[0]
  if (!lead.lat || !lead.lng) return null
  return (
    <OverlayView position={{ lat: lead.lat, lng: lead.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div onClick={()=>onClick(lead)} title={lead.name} style={{ cursor:'pointer', transform:'translate(-50%,-50%)' }}>
        <svg width="24" height="24" style={{ overflow:'visible' }}>
          {isSelected && <circle cx="12" cy="12" r="11" fill="none" stroke="#f59e0b" strokeWidth="2"/>}
          <circle cx="12" cy="12" r="8" fill={status.color} fillOpacity="0.9" stroke="#fff" strokeWidth="1.5"/>
          <text x="12" y="16" textAnchor="middle" fontSize="9" fill="#000" fontWeight="bold">L</text>
        </svg>
      </div>
    </OverlayView>
  )
}

// AI Lead Extraction Modal
function AILeadModal({ onClose, onExtracted, currentUser }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (ev) => { setImagePreview(ev.target.result); setImage(ev.target.result) }
        reader.readAsDataURL(file)
        return
      }
    }
    // Text paste handled by textarea onChange
  }, [])

  const extract = async () => {
    if (!text && !image) return
    setLoading(true); setError(''); setExtracted(null)
    try {
      // Call Cloudflare Worker for Claude extraction
      const payload = { text, image }
      const res = await fetch('/extract-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Extraction failed')
      const data = await res.json()
      setExtracted(data)
    } catch (e) {
      setError('Could not extract — try pasting the text manually into the form below')
    }
    setLoading(false)
  }

  const saveLead = async (fields) => {
    await addDoc(collection(db, 'storvault_leads'), {
      ...fields,
      notes: fields.notes || [],
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Unknown',
      status: fields.status || 'active',
    })
    onExtracted()
    onClose()
  }

  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'7px 10px', width:'100%', boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'12px', padding:'24px', width:'100%', maxWidth:'560px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:'16px', fontWeight:800, color:'#f8fafc', marginBottom:'4px' }}>✨ AI Lead Extraction</div>
        <div style={{ fontSize:'12px', color:'#475569', marginBottom:'16px' }}>Paste an email, brochure text, or screenshot — Claude will extract the property details</div>

        {!extracted ? (
          <>
            {/* Image paste area */}
            <div onPaste={handlePaste}
              style={{ border:'2px dashed #2d3f5e', borderRadius:'8px', padding:'16px', marginBottom:'12px', textAlign:'center', cursor:'pointer', background:'#080d1a' }}
              onClick={()=>fileRef.current?.click()}>
              {imagePreview ? (
                <img src={imagePreview} style={{ maxHeight:'120px', maxWidth:'100%', objectFit:'contain', borderRadius:'4px' }} />
              ) : (
                <div style={{ color:'#475569', fontSize:'12px' }}>📎 Paste screenshot here (Cmd+V) or click to upload image</div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
              const file = e.target.files[0]; if (!file) return
              const reader = new FileReader()
              reader.onload = ev => { setImagePreview(ev.target.result); setImage(ev.target.result) }
              reader.readAsDataURL(file)
            }} />

            <div style={{ fontSize:'11px', color:'#475569', marginBottom:'6px' }}>— or paste / type email / brochure text —</div>
            <textarea value={text} onChange={e=>setText(e.target.value)} onPaste={handlePaste}
              placeholder="Paste email text, property description, or brochure content here…" rows={6}
              style={{ ...inp, resize:'vertical', marginBottom:'12px' }} />

            {error && <div style={{ color:'#f87171', fontSize:'11px', marginBottom:'10px' }}>{error}</div>}

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={extract} disabled={loading||(!text&&!image)} style={{ flex:1, padding:'10px', background: (!text&&!image)||loading?'#1e2d47':'#f59e0b', border:'none', borderRadius:'6px', color: (!text&&!image)||loading?'#475569':'#000', fontWeight:700, fontSize:'13px', cursor: (!text&&!image)||loading?'not-allowed':'pointer' }}>
                {loading ? '⏳ Extracting…' : '✨ Extract with Claude'}
              </button>
              <button onClick={onClose} style={{ padding:'10px 16px', background:'#1e2d47', border:'none', borderRadius:'6px', color:'#94a3b8', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
            </div>
            <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #1e2d47' }}>
              <button onClick={() => setExtracted({})} style={{ background:'none', border:'none', color:'#475569', fontSize:'11px', cursor:'pointer', textDecoration:'underline' }}>
                Skip AI — add manually instead
              </button>
            </div>
          </>
        ) : (
          <LeadForm initial={extracted} onSave={saveLead} onCancel={onClose} />
        )}
      </div>
    </div>
  )
}

function LeadForm({ initial = {}, onSave, onCancel }) {
  const [f, setF] = useState({
    name: initial.name || '',
    address: initial.address || '',
    city: initial.city || '',
    sf: initial.sf || '',
    acres: initial.acres || '',
    zoning: initial.zoning || '',
    askingPrice: initial.askingPrice || '',
    owner: initial.owner || '',
    ownerPhone: initial.ownerPhone || '',
    broker: initial.broker || '',
    brokerPhone: initial.brokerPhone || '',
    description: initial.description || '',
    status: initial.status || 'active',
    notes: [],
  })

  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'7px 10px', width:'100%', boxSizing:'border-box', outline:'none' }

  return (
    <div>
      <div style={{ fontSize:'13px', color:'#64748b', marginBottom:'12px' }}>Review and save:</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
        <input placeholder="Name / Address *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))} style={{ ...inp, gridColumn:'1/-1' }} />
        <input placeholder="Street Address" value={f.address} onChange={e=>setF(d=>({...d,address:e.target.value}))} style={inp} />
        <input placeholder="City" value={f.city} onChange={e=>setF(d=>({...d,city:e.target.value}))} style={inp} />
        <input placeholder="Building SF" value={f.sf} onChange={e=>setF(d=>({...d,sf:e.target.value}))} style={inp} />
        <input placeholder="Land Acres" value={f.acres} onChange={e=>setF(d=>({...d,acres:e.target.value}))} style={inp} />
        <input placeholder="Asking Price" value={f.askingPrice} onChange={e=>setF(d=>({...d,askingPrice:e.target.value}))} style={inp} />
        <input placeholder="Zoning" value={f.zoning} onChange={e=>setF(d=>({...d,zoning:e.target.value}))} style={inp} />
        <input placeholder="Owner / Seller" value={f.owner} onChange={e=>setF(d=>({...d,owner:e.target.value}))} style={inp} />
        <input placeholder="Owner Phone" value={f.ownerPhone} onChange={e=>setF(d=>({...d,ownerPhone:e.target.value}))} style={inp} />
        <input placeholder="Broker / Source" value={f.broker} onChange={e=>setF(d=>({...d,broker:e.target.value}))} style={inp} />
        <input placeholder="Broker Phone" value={f.brokerPhone} onChange={e=>setF(d=>({...d,brokerPhone:e.target.value}))} style={inp} />
        <select value={f.status} onChange={e=>setF(d=>({...d,status:e.target.value}))} style={{ ...inp, cursor:'pointer', gridColumn:'1/-1' }}>
          {STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <textarea placeholder="Description…" value={f.description} onChange={e=>setF(d=>({...d,description:e.target.value}))} rows={3}
          style={{ ...inp, gridColumn:'1/-1', resize:'vertical' }} />
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={()=>onSave(f)} disabled={!f.name.trim()} style={{ flex:1, padding:'10px', background:f.name.trim()?'#f59e0b':'#1e2d47', border:'none', borderRadius:'6px', color:f.name.trim()?'#000':'#475569', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>Save Lead</button>
        <button onClick={onCancel} style={{ padding:'10px 16px', background:'#1e2d47', border:'none', borderRadius:'6px', color:'#94a3b8', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function LeadDetail({ lead, currentUser, onClose, onUpdate }) {
  const [note, setNote] = useState('')
  const [editStatus, setEditStatus] = useState(lead.status)
  const status = STATUSES.find(s=>s.value===lead.status)||STATUSES[0]

  const addNote = async () => {
    if (!note.trim()) return
    const notes = [...(lead.notes||[]), { text:note.trim(), author:currentUser?.name||'Unknown', authorId:currentUser?.id||'U', timestamp:new Date().toISOString() }]
    await updateDoc(doc(db,'storvault_leads',lead._docId), { notes })
    setNote('')
  }

  const updateStatus = async (val) => {
    setEditStatus(val)
    await updateDoc(doc(db,'storvault_leads',lead._docId), { status: val })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'12px', width:'100%', maxWidth:'700px', maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e2d47', background:'#0a1122', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:'16px', fontWeight:800, color:'#f8fafc' }}>{lead.name}</div>
            {lead.address && <div style={{ fontSize:'12px', color:'#64748b' }}>{lead.address}{lead.city?`, ${lead.city}`:''}</div>}
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <select value={editStatus} onChange={e=>updateStatus(e.target.value)} style={{ padding:'6px 10px', borderRadius:'6px', border:`1px solid ${status.color}`, background:`${status.color}22`, color:status.color, fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
              {STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={onClose} style={{ background:'#1e2d47', border:'none', color:'#94a3b8', cursor:'pointer', borderRadius:'6px', padding:'6px 12px' }}>✕ Close</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
          {/* Details */}
          <div>
            <div style={{ fontSize:'10px', color:'#475569', letterSpacing:'0.1em', marginBottom:'10px' }}>PROPERTY DETAILS</div>
            {[['SF', lead.sf], ['Acres', lead.acres], ['Zoning', lead.zoning], ['Asking Price', lead.askingPrice], ['Owner', lead.owner], ['Owner Phone', lead.ownerPhone], ['Broker', lead.broker], ['Broker Phone', lead.brokerPhone]].map(([label, val]) => val ? (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1a2540' }}>
                <span style={{ color:'#475569', fontSize:'11px' }}>{label}</span>
                <span style={{ color:'#e2e8f0', fontSize:'11px', maxWidth:'60%', textAlign:'right' }}>{val}</span>
              </div>
            ) : null)}
            {lead.description && (
              <div style={{ marginTop:'12px', fontSize:'12px', color:'#64748b', lineHeight:1.6 }}>{lead.description}</div>
            )}
            <div style={{ marginTop:'12px', fontSize:'10px', color:'#334155' }}>Added by {lead.createdBy} · {lead.createdAt?.slice(0,10)}</div>
          </div>
          {/* Notes */}
          <div>
            <div style={{ fontSize:'10px', color:'#475569', letterSpacing:'0.1em', marginBottom:'10px' }}>NOTES</div>
            {(lead.notes||[]).map((n,i) => (
              <div key={i} style={{ padding:'8px', background:'#1a2540', borderRadius:'5px', marginBottom:'6px' }}>
                <div style={{ fontSize:'10px', color:'#64748b', marginBottom:'3px' }}>{n.author} · {n.timestamp?.slice(0,10)}</div>
                <div style={{ fontSize:'12px', color:'#cbd5e1' }}>{n.text}</div>
              </div>
            ))}
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add note…" rows={3}
              style={{ width:'100%', padding:'8px', background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', resize:'none', marginTop:'8px', marginBottom:'6px', boxSizing:'border-box' }} />
            <button onClick={addNote} style={{ width:'100%', padding:'7px', background:'#f59e0b', border:'none', borderRadius:'5px', color:'#000', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>+ Add Note</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Leads({ currentUser }) {
  const isLoaded = useGoogleMaps()
  const mapRef = useRef(null)
  const [leads, setLeads] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const [detailLead, setDetailLead] = useState(null)
  const [listWidth, setListWidth] = useState(580)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  useEffect(() => {
    const q = query(collection(db,'storvault_leads'), orderBy('createdAt','desc'))
    const unsub = onSnapshot(q, snap => setLeads(snap.docs.map(d=>({_docId:d.id,...d.data()}))))
    return () => unsub()
  }, [])

  const onDragStart = useCallback((e) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = listWidth
    setIsDragging(true)
  }, [listWidth])

  useEffect(() => {
    if (!isDragging) return
    const onMove = e => setListWidth(Math.max(300, Math.min(900, dragStartWidth.current + (e.clientX - dragStartX.current))))
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging])

  const onMapLoad = useCallback(m => { mapRef.current = m }, [])

  const deleteLead = async (docId) => { if (window.confirm('Delete this lead?')) await deleteDoc(doc(db,'storvault_leads',docId)) }
  const filtered = filterStatus==='all' ? leads : leads.filter(l=>l.status===filterStatus)
  const counts = {}
  STATUSES.forEach(s=>{ counts[s.value]=leads.filter(l=>l.status===s.value).length })

  const inpStyle = { background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'6px', color:'#e2e8f0', padding:'6px 10px', fontSize:'12px' }

  return (
    <div style={{ display:'flex', height:'100%', background:'#080d1a', userSelect:isDragging?'none':'auto' }}>
      {showAdd && <AILeadModal onClose={()=>setShowAdd(false)} onExtracted={()=>setShowAdd(false)} currentUser={currentUser} />}
      {detailLead && <LeadDetail lead={leads.find(l=>l._docId===detailLead._docId)||detailLead} currentUser={currentUser} onClose={()=>setDetailLead(null)} />}

      {/* LEFT: List */}
      <div style={{ width: listWidth, display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
        {/* Toolbar */}
        <div style={{ padding:'10px 14px', background:'#0d1526', borderBottom:'1px solid #1e2d47', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:'4px', flex:1, flexWrap:'wrap' }}>
            <button onClick={()=>setFilterStatus('all')} style={{ padding:'4px 10px', border:'none', borderRadius:'12px', cursor:'pointer', fontSize:'10px', fontWeight:700, background:filterStatus==='all'?'#f59e0b':'#1e2d47', color:filterStatus==='all'?'#000':'#94a3b8' }}>
              All ({leads.length})
            </button>
            {STATUSES.map(s => (counts[s.value]||0) > 0 && (
              <button key={s.value} onClick={()=>setFilterStatus(s.value)} style={{ padding:'4px 10px', border:`1px solid ${filterStatus===s.value?s.color+'44':'transparent'}`, borderRadius:'12px', cursor:'pointer', fontSize:'10px', fontWeight:700, background:filterStatus===s.value?`${s.color}22`:'#1e2d47', color:filterStatus===s.value?s.color:'#94a3b8' }}>
                {s.label.split(' ')[0]} ({counts[s.value]})
              </button>
            ))}
          </div>
          <button onClick={()=>setShowAdd(true)} style={{ padding:'6px 14px', background:'#f59e0b', border:'none', borderRadius:'6px', color:'#000', fontWeight:700, fontSize:'11px', cursor:'pointer', flexShrink:0 }}>✨ Add Lead</button>
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead style={{ position:'sticky', top:0, background:'#0a0f1e', zIndex:1 }}>
              <tr>
                {['NAME / ADDRESS','STATUS','DETAILS','LAST NOTE'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', borderBottom:'1px solid #1e2d47', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const status = STATUSES.find(s=>s.value===lead.status)||STATUSES[0]
                const lastNote = (lead.notes||[]).slice(-1)[0]
                const isSelected = selectedLead?._docId === lead._docId
                return (
                  <tr key={lead._docId}
                    onClick={()=>{ setSelectedLead(isSelected?null:lead); if(!isSelected&&lead.lat) mapRef.current?.panTo({lat:lead.lat,lng:lead.lng}) }}
                    onDoubleClick={()=>setDetailLead(lead)}
                    title="Click to highlight · Double-click for full detail"
                    style={{ cursor:'pointer', borderBottom:'1px solid #0f1929', background:isSelected?'#1a2540':'transparent', opacity:lead.status==='dead'?0.6:1, borderLeft:`3px solid ${isSelected?status.color:'transparent'}` }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background='#111827' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=isSelected?'#1a2540':'transparent' }}>
                    <td style={{ padding:'8px 10px', maxWidth:'180px' }}>
                      <div style={{ fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.name}</div>
                      {lead.address && <div style={{ color:'#475569', fontSize:'10px' }}>{lead.address}{lead.city?`, ${lead.city}`:''}</div>}
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:700, background:`${status.color}22`, color:status.color, whiteSpace:'nowrap' }}>{status.label.split(' ')[0]}</span>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:'11px', color:'#64748b' }}>
                        {lead.sf && <span style={{ color:'#60a5fa' }}>{Number(lead.sf).toLocaleString()} SF</span>}
                        {lead.acres && !lead.sf && <span style={{ color:'#34d399' }}>{lead.acres} ac</span>}
                        {lead.broker && <div style={{ color:'#475569', fontSize:'10px' }}>{lead.broker.split(' ')[0]}…</div>}
                      </div>
                    </td>
                    <td style={{ padding:'8px 10px', maxWidth:'160px' }}>
                      {lastNote ? (
                        <div>
                          <div style={{ fontSize:'10px', color:'#475569' }}>{lastNote.author?.split(' ')[0]} · {lastNote.timestamp?.slice(0,10)}</div>
                          <div style={{ fontSize:'11px', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastNote.text}</div>
                        </div>
                      ) : <span style={{ color:'#334155', fontSize:'10px' }}>No notes</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', color:'#334155', padding:'40px' }}>
              <div style={{ fontSize:'28px', marginBottom:'8px' }}>📋</div>
              <div>No leads yet — click ✨ Add Lead to get started</div>
            </div>
          )}
        </div>
      </div>

      {/* Drag handle */}
      <div onMouseDown={onDragStart} style={{ width:'4px', background:isDragging?'#f59e0b':'#1e2d47', cursor:'col-resize', flexShrink:0, zIndex:10 }} />

      {/* RIGHT: Map */}
      <div style={{ flex:1, position:'relative', minWidth:0 }}>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={{ width:'100%', height:'100%' }}
            options={{ center:{lat:32.78,lng:-117.1}, zoom:10, mapTypeId:'roadmap', styles:[{featureType:'poi',stylers:[{visibility:'off'}]}], mapTypeControl:false, streetViewControl:false, fullscreenControl:false, gestureHandling:'greedy' }}
            onLoad={onMapLoad}>
            {filtered.map(lead => <LeadMarker key={lead._docId} lead={lead} onClick={l=>{setSelectedLead(l);mapRef.current?.panTo({lat:l.lat,lng:l.lng})}} isSelected={selectedLead?._docId===lead._docId} />)}
          </GoogleMap>
        ) : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#475569' }}>Loading map…</div>}

        {selectedLead && (
          <div style={{ position:'absolute', bottom:'16px', left:'50%', transform:'translateX(-50%)', background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'10px', padding:'12px 16px', minWidth:'260px', maxWidth:'360px', zIndex:10, boxShadow:'0 4px 20px rgba(0,0,0,0.5)' }}>
            {(() => { const status = STATUSES.find(s=>s.value===selectedLead.status)||STATUSES[0]; return (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#f8fafc', fontSize:'13px' }}>{selectedLead.name}</div>
                    <span style={{ padding:'2px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:700, background:`${status.color}22`, color:status.color }}>{status.label}</span>
                  </div>
                  <button onClick={()=>setSelectedLead(null)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:'16px', padding:0, marginLeft:'10px' }}>×</button>
                </div>
                <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'10px' }}>
                  {selectedLead.sf&&<span style={{ color:'#60a5fa', marginRight:'10px' }}>{Number(selectedLead.sf).toLocaleString()} SF</span>}
                  {selectedLead.broker&&<span>{selectedLead.broker}</span>}
                </div>
                <button onClick={()=>setDetailLead(selectedLead)} style={{ width:'100%', padding:'8px', background:'#f59e0b', border:'none', borderRadius:'6px', color:'#000', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>
                  View Full Detail →
                </button>
              </>
            )})()}
          </div>
        )}
      </div>
    </div>
  )
}
