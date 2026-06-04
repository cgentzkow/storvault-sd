import { useState, useEffect, useRef, useMemo } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, setDoc } from 'firebase/firestore'
import { useGoogleMaps } from '../hooks/useGoogleMaps.js'
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
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }

// Normalize contact to always have phones/emails arrays
function normalizeContact(c) {
  const phones = c.phones?.length
    ? c.phones
    : c.phone ? [{ number: c.phone, label: 'Direct' }] : []
  const emails = c.emails?.length
    ? c.emails
    : c.email ? [{ address: c.email, label: 'Work' }] : []
  return { ...c, phones, emails }
}

// Build master buyer list from comps + property owners
function buildBuyers() {
  const map = {}
  compsData.forEach(c => {
    if (!c.buyer) return
    const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
    if (!name || name === 'Unknown') return
    if (!map[name]) map[name] = { name, deals: [], totalVol: 0, totalSF: 0, sdProps: 0, sdSF: 0, source: 'comps' }
    map[name].deals.push(c)
    map[name].totalVol += c.salePrice || 0
    map[name].totalSF += c.sf || 0
  })
  const ownerTotals = {}
  propertiesData.forEach(p => {
    const key = (p.parentCompany || p.trueOwner || p.owner || '').trim()
    if (!key || key === 'nan') return
    if (!ownerTotals[key]) ownerTotals[key] = { count: 0, sf: 0 }
    ownerTotals[key].count++
    ownerTotals[key].sf += p.sf || 0
  })
  Object.entries(ownerTotals).forEach(([name, data]) => {
    if (data.sf < 50000) return
    const alreadyIn = Object.keys(map).some(k =>
      k.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
      name.toLowerCase().includes(k.toLowerCase().split(' ')[0])
    )
    if (!alreadyIn) {
      map[name] = { name, deals: [], totalVol: 0, totalSF: 0, sdProps: data.count, sdSF: data.sf, source: 'owner' }
    } else {
      const existing = Object.values(map).find(b =>
        b.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
        name.toLowerCase().includes(b.name.toLowerCase().split(' ')[0])
      )
      if (existing) { existing.sdProps = data.count; existing.sdSF = data.sf }
    }
  })
  return Object.values(map).sort((a, b) => {
    if (a.deals.length && !b.deals.length) return -1
    if (!a.deals.length && b.deals.length) return 1
    if (a.deals.length && b.deals.length) return b.totalVol - a.totalVol
    return b.sdSF - a.sdSF
  })
}
const BUYERS = buildBuyers()

// Get properties owned by a buyer using same fuzzy matching as buildBuyers
function getOwnedProperties(buyerName) {
  if (!buyerName) return []
  const firstWord = buyerName.toLowerCase().split(' ')[0]
  return propertiesData.filter(p => {
    const ownerKey = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
    const ownerFirst = ownerKey.split(' ')[0]
    return ownerKey.includes(firstWord) || firstWord.includes(ownerFirst)
  })
}

const LOGO_URLS = {
  'Public Storage': 'https://logos.gentz.co/logo/public_storage',
  'Extra Space Storage': 'https://logos.gentz.co/logo/extra-space-storage',
  'CubeSmart': 'https://logos.gentz.co/logo/cubesmart',
  'Uhaul': 'https://logos.gentz.co/logo/Uhaul',
  'National Storage Affiliates': 'https://logos.gentz.co/logo/national-storage-affiliates',
  'SmartStop Self Storage': 'https://logos.gentz.co/logo/smartstop',
  'Simply Self Storage': 'https://logos.gentz.co/logo/simply-self-storage',
  'Life Storage': 'https://logos.gentz.co/logo/life-storage',
  'StorQuest Self Storage': 'https://logos.gentz.co/logo/storquest',
  'Trojan Storage': 'https://logos.gentz.co/logo/trojan-storage',
  'InSite Property Group': 'https://logos.gentz.co/logo/insite_property_group',
  'San Diego Self Storage': 'https://logos.gentz.co/logo/san_diego_self_storage',
  'Miramar Self Storage': 'https://logos.gentz.co/logo/miramar-self-storage',
  'The Caster Group': 'https://logos.gentz.co/logo/the_caster_group',
  'BACO Properties': 'https://logos.gentz.co/logo/baco-properties',
  'Baranof Holdings': 'https://logos.gentz.co/logo/baranof-holdings',
  'Tierra Corporation': 'https://logos.gentz.co/logo/tierra-corporation',
  'Danube Properties': 'https://logos.gentz.co/logo/danube-properties',
  'The Ezralow Company': 'https://logos.gentz.co/logo/ezralow',
  'Westport Properties': 'https://logos.gentz.co/logo/westport-properties',
  'Pacifica Companies': 'https://logos.gentz.co/logo/pacifica-companies',
  'Price Self Storage': 'https://logos.gentz.co/logo/price_self_storage',
  'Ares Management Corporation': 'https://logos.gentz.co/logo/ares-management',
  'Artemis Real Estate Partners': 'https://logos.gentz.co/logo/artemis-real-estate',
  'Blue Vista': 'https://logos.gentz.co/logo/blue-vista',
  'Clear Sky Capital': 'https://logos.gentz.co/logo/clear-sky-capital',
  'Prime Group Holdings': 'https://logos.gentz.co/logo/prime_group_holdings',
  'Merit Hill Capital': 'https://logos.gentz.co/logo/merit_hill_capital',
  'Encinitas Self Storage': 'https://logos.gentz.co/logo/encinitas_self_storage',
  'Greens Global': 'https://logos.gentz.co/logo/greens_global',
  'Northwest Building, LLC': 'https://logos.gentz.co/logo/northwest_building',
  'Sentry Storage Solutions': 'https://logos.gentz.co/logo/sentry_storage',
  'Chicago Capital Funds': 'https://logos.gentz.co/logo/chicago_capital_funds',
  'CBRE Investment Management': 'https://logos.gentz.co/logo/cbre_investment',
  'Dan Floit': 'https://logos.gentz.co/logo/dan_floit',
}
function getLogoUrl(company) {
  if (!company) return null
  const n = company.toLowerCase()
  if (LOGO_URLS[company]) return LOGO_URLS[company]
  if (n.includes('public storage')) return LOGO_URLS['Public Storage']
  if (n.includes('extra space')) return LOGO_URLS['Extra Space Storage']
  if (n.includes('cubesmart')) return LOGO_URLS['CubeSmart']
  if (n.includes('u-haul') || n.includes('uhaul')) return LOGO_URLS['Uhaul']
  if (n.includes('national storage affiliates')) return LOGO_URLS['National Storage Affiliates']
  if (n.includes('smartstop') || n.includes('strategic storage')) return LOGO_URLS['SmartStop Self Storage']
  if (n.includes('simply self')) return LOGO_URLS['Simply Self Storage']
  if (n.includes('life storage')) return LOGO_URLS['Life Storage']
  if (n.includes('william warren') || n.includes('storquest') || n.includes('stor-quest')) return LOGO_URLS['StorQuest Self Storage']
  if (n.includes('trojan storage')) return LOGO_URLS['Trojan Storage']
  if (n.includes('insite') || n.includes('securespace')) return LOGO_URLS['InSite Property Group']
  if (n.includes('san diego self storage')) return LOGO_URLS['San Diego Self Storage']
  if (n.includes('miramar self storage')) return LOGO_URLS['Miramar Self Storage']
  if (n.includes('caster') || n.includes('a-1 self storage')) return LOGO_URLS['The Caster Group']
  if (n.includes('baco properties')) return LOGO_URLS['BACO Properties']
  if (n.includes('baranof')) return LOGO_URLS['Baranof Holdings']
  if (n.includes('tierra corporation')) return LOGO_URLS['Tierra Corporation']
  if (n.includes('westport properties')) return LOGO_URLS['Westport Properties']
  if (n.includes('price self storage')) return LOGO_URLS['Price Self Storage']
  if (n.includes('ares management')) return LOGO_URLS['Ares Management Corporation']
  if (n.includes('blue vista')) return LOGO_URLS['Blue Vista']
  if (n.includes('prime group')) return LOGO_URLS['Prime Group Holdings']
  if (n.includes('merit hill')) return LOGO_URLS['Merit Hill Capital']
  if (n.includes('cbre')) return LOGO_URLS['CBRE Investment Management']
  return null
}

function LogoImg({ company, size = 48 }) {
  const [err, setErr] = useState(false)
  const url = getLogoUrl(company)
  const init = company ? company.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() : '?'
  if (!url || err) return (
    <div style={{ width:`${size}px`,height:`${size}px`,borderRadius:'8px',background:'#1e2d47',display:'flex',alignItems:'center',justifyContent:'center',fontSize:`${size*0.3}px`,fontWeight:700,color:'#f59e0b',flexShrink:0 }}>{init}</div>
  )
  return <img src={url} alt={company} onError={()=>setErr(true)} style={{ width:`${size}px`,height:`${size}px`,objectFit:'contain',borderRadius:'8px',background:'#fff',padding:'4px',flexShrink:0 }} />
}

// Action popup for logging calls/texts/emails
function ActionNotePopup({ contact, action, phone, email, buyerName, currentUser, onClose }) {
  const [note, setNote] = useState('')
  const actionIcon = { call:'📞', text:'💬', email:'📧' }[action]
  const actionHref = action==='call'?`tel:${phone}`:action==='text'?`sms:${phone}`:`mailto:${email}?subject=Re: ${buyerName}`
  const displayVal = action==='email' ? email : phone

  const save = async () => {
    if (note.trim()) {
      await addDoc(collection(db, 'gentz_notes'), {
        id: uid(), text: note.trim(),
        type: action==='call'?'call':action==='text'?'text':'email',
        author: currentUser?.name||'Unknown', authorId: currentUser?.id||'U',
        timestamp: new Date().toISOString(), source: 'storvault',
        linkedContacts: [contact.id||contact._docId],
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
          {actionIcon} {displayVal}
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

const PHONE_LABELS = ['Direct','Mobile','Office','Fax','Other']
const EMAIL_LABELS = ['Work','Personal','Other']

function ContactCard({ contact: rawContact, buyerName, currentUser, onDelete }) {
  const contact = normalizeContact(rawContact)
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [actionPopup, setActionPopup] = useState(null) // {action, phone?, email?}
  const [notes, setNotes] = useState([])
  const [editPhones, setEditPhones] = useState(contact.phones.length ? contact.phones : [{ number:'', label:'Direct' }])
  const [editEmails, setEditEmails] = useState(contact.emails.length ? contact.emails : [{ address:'', label:'Work' }])
  const [editName, setEditName] = useState(contact.name||'')
  const [editTitle, setEditTitle] = useState(contact.title||'')

  useEffect(() => {
    if (!showNotes) return
    const q = query(collection(db,'gentz_notes'), where('linkedContacts','array-contains',contact.id||contact._docId))
    const unsub = onSnapshot(q, snap => setNotes(snap.docs.map(d=>({_docId:d.id,...d.data()})).sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''))))
    return () => unsub()
  }, [showNotes, contact._docId])

  const saveEdit = async () => {
    const phones = editPhones.filter(p=>p.number.trim())
    const emails = editEmails.filter(e=>e.address.trim())
    await updateDoc(doc(db,'gentz_contacts',contact._docId), {
      name: editName, title: editTitle, phones, emails,
      // keep legacy fields for backward compat
      phone: phones[0]?.number||'', email: emails[0]?.address||''
    })
    setEditing(false)
  }

  const inp = { background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#e2e8f0',fontSize:'12px',padding:'5px 8px',boxSizing:'border-box',outline:'none',flex:1 }
  const sel = { ...inp, flex:'0 0 80px' }
  const typeIco = { call:'📞',text:'💬',email:'📧',note:'📝',meeting:'🤝',voicemail:'📱' }

  if (editing) return (
    <div style={{ background:'#0a1122',borderRadius:'8px',padding:'12px',marginBottom:'8px',border:'1px solid #2d3f5e' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'10px' }}>
        <input placeholder="Name *" value={editName} onChange={e=>setEditName(e.target.value)} style={{ ...inp, width:'100%' }} />
        <input placeholder="Title" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{ ...inp, width:'100%' }} />
      </div>

      {/* Phones */}
      <div style={{ marginBottom:'8px' }}>
        <div style={{ fontSize:'10px',color:'#475569',marginBottom:'4px' }}>PHONES</div>
        {editPhones.map((ph,i) => (
          <div key={i} style={{ display:'flex',gap:'5px',marginBottom:'4px',alignItems:'center' }}>
            <input placeholder="Number" value={ph.number} onChange={e=>setEditPhones(arr=>arr.map((x,j)=>j===i?{...x,number:e.target.value}:x))} style={inp} />
            <select value={ph.label} onChange={e=>setEditPhones(arr=>arr.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={sel}>
              {PHONE_LABELS.map(l=><option key={l}>{l}</option>)}
            </select>
            {editPhones.length > 1 && <button onClick={()=>setEditPhones(arr=>arr.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'14px',padding:'0 2px' }}>✕</button>}
          </div>
        ))}
        <button onClick={()=>setEditPhones(arr=>[...arr,{number:'',label:'Mobile'}])} style={{ fontSize:'10px',color:'#f59e0b',background:'none',border:'none',cursor:'pointer',padding:'2px 0' }}>+ Add Phone</button>
      </div>

      {/* Emails */}
      <div style={{ marginBottom:'10px' }}>
        <div style={{ fontSize:'10px',color:'#475569',marginBottom:'4px' }}>EMAILS</div>
        {editEmails.map((em,i) => (
          <div key={i} style={{ display:'flex',gap:'5px',marginBottom:'4px',alignItems:'center' }}>
            <input placeholder="Email address" value={em.address} onChange={e=>setEditEmails(arr=>arr.map((x,j)=>j===i?{...x,address:e.target.value}:x))} style={inp} />
            <select value={em.label} onChange={e=>setEditEmails(arr=>arr.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={sel}>
              {EMAIL_LABELS.map(l=><option key={l}>{l}</option>)}
            </select>
            {editEmails.length > 1 && <button onClick={()=>setEditEmails(arr=>arr.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'14px',padding:'0 2px' }}>✕</button>}
          </div>
        ))}
        <button onClick={()=>setEditEmails(arr=>[...arr,{address:'',label:'Work'}])} style={{ fontSize:'10px',color:'#f59e0b',background:'none',border:'none',cursor:'pointer',padding:'2px 0' }}>+ Add Email</button>
      </div>

      <div style={{ display:'flex',gap:'7px' }}>
        <button onClick={saveEdit} style={{ flex:1,padding:'7px',background:'#f59e0b',border:'none',borderRadius:'5px',color:'#000',fontWeight:700,fontSize:'11px',cursor:'pointer' }}>Save</button>
        <button onClick={()=>setEditing(false)} style={{ padding:'7px 14px',background:'#1e2d47',border:'none',borderRadius:'5px',color:'#94a3b8',fontSize:'11px',cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <>
      {actionPopup && (
        <ActionNotePopup
          contact={contact} action={actionPopup.action}
          phone={actionPopup.phone} email={actionPopup.email}
          buyerName={buyerName} currentUser={currentUser}
          onClose={()=>setActionPopup(null)}
        />
      )}
      <div style={{ background:'#0a1122',borderRadius:'8px',padding:'12px',marginBottom:'8px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:'13px',color:'#e2e8f0',marginBottom:'2px' }}>{contact.name}</div>
            {contact.title && <div style={{ fontSize:'11px',color:'#64748b',marginBottom:'6px' }}>{contact.title}</div>}

            {/* All phones */}
            {contact.phones.map((ph,i) => ph.number && (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px' }}>
                <span style={{ fontSize:'11px',color:'#94a3b8' }}>📞 {ph.number}</span>
                <span style={{ fontSize:'9px',color:'#334155',background:'#1e2d47',padding:'1px 5px',borderRadius:'3px' }}>{ph.label}</span>
                <button onClick={()=>setActionPopup({action:'call',phone:ph.number})} style={{ padding:'2px 7px',background:'#1e3a5f',border:'1px solid #2d5a8e',borderRadius:'4px',color:'#60a5fa',fontSize:'9px',fontWeight:700,cursor:'pointer' }}>Call</button>
                <button onClick={()=>setActionPopup({action:'text',phone:ph.number})} style={{ padding:'2px 7px',background:'#1a3a2a',border:'1px solid #2d5e40',borderRadius:'4px',color:'#34d399',fontSize:'9px',fontWeight:700,cursor:'pointer' }}>Text</button>
              </div>
            ))}

            {/* All emails */}
            {contact.emails.map((em,i) => em.address && (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px' }}>
                <span style={{ fontSize:'11px',color:'#94a3b8' }}>✉️ {em.address}</span>
                <span style={{ fontSize:'9px',color:'#334155',background:'#1e2d47',padding:'1px 5px',borderRadius:'3px' }}>{em.label}</span>
                <button onClick={()=>setActionPopup({action:'email',email:em.address})} style={{ padding:'2px 7px',background:'#2a1a3a',border:'1px solid #5e2d8e',borderRadius:'4px',color:'#a78bfa',fontSize:'9px',fontWeight:700,cursor:'pointer' }}>Email</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex',gap:'4px',flexShrink:0 }}>
            <button onClick={()=>setEditing(true)} style={{ background:'#1e2d47',border:'none',color:'#64748b',cursor:'pointer',borderRadius:'4px',padding:'3px 8px',fontSize:'10px' }}>✎</button>
            <button onClick={()=>onDelete(contact._docId)} style={{ background:'none',border:'none',color:'#334155',cursor:'pointer',fontSize:'13px' }}>✕</button>
          </div>
        </div>

        <div style={{ display:'flex',gap:'5px',flexWrap:'wrap' }}>
          <button onClick={()=>setShowNotes(v=>!v)} style={{ padding:'4px 10px',background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#64748b',fontSize:'10px',cursor:'pointer',marginLeft:'auto' }}>
            📝 {notes.length>0?`Notes (${notes.length})`:'Notes'}
          </button>
        </div>

        {showNotes && (
          <div style={{ borderTop:'1px solid #1e2d47',paddingTop:'8px',marginTop:'8px' }}>
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
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [phones, setPhones] = useState([{ number:'', label:'Direct' }])
  const [emails, setEmails] = useState([{ address:'', label:'Work' }])

  const reset = () => { setName(''); setTitle(''); setPhones([{number:'',label:'Direct'}]); setEmails([{address:'',label:'Work'}]); setShow(false) }

  const save = async () => {
    if (!name.trim()) return
    const cleanPhones = phones.filter(p=>p.number.trim())
    const cleanEmails = emails.filter(e=>e.address.trim())
    await addDoc(collection(db,'gentz_contacts'), {
      id: uid(), name, title,
      phones: cleanPhones, emails: cleanEmails,
      // legacy compat
      phone: cleanPhones[0]?.number||'', email: cleanEmails[0]?.address||'',
      company: buyerName, type:'buyer', source:'storvault',
      createdAt: new Date().toISOString()
    })
    reset()
  }

  const inp = { background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'5px',color:'#e2e8f0',fontSize:'12px',padding:'6px 8px',boxSizing:'border-box',outline:'none',flex:1 }
  const sel = { ...inp, flex:'0 0 80px' }

  if (!show) return (
    <button onClick={()=>setShow(true)} style={{ width:'100%',padding:'7px',background:'transparent',border:'1px dashed #2d3f5e',borderRadius:'6px',color:'#475569',fontSize:'11px',cursor:'pointer',marginTop:'4px' }}>
      + Add Contact
    </button>
  )
  return (
    <div style={{ background:'#0a1122',border:'1px solid #1e2d47',borderRadius:'8px',padding:'12px',marginTop:'6px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px',marginBottom:'10px' }}>
        <input placeholder="Name *" value={name} onChange={e=>setName(e.target.value)} style={{ ...inp, width:'100%' }} />
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{ ...inp, width:'100%' }} />
      </div>

      <div style={{ marginBottom:'8px' }}>
        <div style={{ fontSize:'10px',color:'#475569',marginBottom:'4px' }}>PHONES</div>
        {phones.map((ph,i) => (
          <div key={i} style={{ display:'flex',gap:'5px',marginBottom:'4px',alignItems:'center' }}>
            <input placeholder="Number" value={ph.number} onChange={e=>setPhones(arr=>arr.map((x,j)=>j===i?{...x,number:e.target.value}:x))} style={inp} />
            <select value={ph.label} onChange={e=>setPhones(arr=>arr.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={sel}>
              {PHONE_LABELS.map(l=><option key={l}>{l}</option>)}
            </select>
            {phones.length>1 && <button onClick={()=>setPhones(arr=>arr.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'14px',padding:'0 2px' }}>✕</button>}
          </div>
        ))}
        <button onClick={()=>setPhones(arr=>[...arr,{number:'',label:'Mobile'}])} style={{ fontSize:'10px',color:'#f59e0b',background:'none',border:'none',cursor:'pointer',padding:'2px 0' }}>+ Add Phone</button>
      </div>

      <div style={{ marginBottom:'10px' }}>
        <div style={{ fontSize:'10px',color:'#475569',marginBottom:'4px' }}>EMAILS</div>
        {emails.map((em,i) => (
          <div key={i} style={{ display:'flex',gap:'5px',marginBottom:'4px',alignItems:'center' }}>
            <input placeholder="Email address" value={em.address} onChange={e=>setEmails(arr=>arr.map((x,j)=>j===i?{...x,address:e.target.value}:x))} style={inp} />
            <select value={em.label} onChange={e=>setEmails(arr=>arr.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={sel}>
              {EMAIL_LABELS.map(l=><option key={l}>{l}</option>)}
            </select>
            {emails.length>1 && <button onClick={()=>setEmails(arr=>arr.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'14px',padding:'0 2px' }}>✕</button>}
          </div>
        ))}
        <button onClick={()=>setEmails(arr=>[...arr,{address:'',label:'Work'}])} style={{ fontSize:'10px',color:'#f59e0b',background:'none',border:'none',cursor:'pointer',padding:'2px 0' }}>+ Add Email</button>
      </div>

      <div style={{ display:'flex',gap:'7px' }}>
        <button onClick={save} style={{ flex:1,padding:'7px',background:'#f59e0b',border:'none',borderRadius:'5px',color:'#000',fontWeight:700,fontSize:'11px',cursor:'pointer' }}>Save</button>
        <button onClick={reset} style={{ padding:'7px 14px',background:'#1e2d47',border:'none',borderRadius:'5px',color:'#94a3b8',fontSize:'11px',cursor:'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

// Company-level note stored in storvault_buyer_notes
function CompanyNote({ buyerName, currentUser }) {
  const docId = slugify(buyerName)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(null) // ISO timestamp of last save
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db,'storvault_buyer_notes',docId), snap => {
      if (snap.exists()) { setText(snap.data().note||''); setSaved(snap.data().updatedAt||null) }
      setLoaded(true)
    })
    return () => unsub()
  }, [docId])

  const save = async () => {
    const now = new Date().toISOString()
    await setDoc(doc(db,'storvault_buyer_notes',docId), {
      note: text, buyerName, updatedAt: now, updatedBy: currentUser?.name||'Unknown'
    })
    setSaved(now)
  }

  if (!loaded) return null
  return (
    <div style={{ marginTop:'12px' }}>
      <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'6px' }}>COMPANY NOTE</div>
      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={`Notes about ${buyerName}…`}
        rows={4}
        style={{ width:'100%',padding:'9px',background:'#0a1122',border:'1px solid #2d3f5e',borderRadius:'6px',color:'#e2e8f0',fontSize:'12px',resize:'vertical',boxSizing:'border-box',outline:'none',lineHeight:1.5 }}
      />
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'5px' }}>
        {saved && <span style={{ fontSize:'10px',color:'#334155' }}>Saved {saved.slice(0,10)}</span>}
        {!saved && <span />}
        <button onClick={save} style={{ padding:'5px 14px',background:'#1e2d47',border:'1px solid #2d5a8e',borderRadius:'5px',color:'#60a5fa',fontSize:'11px',cursor:'pointer',fontWeight:600 }}>Save Note</button>
      </div>
    </div>
  )
}

// Mini Google Map showing all owned properties
function BuyerMap({ ownedProps, onSelectProperty }) {
  const mapsLoaded = useGoogleMaps()
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !ownedProps.length) return
    const validProps = ownedProps.filter(p => p.lat && p.lng)
    if (!validProps.length) return

    const center = validProps.length === 1
      ? { lat: validProps[0].lat, lng: validProps[0].lng }
      : { lat: validProps.reduce((s,p)=>s+p.lat,0)/validProps.length, lng: validProps.reduce((s,p)=>s+p.lng,0)/validProps.length }

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: validProps.length === 1 ? 13 : 11,
      center,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { elementType:'geometry', stylers:[{color:'#0d1526'}] },
        { elementType:'labels.text.fill', stylers:[{color:'#64748b'}] },
        { elementType:'labels.text.stroke', stylers:[{color:'#0d1526'}] },
        { featureType:'road', elementType:'geometry', stylers:[{color:'#1e2d47'}] },
        { featureType:'water', elementType:'geometry', stylers:[{color:'#080d1a'}] },
        { featureType:'poi', stylers:[{visibility:'off'}] },
      ]
    })

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const bounds = new window.google.maps.LatLngBounds()

    validProps.forEach(p => {
      const marker = new window.google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.address,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#f59e0b',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 1.5,
        }
      })
      marker.addListener('click', () => onSelectProperty && onSelectProperty(p))
      bounds.extend({ lat: p.lat, lng: p.lng })
      markersRef.current.push(marker)
    })

    if (validProps.length > 1) {
      map.fitBounds(bounds)
      // Slight zoom out so markers aren't at edge
      window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 14) map.setZoom(14)
      })
    }
  }, [mapsLoaded, ownedProps.map(p=>p.id).join(',')])

  if (!ownedProps.length) return null

  return (
    <div style={{ borderRadius:'8px',overflow:'hidden',border:'1px solid #1e2d47',marginBottom:'10px' }}>
      <div ref={mapRef} style={{ height:'210px',width:'100%' }} />
    </div>
  )
}

// Single row in owned property list
function PropertyRow({ prop, onSelectProperty }) {
  const status = prop.callStatus || 'not_called'
  const statusColor = { not_called:'#60a5fa',called:'#34d399',interested:'#f59e0b',not_interested:'#94a3b8',under_nda:'#a78bfa',listed:'#f87171' }[status] || '#60a5fa'

  return (
    <div
      onClick={() => onSelectProperty && onSelectProperty(prop)}
      style={{ padding:'8px 10px',borderBottom:'1px solid #0d1526',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',transition:'background 0.1s' }}
      onMouseEnter={e=>e.currentTarget.style.background='#1a2540'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:statusColor,flexShrink:0 }} />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:'12px',color:'#e2e8f0',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {prop.address}
        </div>
        <div style={{ fontSize:'10px',color:'#475569' }}>
          {prop.sf?.toLocaleString()} SF
          {prop.yearBuilt ? ` · ${prop.yearBuilt}` : ''}
          {prop.submarket ? ` · ${prop.submarket}` : ''}
        </div>
      </div>
      {prop.forSale && <span style={{ fontSize:'9px',background:'#1a3a2a',color:'#34d399',border:'1px solid #2d5e40',padding:'2px 5px',borderRadius:'3px',flexShrink:0 }}>FOR SALE</span>}
      <span style={{ fontSize:'10px',color:'#334155',flexShrink:0 }}>→</span>
    </div>
  )
}

export default function BuyerProfiles({ currentUser, properties = [], onSelectProperty }) {
  const [selected, setSelected] = useState(null)
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')

  const buyer = selected ? BUYERS.find(b => b.name === selected) : null

  // Get owned properties merged with call status from live properties array
  const ownedProps = useMemo(() => {
    if (!buyer) return []
    const owned = getOwnedProperties(buyer.name)
    // Merge callStatus from live properties if available
    const liveMap = {}
    properties.forEach(p => { liveMap[String(p.id)] = p })
    return owned.map(p => ({ ...p, callStatus: liveMap[String(p.id)]?.callStatus || 'not_called' }))
  }, [buyer?.name, properties])

  useEffect(() => {
    if (!selected) return
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
      {/* LEFT: buyer list */}
      <div style={{ width:'220px',borderRight:'1px solid #1e2d47',overflowY:'auto',flexShrink:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'10px',borderBottom:'1px solid #1e2d47' }}>
          <input placeholder="Search buyers…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%',padding:'7px 10px',background:'#1a2540',border:'1px solid #2d3f5e',borderRadius:'6px',color:'#e2e8f0',fontSize:'12px',boxSizing:'border-box',outline:'none',marginBottom:'7px' }} />
          <div style={{ display:'flex',gap:'3px' }}>
            {[['all','All'],['comps','Buyers'],['owners','Owners']].map(([v,l]) => (
              <button key={v} onClick={()=>setTab(v)} style={{ flex:1,padding:'4px',border:'none',borderRadius:'4px',cursor:'pointer',fontSize:'10px',fontWeight:700,background:tab===v?'#f59e0b':'#1e2d47',color:tab===v?'#000':'#94a3b8' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>
          {filtered.map(b => (
            <div key={b.name} onClick={()=>setSelected(b.name)}
              style={{ padding:'8px 10px',borderBottom:'1px solid #0d1526',cursor:'pointer',display:'flex',gap:'8px',alignItems:'center',background:selected===b.name?'#0d1526':'transparent' }}>
              <LogoImg company={b.name} size={32} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:'11px',color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{b.name}</div>
                <div style={{ fontSize:'10px',color:'#475569' }}>
                  {b.deals.length > 0 && <span><span style={{ color:'#60a5fa' }}>{b.deals.length}</span> deals · </span>}
                  {b.sdProps > 0 && <span><span style={{ color:'#f59e0b' }}>{b.sdProps}</span> props</span>}
                </div>
              </div>
              {b.source==='owner'&&b.deals.length===0&&<span style={{ fontSize:'9px',color:'#334155' }}>OWNER</span>}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: detail panel */}
      {buyer ? (
        <div style={{ flex:1,overflowY:'auto',padding:'20px' }}>
          {/* Header */}
          <div style={{ display:'flex',gap:'14px',alignItems:'flex-start',marginBottom:'20px' }}>
            <LogoImg company={buyer.name} size={52} />
            <div>
              <h2 style={{ margin:'0 0 5px',fontSize:'18px',fontWeight:800,color:'#f8fafc' }}>{buyer.name}</h2>
              <div style={{ display:'flex',gap:'16px',fontSize:'12px',flexWrap:'wrap' }}>
                {buyer.deals.length>0&&<span><span style={{ color:'#60a5fa',fontWeight:700 }}>{buyer.deals.length}</span> <span style={{ color:'#475569' }}>SD acquisitions</span></span>}
                {buyer.totalVol>0&&<span><span style={{ color:'#34d399',fontWeight:700 }}>{fmt$(buyer.totalVol)}</span> <span style={{ color:'#475569' }}>volume</span></span>}
                {ownedProps.length>0&&<span><span style={{ color:'#f59e0b',fontWeight:700 }}>{ownedProps.length}</span> <span style={{ color:'#475569' }}>SD props owned</span></span>}
                {buyer.sdSF>0&&<span><span style={{ color:'#a78bfa',fontWeight:700 }}>{(buyer.sdSF/1000).toFixed(0)}K SF</span> <span style={{ color:'#475569' }}>owned</span></span>}
              </div>
            </div>
          </div>

          {/* Main grid: left contacts/note, right map/props */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px' }}>

            {/* LEFT COLUMN: contacts + company note */}
            <div>
              <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'14px' }}>
                <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'10px' }}>CONTACTS</div>
                {contacts.length===0&&<div style={{ fontSize:'12px',color:'#334155',marginBottom:'8px' }}>No contacts yet</div>}
                {contacts.map(c => <ContactCard key={c._docId} contact={c} buyerName={buyer.name} currentUser={currentUser} onDelete={deleteContact} />)}
                <AddContactForm buyerName={buyer.name} />
                <CompanyNote buyerName={buyer.name} currentUser={currentUser} />
              </div>
            </div>

            {/* RIGHT COLUMN: map + property list */}
            <div>
              {/* U-Haul criteria or SD Portfolio header */}
              {buyer.name.toLowerCase().includes('u-haul') && (
                <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'14px',marginBottom:'14px' }}>
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

              {/* Map */}
              {ownedProps.length > 0 && (
                <BuyerMap ownedProps={ownedProps} onSelectProperty={onSelectProperty} />
              )}

              {/* Properties owned */}
              {ownedProps.length > 0 && (
                <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',overflow:'hidden' }}>
                  <div style={{ padding:'10px 14px',borderBottom:'1px solid #1e2d47',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em' }}>SD PROPERTIES OWNED</div>
                    <div style={{ fontSize:'10px',color:'#f59e0b',fontWeight:700 }}>{ownedProps.length} properties · {(ownedProps.reduce((s,p)=>s+(p.sf||0),0)/1000).toFixed(0)}K SF</div>
                  </div>
                  <div style={{ maxHeight:'280px',overflowY:'auto' }}>
                    {ownedProps.map(p => (
                      <PropertyRow key={p.id} prop={p} onSelectProperty={onSelectProperty} />
                    ))}
                  </div>
                </div>
              )}

              {/* No props yet */}
              {ownedProps.length === 0 && buyer.deals.length === 0 && (
                <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'14px' }}>
                  <div style={{ fontSize:'10px',color:'#475569',letterSpacing:'0.1em',marginBottom:'8px' }}>SD PORTFOLIO</div>
                  <div style={{ fontSize:'12px',color:'#64748b' }}>No SD properties found in database.</div>
                </div>
              )}
            </div>
          </div>

          {/* Acquisitions section (if has comps) */}
          {buyer.deals.length > 0 && (
            <div style={{ background:'#0d1526',border:'1px solid #1e2d47',borderRadius:'10px',padding:'14px',marginTop:'16px' }}>
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
                  {d.seller&&<div style={{ fontSize:'10px',color:'#334155' }}>Seller: {d.seller}</div>}
                </div>
              ))}
            </div>
          )}
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
