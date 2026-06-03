import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore'
import compsData from '../data/comps.json'

function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7) }

// Build buyer profiles from comps data
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
    const initials = company ? company.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?'
    return (
      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#1e2d47', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
        {initials}
      </div>
    )
  }
  return (
    <img src={`https://logos.gentz.co/logo/by-name/${encodeURIComponent(company)}`}
      alt={company} onError={() => setErr(true)}
      style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', background: '#1e2d47', padding: '4px' }} />
  )
}

function ContactCard({ contact, onDelete }) {
  return (
    <div style={{ background: '#0a1122', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#e2e8f0', marginBottom: '2px' }}>{contact.name}</div>
        {contact.title && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{contact.title}</div>}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {contact.phone && <a href={`tel:${contact.phone}`} style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}>📞 {contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`} style={{ fontSize: '11px', color: '#34d399', textDecoration: 'none' }}>✉️ {contact.email}</a>}
        </div>
      </div>
      <button onClick={() => onDelete(contact._docId)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '13px', padding: '0 4px' }}>✕</button>
    </div>
  )
}

function AddContactForm({ buyerName, onAdded }) {
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const save = async () => {
    if (!name.trim()) return
    await addDoc(collection(db, 'gentz_contacts'), {
      id: uid(), name: name.trim(), title: title.trim(), phone: phone.trim(), email: email.trim(),
      company: buyerName, type: 'buyer', source: 'storvault',
      createdAt: new Date().toISOString(),
    })
    setName(''); setTitle(''); setPhone(''); setEmail(''); setShow(false)
    onAdded?.()
  }

  const inp = { background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '5px', color: '#e2e8f0', fontSize: '12px', padding: '7px 10px', width: '100%', boxSizing: 'border-box', outline: 'none' }

  if (!show) return (
    <button onClick={() => setShow(true)} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px dashed #2d3f5e', borderRadius: '6px', color: '#475569', fontSize: '11px', cursor: 'pointer', marginTop: '6px' }}>
      + Add Contact
    </button>
  )

  return (
    <div style={{ background: '#0a1122', border: '1px solid #1e2d47', borderRadius: '8px', padding: '12px', marginTop: '6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <input placeholder="Name *" value={name} onChange={e=>setName(e.target.value)} style={inp} />
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={inp} />
        <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} style={inp} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={save} style={{ flex: 1, padding: '7px', background: '#f59e0b', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>Save</button>
        <button onClick={() => setShow(false)} style={{ padding: '7px 14px', background: '#1e2d47', border: 'none', borderRadius: '5px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

export default function BuyerProfiles({ currentUser }) {
  const [selected, setSelected] = useState(null)
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')

  const buyer = selected ? BUYERS.find(b => b.name === selected) : null

  // Load contacts for selected buyer from gentz_contacts
  useEffect(() => {
    if (!selected) return
    const q = query(collection(db, 'gentz_contacts'), where('company', '==', selected))
    const unsub = onSnapshot(q, snap => {
      setContacts(snap.docs.map(d => ({ _docId: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [selected])

  const deleteContact = async (docId) => { await deleteDoc(doc(db, 'gentz_contacts', docId)) }

  const filtered = BUYERS.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: '100%', background: '#080d1a' }}>
      {/* Buyer list */}
      <div style={{ width: '320px', borderRight: '1px solid #1e2d47', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '14px', borderBottom: '1px solid #1e2d47' }}>
          <input placeholder="Search buyers…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '6px', color: '#e2e8f0', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        {filtered.map(b => (
          <div key={b.name} onClick={() => setSelected(b.name)}
            style={{ padding: '12px 14px', borderBottom: '1px solid #0d1526', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center', background: selected===b.name ? '#0d1526' : 'transparent' }}>
            <LogoImg company={b.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#e2e8f0', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                <span style={{ color: '#60a5fa' }}>{b.deals.length}</span> deal{b.deals.length!==1?'s':''} · <span style={{ color: '#34d399' }}>{fmt$(b.totalVol)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Buyer detail */}
      {buyer ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
            <LogoImg company={buyer.name} />
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{buyer.name}</h2>
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                <span><span style={{ color: '#60a5fa', fontWeight: 700 }}>{buyer.deals.length}</span> <span style={{ color: '#475569' }}>acquisitions</span></span>
                <span><span style={{ color: '#34d399', fontWeight: 700 }}>{fmt$(buyer.totalVol)}</span> <span style={{ color: '#475569' }}>total volume</span></span>
                <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>{buyer.totalSF > 0 ? `${(buyer.totalSF/1000).toFixed(0)}K SF` : '—'}</span> <span style={{ color: '#475569' }}>acquired</span></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Contacts */}
            <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '12px' }}>CONTACTS</div>
              {contacts.length === 0 && <div style={{ fontSize: '12px', color: '#334155', marginBottom: '8px' }}>No contacts yet — add below</div>}
              {contacts.map(c => <ContactCard key={c._docId} contact={c} onDelete={deleteContact} />)}
              <AddContactForm buyerName={buyer.name} />
            </div>

            {/* Acquisitions */}
            <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '12px' }}>ACQUISITIONS IN SD</div>
              {buyer.deals.sort((a,b) => (b.saleDate||'').localeCompare(a.saleDate||'')).map((d,i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a2540' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{d.name||d.address}</span>
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>{fmt$(d.salePrice)}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    {d.city} · {d.sf?.toLocaleString()} SF · {d.saleDate?.slice(0,10)}
                    {d.pricePerSF > 0 ? ` · $${d.pricePerSF.toFixed(0)}/SF` : ''}
                    {d.capRate > 0 ? ` · ${(d.capRate*100).toFixed(2)}% cap` : ''}
                  </div>
                  {d.seller && <div style={{ fontSize: '10px', color: '#334155', marginTop: '1px' }}>Seller: {d.seller}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#334155' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
            <div style={{ fontSize: '14px' }}>Select a buyer to view details</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>{BUYERS.length} buyers found in SD comps</div>
          </div>
        </div>
      )}
    </div>
  )
}
