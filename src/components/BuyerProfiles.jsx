import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import compsData from '../data/comps.json'

function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

const REITS=['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop']
const UHAUL=['u-haul','uhaul']
function buildBuyers() {
  const map = {}
  compsData.forEach(c => {
    if (!c.buyer) return
    const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
    if (!name || name === 'Unknown') return
    if (!map[name]) map[name] = { name, deals: [], totalVol: 0, totalSF: 0 }
    map[name].deals.push(c)
    map[name].totalVol += c.salePrice || 0
    map[name].totalSF += c.sf || 0
  })
  return Object.values(map).sort((a,b) => b.totalVol - a.totalVol)
}
const BUYERS = buildBuyers()

function LogoImg({ company }) {
  const [err, setErr] = useState(false)
  if (!company || err) {
    const init = company ? company.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() : '?'
    return <div style={{ width:'48px',height:'48px',borderRadius:'8px',background:'#1e2d47',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,color:'#f59e0b',flexShrink:0 }}>{init}</div>
  }
  return <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(company)}`} alt={company} onError={()=>setErr(true)} style={{ width:'48px',height:'48px',objectFit:'contain',borderRadius:'8px',background:'#1e2d47',padding:'4px',flexShrink:0 }} />
}

// Popup that appears when clicking call/text/email
function ActionNotePopup({ contact, action, buyerName, currentUser, onClose, onSave }) {
  const [note, setNote] = useState('')
  const actionIcon = { call:'📞', text:'💬', email:'📧' }[action]
  const actionLabel = { call:'Call', text:'Text', email:'Email' }[action]
  const actionHref = action==='call' ? `tel:${contact.phone}` : action==='text' ? `sms:${contact.phone}` : `mailto:${contact.email}?subject=Re: ${buyerName}`

  const save = async () => {
    if (note.trim()) {
      await addDoc(collection(db, 'gentz_notes'), {
        id: uid(), text: note.trim(),
        type: action==='call'?'call':action==='text'?'text':'email',
        author: currentUser?.name || 'Unknown',
        authorId: currentUser?.id || 'U',
        timestamp: new Date().toISOString(),
        source: 'storvault',
        linkedContacts: [contact.id || contact._docId],
        linkedProperties: [], linkedLeads: [], linkedDeals: [], linkedProjects: [], linkedTenants: [],
        contactName: contact.name, company: buyerName,
      })
    }
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'12px', padding:'24px', width:'400px' }}>
        <div style={{ fontSize:'16px', fontWeight:700, color:'#f8fafc', marginBottom:'4px' }}>{actionIcon} Log {actionLabel}</div>
        <div style={{ fontSize:'12px', color:'#64748b', marginBottom:'16px' }}>{contact.name} · {buyerName}</div>

        <a href={actionHref} style={{
          display:'block', textAlign:'center', padding:'10px', marginBottom:'16px',
          background: action==='call'?'#1e3a5f':action==='text'?'#1a3a2a':'#2a1a3a',
          border: `1px solid ${action==='call'?'#2d5a8e':action==='text'?'#2d5e40':'#5e2d8e'}`,
          borderRadius:'8px', color: action==='call'?'#60a5fa':action==='text'?'#34d399':'#a78bfa',
          fontWeight:700, fontSize:'14px', textDecoration:'none',
        }}>
          {actionIcon} {actionLabel === 'Call' ? contact.phone : actionLabel === 'Text' ? contact.phone : contact.email}
        </a>

        <textarea value={note} onChange={e=>setNote(e.target.value)}
          placeholder={`Add ${actionLabel.toLowerCase()} note… (optional)`} rows={4}
          style={{ width:'100%', padding:'10px', background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'6px', color:'#e2e8f0', fontSize:'13px', resize:'none', marginBottom:'12px', boxSizing:'border-box' }} />

        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={save} style={{ flex:1, padding:'10px', background:'#f59e0b', border:'none', borderRadius:'6px', color:'#000', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
            {note.trim() ? 'Save Note & Close' : 'Close'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px', background:'#1e2d47', border:'none', borderRadius:'6px', color:'#94a3b8', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function ContactCard({ contact, buyerName, currentUser, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [actionPopup, setActionPopup] = useState(null) // 'call'|'text'|'email'
  const [notes, setNotes] = useState([])
  const [editData, setEditData] = useState({ name: contact.name||'', title: contact.title||'', phone: contact.phone||'', email: contact.email||'' })

  useEffect(() => {
    if (!showNotes) return
    const contactId = contact.id || contact._docId
    const q = query(collection(db, 'gentz_notes'), where('linkedContacts', 'array-contains', contactId))
    const unsub = onSnapshot(q, snap => {
      setNotes(snap.docs.map(d=>({_docId:d.id,...d.data()})).sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||'')))
    })
    return () => unsub()
  }, [showNotes, contact._docId])

  const saveEdit = async () => {
    await updateDoc(doc(db, 'gentz_contacts', contact._docId), editData)
    setEditing(false)
  }

  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'6px 9px', width:'100%', boxSizing:'border-box', outline:'none' }

  if (editing) return (
    <div style={{ background:'#0a1122', borderRadius:'8px', padding:'12px', marginBottom:'8px', border:'1px solid #2d3f5e' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px', marginBottom:'8px' }}>
        <input placeholder="Name *" value={editData.name} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} style={inp} />
        <input placeholder="Title" value={editData.title} onChange={e=>setEditData(d=>({...d,title:e.target.value}))} style={inp} />
        <input placeholder="Phone" value={editData.phone} onChange={e=>setEditData(d=>({...d,phone:e.target.value}))} style={inp} />
        <input placeholder="Email" value={editData.email} onChange={e=>setEditData(d=>({...d,email:e.target.value}))} style={inp} />
      </div>
      <div style={{ display:'flex', gap:'7px' }}>
        <button onClick={saveEdit} style={{ flex:1, padding:'7px', background:'#f59e0b', border:'none', borderRadius:'5px', color:'#000', fontWeight:700, fontSize:'11px', cursor:'pointer' }}>Save</button>
        <button onClick={()=>setEditing(false)} style={{ padding:'7px 14px', background:'#1e2d47', border:'none', borderRadius:'5px', color:'#94a3b8', fontSize:'11px', cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  const typeIco = { call:'📞', text:'💬', email:'📧', note:'📝', meeting:'🤝', voicemail:'📱' }

  return (
    <>
      {actionPopup && <ActionNotePopup contact={contact} action={actionPopup} buyerName={buyerName} currentUser={currentUser} onClose={()=>setActionPopup(null)} />}
      <div style={{ background:'#0a1122', borderRadius:'8px', padding:'12px', marginBottom:'8px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'14px', color:'#e2e8f0', marginBottom:'2px' }}>{contact.name}</div>
            {contact.title && <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'4px' }}>{contact.title}</div>}
            {contact.phone && <div style={{ fontSize:'11px', color:'#94a3b8', marginBottom:'2px' }}>📞 {contact.phone}</div>}
            {contact.email && <div style={{ fontSize:'11px', color:'#94a3b8' }}>✉️ {contact.email}</div>}
          </div>
          <div style={{ display:'flex', gap:'5px' }}>
            <button onClick={()=>setEditing(true)} style={{ background:'#1e2d47', border:'none', color:'#64748b', cursor:'pointer', borderRadius:'4px', padding:'4px 8px', fontSize:'11px' }}>✎ Edit</button>
            <button onClick={()=>onDelete(contact._docId)} style={{ background:'none', border:'none', color:'#334155', cursor:'pointer', fontSize:'13px' }}>✕</button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px' }}>
          {contact.phone && <>
            <button onClick={()=>setActionPopup('call')} style={{ padding:'5px 12px', background:'#1e3a5f', border:'1px solid #2d5a8e', borderRadius:'6px', color:'#60a5fa', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>📞 Call</button>
            <button onClick={()=>setActionPopup('text')} style={{ padding:'5px 12px', background:'#1a3a2a', border:'1px solid #2d5e40', borderRadius:'6px', color:'#34d399', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>💬 Text</button>
          </>}
          {contact.email && <button onClick={()=>setActionPopup('email')} style={{ padding:'5px 12px', background:'#2a1a3a', border:'1px solid #5e2d8e', borderRadius:'6px', color:'#a78bfa', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>✉️ Email</button>}
          <button onClick={()=>setShowNotes(v=>!v)} style={{ padding:'5px 12px', background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'6px', color:'#64748b', fontSize:'11px', cursor:'pointer', marginLeft:'auto' }}>
            📝 Notes {notes.length > 0 ? `(${notes.length})` : ''}
          </button>
        </div>

        {/* Notes section */}
        {showNotes && (
          <div style={{ borderTop:'1px solid #1e2d47', paddingTop:'10px', marginTop:'4px' }}>
            {notes.length === 0 && <div style={{ fontSize:'11px', color:'#334155', marginBottom:'8px' }}>No notes yet</div>}
            {notes.map(n => (
              <div key={n._docId} style={{ padding:'7px', background:'#1a2540', borderRadius:'5px', marginBottom:'5px' }}>
                <div style={{ fontSize:'10px', color:'#64748b', marginBottom:'3px' }}>{typeIco[n.type]||'📝'} {n.author} · {n.timestamp?.slice(0,10)}</div>
                <div style={{ fontSize:'11px', color:'#cbd5e1' }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function AddContactForm({ buyerName, onAdded }) {
  const [show, setShow] = useState(false)
  const [f, setF] = useState({ name:'', title:'', phone:'', email:'' })
  const save = async () => {
    if (!f.name.trim()) return
    await addDoc(collection(db, 'gentz_contacts'), { id:uid(), ...f, company:buyerName, type:'buyer', source:'storvault', createdAt:new Date().toISOString() })
    setF({ name:'', title:'', phone:'', email:'' }); setShow(false); onAdded?.()
  }
  const inp = { background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'5px', color:'#e2e8f0', fontSize:'12px', padding:'7px 10px', width:'100%', boxSizing:'border-box', outline:'none' }
  if (!show) return <button onClick={()=>setShow(true)} style={{ width:'100%', padding:'8px', background:'transparent', border:'1px dashed #2d3f5e', borderRadius:'6px', color:'#475569', fontSize:'11px', cursor:'pointer', marginTop:'4px' }}>+ Add Contact</button>
  return (
    <div style={{ background:'#0a1122', border:'1px solid #1e2d47', borderRadius:'8px', padding:'12px', marginTop:'6px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px', marginBottom:'8px' }}>
        <input placeholder="Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))} style={inp} />
        <input placeholder="Title" value={f.title} onChange={e=>setF(d=>({...d,title:e.target.value}))} style={inp} />
        <input placeholder="Phone" value={f.phone} onChange={e=>setF(d=>({...d,phone:e.target.value}))} style={inp} />
        <input placeholder="Email" value={f.email} onChange={e=>setF(d=>({...d,email:e.target.value}))} style={inp} />
      </div>
      <div style={{ display:'flex', gap:'7px' }}>
        <button onClick={save} style={{ flex:1, padding:'7px', background:'#f59e0b', border:'none', borderRadius:'5px', color:'#000', fontWeight:700, fontSize:'11px', cursor:'pointer' }}>Save</button>
        <button onClick={()=>setShow(false)} style={{ padding:'7px 14px', background:'#1e2d47', border:'none', borderRadius:'5px', color:'#94a3b8', fontSize:'11px', cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function BuyerProfiles({ currentUser }) {
  const [selected, setSelected] = useState(null)
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const buyer = selected ? BUYERS.find(b => b.name === selected) : null

  useEffect(() => {
    if (!selected) return
    const q = query(collection(db, 'gentz_contacts'), where('company', '==', selected))
    const unsub = onSnapshot(q, snap => setContacts(snap.docs.map(d=>({_docId:d.id,...d.data()}))))
    return () => unsub()
  }, [selected])

  const deleteContact = async (docId) => { await deleteDoc(doc(db, 'gentz_contacts', docId)) }
  const filtered = BUYERS.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display:'flex', height:'100%', background:'#080d1a' }}>
      {/* Buyer list */}
      <div style={{ width:'300px', borderRight:'1px solid #1e2d47', overflowY:'auto', flexShrink:0 }}>
        <div style={{ padding:'12px', borderBottom:'1px solid #1e2d47' }}>
          <input placeholder="Search buyers…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%', padding:'8px 12px', background:'#1a2540', border:'1px solid #2d3f5e', borderRadius:'6px', color:'#e2e8f0', fontSize:'12px', boxSizing:'border-box', outline:'none' }} />
        </div>
        {filtered.map(b => (
          <div key={b.name} onClick={()=>setSelected(b.name)}
            style={{ padding:'11px 13px', borderBottom:'1px solid #0d1526', cursor:'pointer', display:'flex', gap:'10px', alignItems:'center', background: selected===b.name?'#0d1526':'transparent' }}>
            <LogoImg company={b.name} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'12px', color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</div>
              <div style={{ fontSize:'11px', color:'#475569' }}>
                <span style={{ color:'#60a5fa' }}>{b.deals.length}</span> deal{b.deals.length!==1?'s':''} · <span style={{ color:'#34d399' }}>{fmt$(b.totalVol)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail */}
      {buyer ? (
        <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
          <div style={{ display:'flex', gap:'16px', alignItems:'flex-start', marginBottom:'24px' }}>
            <LogoImg company={buyer.name} />
            <div>
              <h2 style={{ margin:'0 0 4px', fontSize:'20px', fontWeight:800, color:'#f8fafc' }}>{buyer.name}</h2>
              <div style={{ display:'flex', gap:'20px', fontSize:'12px' }}>
                <span><span style={{ color:'#60a5fa', fontWeight:700 }}>{buyer.deals.length}</span> <span style={{ color:'#475569' }}>acquisitions</span></span>
                <span><span style={{ color:'#34d399', fontWeight:700 }}>{fmt$(buyer.totalVol)}</span> <span style={{ color:'#475569' }}>total volume</span></span>
                <span><span style={{ color:'#f59e0b', fontWeight:700 }}>{buyer.totalSF > 0 ? `${(buyer.totalSF/1000).toFixed(0)}K SF` : '—'}</span> <span style={{ color:'#475569' }}>acquired</span></span>
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'10px', color:'#475569', letterSpacing:'0.1em', marginBottom:'12px' }}>CONTACTS</div>
              {contacts.length === 0 && <div style={{ fontSize:'12px', color:'#334155', marginBottom:'8px' }}>No contacts yet</div>}
              {contacts.map(c => <ContactCard key={c._docId} contact={c} buyerName={buyer.name} currentUser={currentUser} onDelete={deleteContact} />)}
              <AddContactForm buyerName={buyer.name} />
            </div>

            <div style={{ background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'10px', color:'#475569', letterSpacing:'0.1em', marginBottom:'12px' }}>ACQUISITIONS IN SD</div>
              {buyer.deals.sort((a,b)=>(b.saleDate||'').localeCompare(a.saleDate||'')).map((d,i) => (
                <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid #1a2540' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                    <span style={{ fontSize:'12px', color:'#e2e8f0', fontWeight:600 }}>{d.name||d.address}</span>
                    <span style={{ fontSize:'11px', color:'#34d399', fontWeight:700 }}>{fmt$(d.salePrice)}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'#475569' }}>
                    {d.city} · {d.sf?.toLocaleString()} SF · {d.saleDate?.slice(0,10)}
                    {d.pricePerSF > 0 ? ` · $${d.pricePerSF.toFixed(0)}/SF` : ''}
                    {d.capRate > 0 ? ` · ${(d.capRate*100).toFixed(2)}% cap` : ''}
                  </div>
                  {d.seller && <div style={{ fontSize:'10px', color:'#334155' }}>Seller: {d.seller}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', color:'#334155' }}>
            <div style={{ fontSize:'32px', marginBottom:'8px' }}>🎯</div>
            <div style={{ fontSize:'14px' }}>Select a buyer to view details</div>
            <div style={{ fontSize:'11px', marginTop:'4px' }}>{BUYERS.length} buyers from SD comps</div>
          </div>
        </div>
      )}
    </div>
  )
}
