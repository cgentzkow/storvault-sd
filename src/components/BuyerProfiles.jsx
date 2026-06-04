import { useState, useEffect, useMemo } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import compsData from '../data/comps.json'
import propertiesData from '../data/properties.json'

function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

// Build master buyer list: comps buyers + major SD owners
function buildBuyers() {
  const map = {}

  // 1. From comps (active purchasers)
  compsData.forEach(c => {
    if (!c.buyer) return
    const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
    if (!name || name === 'Unknown') return
    if (!map[name]) map[name] = { name, deals: [], totalVol: 0, totalSF: 0, sdProps: 0, sdSF: 0, source: 'comps' }
    map[name].deals.push(c)
    map[name].totalVol += c.salePrice || 0
    map[name].totalSF += c.sf || 0
  })

  // 2. From SD property ownership (major players who own but may not have bought recently)
  const ownerTotals = {}
  propertiesData.forEach(p => {
    const key = (p.parentCompany || p.trueOwner || p.owner || '').trim()
    if (!key || key === 'nan') return
    if (!ownerTotals[key]) ownerTotals[key] = { count: 0, sf: 0 }
    ownerTotals[key].count++
    ownerTotals[key].sf += p.sf || 0
  })

  // Add major owners not already in comps
  Object.entries(ownerTotals).forEach(([name, data]) => {
    if (data.sf < 50000) return // skip tiny owners
    const alreadyIn = Object.keys(map).some(k => k.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || name.toLowerCase().includes(k.toLowerCase().split(' ')[0]))
    if (!alreadyIn) {
      map[name] = { name, deals: [], totalVol: 0, totalSF: 0, sdProps: data.count, sdSF: data.sf, source: 'owner' }
    } else {
      // Update existing entry with ownership data
      const existing = Object.values(map).find(b => b.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) || name.toLowerCase().includes(b.name.toLowerCase().split(' ')[0]))
      if (existing) { existing.sdProps = data.count; existing.sdSF = data.sf }
    }
  })

  // Sort: comps buyers by volume, then owners by SF
  return Object.values(map).sort((a, b) => {
    if (a.deals.length && !b.deals.length) return -1
    if (!a.deals.length && b.deals.length) return 1
    if (a.deals.length && b.deals.length) return b.totalVol - a.totalVol
    return b.sdSF - a.sdSF
  })
}

const BUYERS = buildBuyers()

function LogoImg({ company, size = 48 }) {
  const [err, setErr] = useState(false)
  if (!company || err) {
    const init = company ? company.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() : '?'
    return <div style={{ width:`${size}px`,height:`${size}px`,borderRadius:'8px',background:'#1e2d47',display:'flex',alignItems:'center',justifyContent:'center',fontSize:`${size*0.3}px`,fontWeight:700,color:'#f59e0b',flexShrink:0 }}>{init}</div>
  }
  return <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(company)}`} alt={company} onError={()=>setErr(true)} style={{ width:`${size}px`,height:`${size}px`,objectFit:'contain',borderRadius:'8px',background:'#1e2d47',padding:'4px',flexShrink:0 }} />
}

function ActionNotePopup({ contact, action, buyerName, currentUser, onClose }) {
  const [note, setNote] = useState('')
  const actionIcon = { call:'📞', text:'💬', email:'📧' }[action]
  const actionHref = action==='call'?`tel:${contact.phone}`:action==='text'?`sms:${contact.phone}`:`mailto:${contact.email}?subject=Re: ${buyerName}`

  const save = async () => {
    if (note.trim()) {
      await addDoc(collection(db, 'gentz_notes'), {
        id: uid(), text: note.trim(),
        type: action==='call'?'call':action==='text'?'text':'email',
        author: currentUser?.name || 'Unknown', authorId: currentUser?.id || 'U',
        timestamp: new Date().toISOString(), source: 'storvault',
        linkedContacts: [contact.id || contact._docId],
        linkedProperties: [], linkedLeads: [], linkedDeals: [], linkedProjects: [], linkedTenants: [],
        contactName: contact.name, company: buyerName,
      })
    }
    onClose()
  }

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'12px',padding:'24px',width:'380px' }}>
        <div style={{ fontSize:'16px',fontWeight:700,color:'#f8fafc',marginBottom:'4px' }}>{actionIcon} Log {action}</div>
        <div style={{ fontSize:'12px',color:'#64748b',marginBottom:'16px' }}>{contact.name} · {buyerName}</div>
        <a href={actionHref} style={{ display:'block',textAlign:'center',padding:'10px',marginBottom:'16px',background:action==='call'?'#1e3a5f':action==='text'?'#1a3a2a':'#2a1a3a',border:`1px solid ${action==='call'?'#2d5a8e':action==='text'?'#2d5e40':'#5e2d8e'}`,borderRadius:'8px',color:action==='call'?'#60a5fa':action==='text'?'#34d399':'#a78bfa',fontWeight:700,fontSize:'14px',textDecoration:'none' }}>
          {actionIcon} {action==='email'?contact.email:contact.phone}
        </a>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add note… (optional)" rows={3}
          style={{ width:'100%',padding:'10px',background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'6px',color:'#e2e8f0',fontSize:'13px',resize:'none',marginBottom:'12px',boxSizing:'border-box' }} />
        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={save} style={{ flex:1,padding:'10px',background:'#f59e0b',border:'none',borderRadius:'6px',color:'#000',fontWeight:700,fontSize:'13px',cursor:'pointer' }}>
            {note.trim()?'Save Note & Close':'Close'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px',background:'#1e2d47',border:'none',borderRadius:'6px',color:'#94a3b8',fontSize:'13px',cursor:'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function ContactCard({ contact, buyerName, currentUser, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [actionPopup, setActionPopup] = useState(null)
  const [notes, setNotes] = useState([])
  const [editData, setEditData] = useState({ name:contact.name||'', title:contact.title||'', phone:contact.phone||'', email:contact.email||'' })

  useEffect(() => {
    if (!showNotes) return
    const q = query(collection(db,'gentz_notes'), where('linkedContacts','array-contains',contact.id||contact._docId))
    const unsub = onSnapshot(q, snap => setNotes(snap.docs.map(d=>({_docId:d.id,...d.data()})).sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''))))
    return () => unsub()
  }, [showNotes, contact._docId])

  const saveEdit = async () => { await updateDoc(doc(db,'gentz_contacts',contact._docId), editData); setEditing(false) }
  const inp = { background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#e2e8f0',fontSize:'12px',padding:'6px 9px',width:'100%',boxSizing:'border-box',outline:'none' }
  const typeIco = { call:'📞',text:'💬',email:'📧',note:'📝',meeting:'🤝',voicemail:'📱' }

  if (editing) return (
    <div style={{ background:'#0a1122',borderRadius:'8px',padding:'12px',marginBottom:'8px',border:'1px solid #2d3f5e' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'8px' }}>
        <input placeholder="Name *" value={editData.name} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} style={inp} />
        <input placeholder="Title" value={editData.title} onChange={e=>setEditData(d=>({...d,title:e.target.value}))} style={inp} />
        <input placeholder="Phone" value={editData.phone} onChange={e=>setEditData(d=>({...d,phone:e.target.value}))} style={inp} />
        <input placeholder="Email" value={editData.email} onChange={e=>setEditData(d=>({...d,email:e.target.value}))} style={inp} />
      </div>
      <div style={{ display:'flex',gap:'7px' }}>
        <button onClick={saveEdit} style={{ flex:1,padding:'7px',background:'#f59e0b',border:'none',borderRadius:'5px',color:'#000',fontWeight:700,fontSize:'11px',cursor:'pointer' }}>Save</button>
        <button onClick={()=>setEditing(false)} style={{ padding:'7px 14px',background:'#1e2d47',border:'none',borderRadius:'5px',color:'#94a3b8',fontSize:'11px',cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <>
      {actionPopup && <ActionNotePopup contact={contact} action={actionPopup} buyerName={buyerName} currentUser={currentUser} onClose={()=>setActionPopup(null)} />}
      <div style={{ background:'#0a1122',borderRadius:'8px',padding:'12px',marginBottom:'8px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:'13px',color:'#e2e8f0',marginBottom:'2px' }}>{contact.name}</div>
            {contact.title && <div style={{ fontSize:'11px',color:'#64748b',marginBottom:'4px' }}>{contact.title}</div>}
            {contact.phone && <div style={{ fontSize:'11px',color:'#94a3b8',marginBottom:'2px' }}>📞 {contact.phone}</div>}
            {contact.email && <div style={{ fontSize:'11px',color:'#94a3b8' }}>✉️ {contact.email}</div>}
          </div>
          <div style={{ display:'flex',gap:'4px' }}>
            <button onClick={()=>setEditing(true)} style={{ background:'#1e2d47',border:'none',color:'#64748b',cursor:'pointer',borderRadius:'4px',padding:'3px 8px',fontSize:'10px' }}>✎</button>
            <button onClick={()=>onDelete(contact._docId)} style={{ background:'none',border:'none',color:'#334155',cursor:'pointer',fontSize:'13px' }}>✕</button>
          </div>
        </div>
        <div style={{ display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'8px' }}>
          {contact.phone && <>
            <button onClick={()=>setActionPopup('call')} style={{ padding:'4px 10px',background:'#1e3a5f',border:'1px solid #2d5a8e',borderRadius:'5px',color:'#60a5fa',fontSize:'10px',fontWeight:700,cursor:'pointer' }}>📞 Call</button>
            <button onClick={()=>setActionPopup('text')} style={{ padding:'4px 10px',background:'#1a3a2a',border:'1px solid #2d5e40',borderRadius:'5px',color:'#34d399',fontSize:'10px',fontWeight:700,cursor:'pointer' }}>💬 Text</button>
          </>}
          {contact.email && <button onClick={()=>setActionPopup('email')} style={{ padding:'4px 10px',background:'#2a1a3a',border:'1px solid #5e2d8e',borderRadius:'5px',color:'#a78bfa',fontSize:'10px',fontWeight:700,cursor:'pointer' }}>✉️ Email</button>}
          <button onClick={()=>setShowNotes(v=>!v)} style={{ padding:'4px 10px',background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#64748b',fontSize:'10px',cursor:'pointer',marginLeft:'auto' }}>
            📝 {notes.length>0?`(${notes.length})`:'Notes'}
          </button>
        </div>
        {showNotes && (
          <div style={{ borderTop:'1px solid #1e2d47',paddingTop:'8px' }}>
            {notes.length===0 && <div style={{ fontSize:'11px',color:'#334155',marginBottom:'6px' }}>No notes yet</div>}
            {notes.map(n => (
              <div key={n._docId} style={{ padding:'6px',background:'#1a2540',borderRadius:'5px',marginBottom:'4px' }}>
                <div style={{ fontSize:'10px',color:'#64748b',marginBottom:'2px' }}>{typeIco[n.type]||'📝'} {n.author} · {n.timestamp?.slice(0,10)}</div>
                <div style={{ fontSize:'11px',color:'#cbd5e1' }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function AddContactForm({ buyerName }) {
  const [show, setShow] = useState(false)
  const [f, setF] = useState({ name:'',title:'',phone:'',email:'' })
  const save = async () => {
    if (!f.name.trim()) return
    await addDoc(collection(db,'gentz_contacts'), { id:uid(),...f,company:buyerName,type:'buyer',source:'storvault',createdAt:new Date().toISOString() })
    setF({ name:'',title:'',phone:'',email:'' }); setShow(false)
  }
  const inp = { background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#e2e8f0',fontSize:'12px',padding:'7px 10px',width:'100%',boxSizing:'border-box',outline:'none' }
  if (!show) return <button onClick={()=>setShow(true)} style={{ width:'100%',padding:'7px',background:'transparent',border:'1px dashed #2d3f5e',borderRadius:'6px',color:'#475569',fontSize:'11px',cursor:'pointer',marginTop:'4px' }}>+ Add Contact</button>
  return (
    <div style={{ background:'#0a1122',border:'1px solid #1e2d47',borderRadius:'8px',padding:'12px',marginTop:'6px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'8px' }}>
        <input placeholder="Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))} style={inp} />
        <input placeholder="Title" value={f.title} onChange={e=>setF(d=>({...d,title:e.target.value}))} style={inp} />
        <input placeholder="Phone" value={f.phone} onChange={e=>setF(d=>({...d,phone:e.target.value}))} style={inp} />
        <input placeholder="Email" value={f.email} onChange={e=>setF(d=>({...d,email:e.target.value}))} style={inp} />
      </div>
      <div style={{ display:'flex',gap:'7px' }}>
        <button onClick={save} style={{ flex:1,padding:'7px',background:'#f59e0b',border:'none',borderRadius:'5px',color:'#000',fontWeight:700,fontSize:'11px',cursor:'pointer' }}>Save</button>
        <button onClick={()=>setShow(false)} style={{ padding:'7px 14px',background:'#1e2d47',border:'none',borderRadius:'5px',color:'#94a3b8',fontSize:'11px',cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function BuyerProfiles({ currentUser }) {
  const [selected, setSelected] = useState(null)
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all') // all | comps | owners

  const buyer = selected ? BUYERS.find(b => b.name === selected) : null

  useEffect(() => {
    if (!selected) return
    // Search by company name and also by partial matches
    const q = query(collection(db,'gentz_contacts'), where('company','==',selected))
    const unsub = onSnapshot(q, snap => setContacts(snap.docs.map(d=>({_docId:d.id,...d.data()}))))
    return () => unsub()
  }, [selected])

  const deleteContact = async (docId) => { await deleteDoc(doc(db,'gentz_contacts',docId)) }

  const filtered = BUYERS.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false
    if (tab === 'comps') return b.deals.length > 0
    if (tab === 'owners') return b.sdProps > 0
    return true
  })

  return (
    <div style={{ display:'flex',height:'100%',background:'#080d1a' }}>
      {/* Buyer list */}
      <div style={{ width:'300px',borderRight:'1px solid #1e2d47',overflowY:'auto',flexShrink:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'12px',borderBottom:'1px solid #1e2d47' }}>
          <input placeholder="Search buyers…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%',padding:'8px 12px',background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'6px',color:'#e2e8f0',fontSize:'12px',boxSizing:'border-box',outline:'none',marginBottom:'8px' }} />
          <div style={{ display:'flex',gap:'4px' }}>
            {[['all','All'],['comps','Buyers'],['owners','Owners']].map(([v,l]) => (
              <button key={v} onClick={()=>setTab(v)} style={{ flex:1,padding:'4px',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'10px',fontWeight:700,background:tab===v?'#f59e0b':'#1e2d47',color:tab===v?'#000':'#94a3b8' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>
          {filtered.map(b => (
            <div key={b.name} onClick={()=>setSelected(b.name)}
              style={{ padding:'10px 12px',borderBottom:'1px solid #0d1526',cursor:'pointer',display:'flex',gap:'10px',alignItems:'center',background:selected===b.name?'#0d1526':'transparent' }}>
              <LogoImg company={b.name} size={36} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:'11px',color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{b.name}</div>
                <div style={{ fontSize:'10px',color:'#475569' }}>
                  {b.deals.length > 0 && <span><span style={{ color:'#60a5fa' }}>{b.deals.length}</span> deal{b.deals.length!==1?'s':''} · <span style={{ color:'#34d399' }}>{fmt$(b.totalVol)}</span></span>}
                  {b.deals.length > 0 && b.sdProps > 0 && ' · '}
                  {b.sdProps > 0 && <span><span style={{ color:'#f59e0b' }}>{b.sdProps}</span> SD props</span>}
                </div>
              </div>
              {b.source === 'owner' && b.deals.length === 0 && <span style={{ fontSize:'9px',color:'#334155',flexShrink:0 }}>OWNER</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      {buyer ? (
        <div style={{ flex:1,overflowY:'auto',padding:'24px' }}>
          <div style={{ display:'flex',gap:'16px',alignItems:'flex-start',marginBottom:'24px' }}>
            <LogoImg company={buyer.name} size={56} />
            <div>
              <h2 style={{ margin:'0 0 6px',fontSize:'20px',fontWeight:800,color:'#f8fafc' }}>{buyer.name}</h2>
              <div style={{ display:'flex',gap:'20px',fontSize:'12px',flexWrap:'wrap' }}>
                {buyer.deals.length > 0 && <span><span style={{ color:'#60a5fa',fontWeight:700 }}>{buyer.deals.length}</span> <span style={{ color:'#475569' }}>SD acquisitions</span></span>}
                {buyer.totalVol > 0 && <span><span style={{ color:'#34d399',fontWeight:700 }}>{fmt$(buyer.totalVol)}</span> <span style={{ color:'#475569' }}>volume</span></span>}
                {buyer.sdProps > 0 && <span><span style={{ color:'#f59e0b',fontWeight:700 }}>{buyer.sdProps}</span> <span style={{ color:'#475569' }}>SD properties owned</span></span>}
                {buyer.sdSF > 0 && <span><span style={{ color:'#a78bfa',fontWeight:700 }}>{(buyer.sdSF/1000).toFixed(0)}K SF</span> <span style={{ color:'#475569' }}>owned</span></span>}
              </div>
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px' }}>
            <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'16px' }}>
              <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'12px' }}>CONTACTS</div>
              {contacts.length===0 && <div style={{ fontSize:'12px',color:'#334155',marginBottom:'8px' }}>No contacts yet</div>}
              {contacts.map(c => <ContactCard key={c._docId} contact={c} buyerName={buyer.name} currentUser={currentUser} onDelete={deleteContact} />)}
              <AddContactForm buyerName={buyer.name} />
            </div>

            <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'16px' }}>
              {buyer.deals.length > 0 ? (
                <>
                  <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'12px' }}>ACQUISITIONS IN SD (since 2019)</div>
                  {buyer.deals.sort((a,b)=>(b.saleDate||'').localeCompare(a.saleDate||'')).map((d,i) => (
                    <div key={i} style={{ padding:'8px 0',borderBottom:'1px solid #1a2540' }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'2px' }}>
                        <span style={{ fontSize:'12px',color:'#e2e8f0',fontWeight:600 }}>{d.name||d.address}</span>
                        <span style={{ fontSize:'11px',color:'#34d399',fontWeight:700 }}>{fmt$(d.salePrice)}</span>
                      </div>
                      <div style={{ fontSize:'10px',color:'#475569' }}>
                        {d.city} · {d.sf?.toLocaleString()} SF · {d.saleDate?.slice(0,10)}
                        {d.pricePerSF>0?` · $${d.pricePerSF.toFixed(0)}/SF`:''}
                        {d.capRate>0?` · ${(d.capRate*100).toFixed(2)}% cap`:''}
                      </div>
                      {d.seller && <div style={{ fontSize:'10px',color:'#334155' }}>Seller: {d.seller}</div>}
                    </div>
                  ))}
                </>
              ) : (
                <div>
                  <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'12px' }}>SD PORTFOLIO</div>
                  <div style={{ fontSize:'12px',color:'#64748b',marginBottom:'12px' }}>
                    No recorded transactions since Jan 2019. Major SD owner — <strong style={{ color:'#f59e0b' }}>{buyer.sdProps} properties</strong>, <strong style={{ color:'#a78bfa' }}>{(buyer.sdSF/1000).toFixed(0)}K SF</strong>.
                  </div>
                  {buyer.name.toLowerCase().includes('u-haul') && (
                    <div style={{ background:'#0a1122',border:'1px solid #1e2d47',borderRadius:'8px',padding:'12px' }}>
                      <div style={{ fontSize:'11px',color:'#f59e0b',fontWeight:700,marginBottom:'8px' }}>📋 U-Haul Acquisition Criteria</div>
                      <div style={{ fontSize:'11px',color:'#94a3b8',lineHeight:1.7 }}>
                        • 60,000+ SF existing building or 4+ acres bare land<br/>
                        • 200' minimum frontage<br/>
                        • 30,000+ cars/day traffic count<br/>
                        • Zoning compatible with self-storage & truck rental<br/>
                        • 50,000 SF minimum net rentable self-storage<br/>
                        • 24' minimum clear height for UBOX<br/>
                        • 60,000+ people within 3-mile radius
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ textAlign:'center',color:'#334155' }}>
            <div style={{ fontSize:'32px',marginBottom:'8px' }}>🎯</div>
            <div style={{ fontSize:'14px' }}>Select a buyer to view details</div>
            <div style={{ fontSize:'11px',marginTop:'4px' }}>{filtered.length} buyers and major owners</div>
          </div>
        </div>
      )}
    </div>
  )
}
