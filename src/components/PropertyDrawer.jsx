import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore'

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
  { id: 'call', label: '📞 Call' },
  { id: 'note', label: '📝 Note' },
  { id: 'email', label: '📧 Email' },
  { id: 'meeting', label: '🤝 Meeting' },
  { id: 'voicemail', label: '📱 Voicemail' },
]

function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

function getDrawerLogoName(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (n.includes('public storage')) return 'Public Storage'
  if (n.includes('extra space')) return 'Extra Space Storage'
  if (n.includes('cubesmart')) return 'CubeSmart'
  if (n.includes('u-haul') || n.includes('uhaul')) return 'Uhaul'
  if (n.includes('national storage affiliates')) return 'National Storage Affiliates'
  if (n.includes('smartstop') || n.includes('strategic storage')) return 'SmartStop Self Storage'
  if (n.includes('simply self')) return 'Simply Self Storage'
  if (n.includes('life storage')) return 'Life Storage'
  if (n.includes('william warren') || n.includes('storquest') || n.includes('stor-quest')) return 'StorQuest Self Storage'
  if (n.includes('trojan storage')) return 'Trojan Storage'
  if (n.includes('insite') || n.includes('securespace')) return 'InSite Property Group'
  if (n.includes('san diego self storage')) return 'San Diego Self Storage'
  if (n.includes('miramar self storage')) return 'Miramar Self Storage'
  if (n.includes('caster') || n.includes('a-1 self storage') || n.includes('a-1 oceanside')) return 'The Caster Group'
  if (n.includes('baco properties')) return 'BACO Properties'
  if (n.includes('baranof')) return 'Baranof Holdings'
  if (n.includes('tierra corporation')) return 'Tierra Corporation'
  if (n.includes('danube properties')) return 'Danube Properties'
  if (n.includes('ezralow')) return 'The Ezralow Company'
  if (n.includes('westport properties')) return 'Westport Properties'
  if (n.includes('pacifica companies')) return 'Pacifica Companies'
  if (n.includes('price self storage')) return 'Price Self Storage'
  if (n.includes('ares management')) return 'Ares Management Corporation'
  if (n.includes('artemis real estate')) return 'Artemis Real Estate Partners'
  if (n.includes('blue vista')) return 'Blue Vista'
  if (n.includes('clear sky capital')) return 'Clear Sky Capital'
  if (n.includes('prime group')) return 'Prime Group Holdings'
  if (n.includes('merit hill')) return 'Merit Hill Capital'
  if (n.includes('encinitas self storage')) return 'Encinitas Self Storage'
  if (n.includes('greens global')) return 'Greens Global'
  if (n.includes('northwest building')) return 'Northwest Building, LLC'
  if (n.includes('sentry storage')) return 'Sentry Storage Solutions'
  if (n.includes('chicago capital funds')) return 'Chicago Capital Funds'
  if (n.includes('cbre investment')) return 'CBRE Investment Management'
  if (n.includes('floit')) return 'Dan Floit'
  return null
}
// Hardcoded direct logo URLs (by Firebase key — no scanning needed)
const LOGO_URLS = {
  'Public Storage':             'https://logos.gentz.co/logo/public_storage',
  'Extra Space Storage':        'https://logos.gentz.co/logo/extra-space-storage',
  'CubeSmart':                  'https://logos.gentz.co/logo/cubesmart',
  'Uhaul':                      'https://logos.gentz.co/logo/Uhaul',
  'National Storage Affiliates':'https://logos.gentz.co/logo/national-storage-affiliates',
  'SmartStop Self Storage':     'https://logos.gentz.co/logo/smartstop',
  'Simply Self Storage':        'https://logos.gentz.co/logo/simply-self-storage',
  'Life Storage':               'https://logos.gentz.co/logo/life-storage',
  'StorQuest Self Storage':     'https://logos.gentz.co/logo/storquest',
  'Trojan Storage':             'https://logos.gentz.co/logo/trojan-storage',
  'InSite Property Group':      'https://logos.gentz.co/logo/insite_property_group',
  'San Diego Self Storage':     'https://logos.gentz.co/logo/san_diego_self_storage',
  'Miramar Self Storage':       'https://logos.gentz.co/logo/miramar-self-storage',
  'The Caster Group':           'https://logos.gentz.co/logo/the_caster_group',
  'BACO Properties':            'https://logos.gentz.co/logo/baco-properties',
  'Baranof Holdings':           'https://logos.gentz.co/logo/baranof-holdings',
  'Tierra Corporation':         'https://logos.gentz.co/logo/tierra-corporation',
  'Danube Properties':          'https://logos.gentz.co/logo/danube-properties',
  'The Ezralow Company':        'https://logos.gentz.co/logo/ezralow',
  'Westport Properties':        'https://logos.gentz.co/logo/westport-properties',
  'Pacifica Companies':         'https://logos.gentz.co/logo/pacifica-companies',
  'Price Self Storage':         'https://logos.gentz.co/logo/price_self_storage',
  'Ares Management Corporation':'https://logos.gentz.co/logo/ares-management',
  'Artemis Real Estate Partners':'https://logos.gentz.co/logo/artemis-real-estate',
  'Blue Vista':                 'https://logos.gentz.co/logo/blue-vista',
  'Clear Sky Capital':          'https://logos.gentz.co/logo/clear-sky-capital',
  'Prime Group Holdings':       'https://logos.gentz.co/logo/prime_group_holdings',
  'Merit Hill Capital':         'https://logos.gentz.co/logo/merit_hill_capital',
  'Encinitas Self Storage':     'https://logos.gentz.co/logo/encinitas_self_storage',
  'Greens Global':              'https://logos.gentz.co/logo/greens_global',
  'Northwest Building, LLC':    'https://logos.gentz.co/logo/northwest_building',
  'Sentry Storage Solutions':   'https://logos.gentz.co/logo/sentry_storage',
  'Chicago Capital Funds':      'https://logos.gentz.co/logo/chicago_capital_funds',
  'CBRE Investment Management': 'https://logos.gentz.co/logo/cbre_investment',
  'Dan Floit':                  'https://logos.gentz.co/logo/dan_floit',
}

function LogoImg({ property }) {
  const [err, setErr] = useState(false)
  const name = getDrawerLogoName(property)
  if (!name || err) return null
  return <img src={LOGO_URLS[name]}
    alt={name} onError={() => setErr(true)}
    style={{ height: '28px', maxWidth: '90px', objectFit: 'contain', background: '#fff', borderRadius: '4px', padding: '2px 4px' }} />
}

export default function PropertyDrawer({ property, onClose, updateProperty, currentUser, onViewDetail }) {
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('call')
  const [notes, setNotes] = useState([])
  const p = property
  const propId = String(p.id)

  useEffect(() => {
    if (!p) return
    const q = query(collection(db, 'gentz_notes'), where('linkedProperties', 'array-contains', propId))
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ _docId: d.id, ...d.data() }))
      list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      setNotes(list)
    })
    return () => unsub()
  }, [propId])

  const addNote = async () => {
    if (!note.trim()) return
    const entry = {
      id: uid(), text: note.trim(), type: noteType,
      author: currentUser?.name || 'Unknown',
      authorId: currentUser?.id || 'U',
      timestamp: new Date().toISOString(),
      source: 'storvault',
      linkedProperties: [propId],
      linkedLeads: [], linkedDeals: [], linkedProjects: [], linkedTenants: [], linkedContacts: [],
    }
    await addDoc(collection(db, 'gentz_notes'), entry)
    if (noteType === 'call') {
      const callLog = [...(p.callLog || []), { date: new Date().toISOString().split('T')[0], note: note.trim(), status: p.callStatus }]
      updateProperty(p.id, { callLog })
    }
    setNote('')
  }

  const deleteNote = async (docId) => { await deleteDoc(doc(db, 'gentz_notes', docId)) }

  const statusOpt = STATUS_OPTIONS.find(s => s.value === p.callStatus) || STATUS_OPTIONS[0]
  const row = (label, value, highlight) => value && value !== '—' && value !== 'nan' ? (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a2540' }}>
      <span style={{ color: '#64748b', fontSize: '11px' }}>{label}</span>
      <span style={{ color: highlight || '#e2e8f0', fontSize: '11px', fontWeight: highlight ? 600 : 400, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
    </div>
  ) : null
  const typeIco = { call: '📞', note: '📝', email: '📧', meeting: '🤝', voicemail: '📱' }

  return (
    <div style={{ width: '340px', background: '#0d1526', borderLeft: '1px solid #1e2d47', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', zIndex: 10 }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #1e2d47', background: '#0a1122' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ flex: 1, marginRight: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3 }}>{p.name || p.address}</div>
              <LogoImg property={p} />
            </div>
            {p.name && <div style={{ fontSize: '11px', color: '#64748b' }}>{p.address}</div>}
            <div style={{ fontSize: '11px', color: '#475569' }}>{p.city}, CA {p.zip}</div>
          </div>
          <button onClick={onClose} style={{ background: '#1e2d47', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', flexShrink: 0 }}>×</button>
        </div>
        <select value={p.callStatus} onChange={e => updateProperty(p.id, { callStatus: e.target.value })}
          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${statusOpt.color}`, background: `${statusOpt.color}22`, color: statusOpt.color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {onViewDetail && (
          <button onClick={() => onViewDetail(p)} style={{ width:'100%', marginTop:'8px', padding:'7px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'6px', color:'#f59e0b', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
            View Full Detail →
          </button>
        )}
      </div>

      <div style={{ padding: '12px 16px', background: '#0a1122', borderBottom: '1px solid #1e2d47' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'SIZE', val: p.sf > 0 ? `${(p.sf/1000).toFixed(0)}K SF` : '—', color: '#60a5fa' },
            { label: 'ACRES', val: p.acres > 0 ? `${p.acres.toFixed(2)} ac` : '—', color: '#34d399' },
            { label: 'BUILT', val: p.yearBuilt > 0 ? p.yearBuilt : '—', color: '#a78bfa' },
          ].map(m => (
            <div key={m.label} style={{ textAlign: 'center', background: '#0d1526', borderRadius: '6px', padding: '8px 4px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: m.color }}>{m.val}</div>
              <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '0.08em' }}>{m.label}</div>
            </div>
          ))}
        </div>
        {p.forSale && (
          <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '6px', textAlign: 'center' }}>
            <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 700 }}>🔴 FOR SALE {p.forSalePrice > 0 ? `— ${fmt$(p.forSalePrice)}` : ''}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d47' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>OWNER</div>
        {row('True Owner', p.trueOwner, '#f59e0b')}
        {row('Owner', p.owner !== p.trueOwner ? p.owner : null)}
        {row('Contact', p.ownerContact)}
        {p.ownerPhone && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #1a2540' }}>
            <span style={{ color:'#64748b', fontSize:'11px' }}>Phone</span>
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ color:'#e2e8f0', fontSize:'11px' }}>{p.ownerPhone}</span>
              <a href={`tel:${p.ownerPhone}`} style={{ padding:'2px 7px', background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'4px', color:'#34d399', fontSize:'10px', fontWeight:600, textDecoration:'none' }}>📞</a>
              <a href={`sms:${p.ownerPhone}`} style={{ padding:'2px 7px', background:'rgba(96,165,250,0.15)', border:'1px solid rgba(96,165,250,0.3)', borderRadius:'4px', color:'#60a5fa', fontSize:'10px', fontWeight:600, textDecoration:'none' }}>💬</a>
            </div>
          </div>
        )}
        {row('Address', p.ownerAddress)}
        {row('Submarket', p.submarket)}
        {p.parentCompany && row('Parent Company', p.parentCompany)}
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d47' }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>LAST TRANSACTION</div>
        {row('Sale Date', p.lastSaleDate)}
        {row('Sale Price', fmt$(p.lastSalePrice))}
        {p.lastSalePrice && p.sf ? row('Price / SF', `$${(p.lastSalePrice/p.sf).toFixed(0)}/SF`) : null}
        {row('Parcel', p.parcel)}
      </div>

      {!!(p.lender || p.loanAmount) && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d47' }}>
          <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>LOAN</div>
          {row('Lender', p.lender)}
          {row('Amount', fmt$(p.loanAmount))}
          {row('Type', p.loanType)}
          {row('Maturity', p.loanMaturity, p.loanMaturity && new Date(p.loanMaturity) < new Date(Date.now() + 1000*60*60*24*365*2) ? '#f59e0b' : null)}
        </div>
      )}

      <div style={{ padding: '12px 16px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '8px' }}>NOTES & ACTIVITY</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {NOTE_TYPES.map(t => (
            <button key={t.id} onClick={() => setNoteType(t.id)} style={{
              padding: '3px 8px', border: `1px solid ${noteType === t.id ? '#f59e0b' : '#1e2d47'}`,
              borderRadius: '12px', background: noteType === t.id ? '#f59e0b22' : 'transparent',
              color: noteType === t.id ? '#f59e0b' : '#64748b', fontSize: '10px', cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`Add ${noteType}...`} rows={3}
          style={{ width: '100%', padding: '8px', background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '5px', color: '#e2e8f0', fontSize: '12px', resize: 'vertical', marginBottom: '8px', boxSizing: 'border-box' }} />
        <button onClick={addNote} style={{ width: '100%', padding: '8px', background: '#f59e0b', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginBottom: '12px' }}>
          + SAVE NOTE
        </button>
        {notes.map(n => (
          <div key={n._docId} style={{ padding: '8px', background: '#1a2540', borderRadius: '6px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {typeIco[n.type] || '📝'} {n.author || n.source} · {n.timestamp?.slice(0,10)}
              </span>
              <button onClick={() => deleteNote(n._docId)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '11px', padding: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>{n.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
