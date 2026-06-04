import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

const STATUSES = [
  { value: 'active', label: '🔍 Active — Looking Into It', color: '#f59e0b' },
  { value: 'interested', label: '🔥 Interested', color: '#34d399' },
  { value: 'under_nda', label: '🔒 Under NDA', color: '#a78bfa' },
  { value: 'loi_sent', label: '📄 LOI Sent', color: '#60a5fa' },
  { value: 'dead', label: '💀 Dead — Owner Won\'t Sell', color: '#475569' },
  { value: 'sold', label: '✅ Closed / Acquired', color: '#34d399' },
]

function LeadCard({ lead, currentUser, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const [editData, setEditData] = useState(lead)

  const status = STATUSES.find(s => s.value === lead.status) || STATUSES[0]

  const addNote = async () => {
    if (!note.trim()) return
    const notes = [...(lead.notes || []), {
      text: note.trim(), author: currentUser?.name || 'Unknown',
      authorId: currentUser?.id || 'U', timestamp: new Date().toISOString(),
    }]
    await updateDoc(doc(db, 'storvault_leads', lead._docId), { notes })
    setNote('')
  }

  const saveEdit = async () => {
    await updateDoc(doc(db, 'storvault_leads', lead._docId), editData)
    setEditing(false)
  }

  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'7px 10px', width:'100%', boxSizing:'border-box', outline:'none' }

  if (editing) return (
    <div style={{ background:'#0d1526', border:'1px solid #2d3f5e', borderRadius:'10px', padding:'16px', marginBottom:'12px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px' }}>
        <input placeholder="Property Name / Address *" value={editData.name||''} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} style={{ ...inp, gridColumn:'1/-1' }} />
        <input placeholder="Address" value={editData.address||''} onChange={e=>setEditData(d=>({...d,address:e.target.value}))} style={inp} />
        <input placeholder="City" value={editData.city||''} onChange={e=>setEditData(d=>({...d,city:e.target.value}))} style={inp} />
        <input placeholder="SF" value={editData.sf||''} onChange={e=>setEditData(d=>({...d,sf:e.target.value}))} style={inp} />
        <input placeholder="Acres" value={editData.acres||''} onChange={e=>setEditData(d=>({...d,acres:e.target.value}))} style={inp} />
        <input placeholder="Asking Price" value={editData.askingPrice||''} onChange={e=>setEditData(d=>({...d,askingPrice:e.target.value}))} style={inp} />
        <input placeholder="Zoning" value={editData.zoning||''} onChange={e=>setEditData(d=>({...d,zoning:e.target.value}))} style={inp} />
        <input placeholder="Owner / Seller" value={editData.owner||''} onChange={e=>setEditData(d=>({...d,owner:e.target.value}))} style={inp} />
        <input placeholder="Owner Phone" value={editData.ownerPhone||''} onChange={e=>setEditData(d=>({...d,ownerPhone:e.target.value}))} style={inp} />
        <input placeholder="Broker / Source" value={editData.broker||''} onChange={e=>setEditData(d=>({...d,broker:e.target.value}))} style={inp} />
        <input placeholder="Broker Phone" value={editData.brokerPhone||''} onChange={e=>setEditData(d=>({...d,brokerPhone:e.target.value}))} style={inp} />
        <select value={editData.status||'active'} onChange={e=>setEditData(d=>({...d,status:e.target.value}))} style={{ ...inp, cursor:'pointer' }}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <textarea placeholder="Description / Notes" value={editData.description||''} onChange={e=>setEditData(d=>({...d,description:e.target.value}))} rows={3}
          style={{ ...inp, gridColumn:'1/-1', resize:'vertical' }} />
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={saveEdit} style={{ flex:1, padding:'8px', background:'#f59e0b', border:'none', borderRadius:'6px', color:'#000', fontWeight:700, fontSize:'12px', cursor:'pointer' }}>Save</button>
        <button onClick={()=>setEditing(false)} style={{ padding:'8px 16px', background:'#1e2d47', border:'none', borderRadius:'6px', color:'#94a3b8', fontSize:'12px', cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#0d1526', border:`1px solid ${status.color}44`, borderLeft:`3px solid ${status.color}`, borderRadius:'10px', padding:'16px', marginBottom:'12px', opacity: lead.status==='dead' ? 0.7 : 1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            <span style={{ fontSize:'15px', fontWeight:800, color:'#f8fafc' }}>{lead.name}</span>
            <span style={{ padding:'2px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:700, background:`${status.color}22`, color:status.color }}>{status.label}</span>
          </div>
          {lead.address && <div style={{ fontSize:'12px', color:'#64748b' }}>{lead.address}{lead.city ? `, ${lead.city}` : ''}</div>}
        </div>
        <div style={{ display:'flex', gap:'6px' }}>
          <button onClick={()=>setEditing(true)} style={{ background:'#1e2d47', border:'none', color:'#64748b', cursor:'pointer', borderRadius:'5px', padding:'4px 10px', fontSize:'11px' }}>✎ Edit</button>
          <button onClick={()=>onDelete(lead._docId)} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:'14px' }}>✕</button>
        </div>
      </div>

      {/* Key details */}
      <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', fontSize:'11px', marginBottom:'10px' }}>
        {lead.sf && <span style={{ color:'#60a5fa' }}>📐 {Number(lead.sf).toLocaleString()} SF</span>}
        {lead.acres && <span style={{ color:'#34d399' }}>🌱 {lead.acres} acres</span>}
        {lead.zoning && <span style={{ color:'#a78bfa' }}>🏗 {lead.zoning}</span>}
        {lead.askingPrice && <span style={{ color:'#f59e0b' }}>💰 {lead.askingPrice}</span>}
        {lead.owner && <span style={{ color:'#94a3b8' }}>🏢 {lead.owner}</span>}
      </div>

      {lead.broker && (
        <div style={{ fontSize:'11px', color:'#475569', marginBottom:'8px' }}>
          Broker/Source: <span style={{ color:'#94a3b8' }}>{lead.broker}</span>
          {lead.brokerPhone && <span> · <a href={`tel:${lead.brokerPhone}`} style={{ color:'#60a5fa', textDecoration:'none' }}>{lead.brokerPhone}</a></span>}
        </div>
      )}
      {lead.description && <div style={{ fontSize:'12px', color:'#64748b', marginBottom:'10px', lineHeight:1.5 }}>{lead.description}</div>}

      {/* Notes toggle */}
      <button onClick={()=>setExpanded(v=>!v)} style={{ background:'none', border:'none', color:'#475569', fontSize:'11px', cursor:'pointer', padding:0, marginBottom: expanded?'10px':0 }}>
        {expanded ? '▲' : '▼'} Notes {lead.notes?.length ? `(${lead.notes.length})` : ''}
      </button>

      {expanded && (
        <div>
          {(lead.notes||[]).map((n,i) => (
            <div key={i} style={{ padding:'7px', background:'#1a2540', borderRadius:'5px', marginBottom:'5px' }}>
              <div style={{ fontSize:'10px', color:'#64748b', marginBottom:'2px' }}>{n.author} · {n.timestamp?.slice(0,10)}</div>
              <div style={{ fontSize:'12px', color:'#cbd5e1' }}>{n.text}</div>
            </div>
          ))}
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add note…" rows={2}
            style={{ width:'100%', padding:'8px', background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', resize:'none', marginTop:'6px', marginBottom:'6px', boxSizing:'border-box' }} />
          <button onClick={addNote} style={{ padding:'6px 14px', background:'#f59e0b', border:'none', borderRadius:'5px', color:'#000', fontWeight:700, fontSize:'11px', cursor:'pointer' }}>+ Add Note</button>
        </div>
      )}
    </div>
  )
}

function AddLeadModal({ onClose, currentUser }) {
  const [f, setF] = useState({ name:'', address:'', city:'', sf:'', acres:'', zoning:'', askingPrice:'', owner:'', ownerPhone:'', broker:'', brokerPhone:'', description:'', status:'active' })

  const save = async () => {
    if (!f.name.trim()) return
    await addDoc(collection(db, 'storvault_leads'), {
      ...f, notes: [], createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Unknown',
    })
    onClose()
  }

  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'8px 10px', width:'100%', boxSizing:'border-box', outline:'none' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'12px', padding:'24px', width:'100%', maxWidth:'600px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:'16px', fontWeight:800, color:'#f8fafc', marginBottom:'16px' }}>+ Add Lead</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px', marginBottom:'12px' }}>
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
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <textarea placeholder="Description / context…" value={f.description} onChange={e=>setF(d=>({...d,description:e.target.value}))} rows={3}
            style={{ ...inp, gridColumn:'1/-1', resize:'vertical' }} />
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={save} style={{ flex:1, padding:'10px', background:'#f59e0b', border:'none', borderRadius:'7px', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>Save Lead</button>
          <button onClick={onClose} style={{ padding:'10px 20px', background:'#1e2d47', border:'none', borderRadius:'7px', color:'#94a3b8', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Leads({ currentUser }) {
  const [leads, setLeads] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'storvault_leads'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => setLeads(snap.docs.map(d => ({ _docId: d.id, ...d.data() }))))
    return () => unsub()
  }, [])

  const deleteLead = async (docId) => { if (confirm('Delete this lead?')) await deleteDoc(doc(db, 'storvault_leads', docId)) }

  const filtered = filterStatus === 'all' ? leads : leads.filter(l => l.status === filterStatus)
  const counts = {}
  STATUSES.forEach(s => { counts[s.value] = leads.filter(l => l.status === s.value).length })

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px', background:'#080d1a' }}>
      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} currentUser={currentUser} />}

      <div style={{ maxWidth:'900px', margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:'18px', fontWeight:800, color:'#f8fafc' }}>Acquisition Leads</h2>
            <div style={{ fontSize:'12px', color:'#475569' }}>Properties we're tracking for potential acquisition</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding:'9px 18px', background:'#f59e0b', border:'none', borderRadius:'7px', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>+ Add Lead</button>
        </div>

        {/* Status filter pills */}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
          <button onClick={() => setFilterStatus('all')} style={{ padding:'5px 12px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'11px', fontWeight:700, background: filterStatus==='all'?'#f59e0b':'#1e2d47', color: filterStatus==='all'?'#000':'#94a3b8' }}>
            All ({leads.length})
          </button>
          {STATUSES.map(s => counts[s.value] > 0 && (
            <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{ padding:'5px 12px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'11px', fontWeight:700, background: filterStatus===s.value?`${s.color}33`:'#1e2d47', color: filterStatus===s.value?s.color:'#94a3b8', border: filterStatus===s.value?`1px solid ${s.color}44`:'1px solid transparent' }}>
              {s.label.split('—')[0].trim()} ({counts[s.value]})
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', color:'#334155', padding:'40px' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>📋</div>
            <div>No leads yet — add your first one</div>
          </div>
        )}

        {filtered.map(lead => (
          <LeadCard key={lead._docId} lead={lead} currentUser={currentUser} onUpdate={() => {}} onDelete={deleteLead} />
        ))}
      </div>
    </div>
  )
}
