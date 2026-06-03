import { useState } from 'react'

const DEFAULT_BUYERS = [
  {
    id: 'uhaul',
    name: 'U-Haul / Amerco Real Estate',
    logo: '🚛',
    color: '#ef4444',
    contact: 'Jason A. Berg',
    phone: '(602) 263-6555',
    email: 'jason.berg@uhaul.com',
    hq: '5555 S Kietzke Ln, Suite 100, Reno, NV 89511',
    activity: '$601M acquisitions / $72M dispositions (last 5 yrs)',
    status: 'Active — Actively acquiring',
    sdLocations: 8,
    sdGaps: ['East County (El Cajon / Santee)', 'Chula Vista South', 'PB / Morena', 'Kearny Mesa', 'Claremont', 'Tierrasanta'],
    criteria: [
      { label: 'Land Size', value: '4+ acres', icon: '📐' },
      { label: 'Building (Conversion)', value: '60,000+ GSF big box or warehouse', icon: '🏭' },
      { label: 'Existing Self-Storage', value: '50,000+ net rentable SF min', icon: '📦' },
      { label: 'Street Frontage', value: '200\' minimum', icon: '🛣' },
      { label: 'UBOX Clear Height', value: '24\' minimum', icon: '↕️' },
      { label: 'Traffic Count', value: '30,000 cars/day minimum at curb', icon: '🚗' },
      { label: 'Demographics', value: '60,000 people within 3-mile radius', icon: '👥' },
      { label: 'Renters', value: '30% renter rate within 3-mile radius', icon: '🏘' },
      { label: 'Location', value: 'Major commercial arterial, corner preferred', icon: '📍' },
      { label: 'Zoning', value: 'Compatible with self-storage and truck rentals', icon: '📋' },
      { label: 'Utilities', value: 'Water, sewer, power required', icon: '⚡' },
    ],
    notes: 'Sports Arena (3820 Midway) is their leased tiny location — 2,761 SF. Need to find them a big replacement location, then we sell that site to TW.',
    lastSdDeal: 'Vista Pacific Dr, Oceanside — Nov 2022 — $8.38M / $74.83 PSF (2.57 acres, I-7 zoning)',
  },
  {
    id: 'insite',
    name: 'InSite Property Group',
    logo: '🏢',
    color: '#60a5fa',
    contact: 'Ben Kreuzer / Charlie Franks',
    role: 'Associates, Acquisitions',
    hq: 'Los Angeles, CA (Torrance)',
    website: 'insitepg.com',
    status: 'Active — Full spectrum buyer',
    criteria: [
      { label: 'Markets', value: 'High-growth and institutional markets + small high-return opportunities', icon: '📍' },
      { label: 'Land', value: 'Yes — development sites', icon: '🌱' },
      { label: 'Certificate of Occupancy', value: 'Yes — newly constructed', icon: '📄' },
      { label: 'Lease Up', value: 'Yes — stabilizing assets', icon: '📈' },
      { label: 'Stabilized', value: 'Yes — fully leased assets', icon: '✅' },
      { label: 'Platform', value: 'Fully integrated (SiteBuild, SiteOps)', icon: '⚙️' },
    ],
    notes: 'InSite owns 10373 Azuaga St in Rancho Bernardo (SecureSpace, 109,725 SF, 2022). Good relationship opportunity — they\'re local and active.',
    sdAssets: ['10373 Azuaga St, San Diego 92129 (Rancho Bernardo) — 109K SF', '16001 Babcock St, San Diego 92127 — 99K SF (Northwest Building via NWB Del Sur LLC)'],
  },
  {
    id: 'merit',
    name: 'Merit Hill Capital',
    logo: '⚡',
    color: '#34d399',
    contact: '',
    hq: 'National',
    status: 'Active — Institutional buyer',
    activity: '4 SD purchases since 2019, all at sub-$200/SF',
    criteria: [
      { label: 'Type', value: 'Institutional investment manager', icon: '🏦' },
      { label: 'Strategy', value: 'Value-add and core-plus self-storage', icon: '📊' },
      { label: 'Recent SD Buys', value: 'Vista (2x), Escondido — all 2-star, 20-25K SF range', icon: '🛒' },
      { label: 'Buy Price', value: '$140-160/SF (2023-2024)', icon: '💲' },
    ],
    notes: 'Has been buying older 2-star product at $140-160/SF. Good target for smaller, older private owner listings.',
  },
  {
    id: 'williamwarren',
    name: 'The William Warren Group',
    logo: '🌟',
    color: '#a78bfa',
    hq: 'National',
    status: 'Active with CBRE IM',
    activity: '3 SD purchases in 2022-23 (KOAR portfolio), $35M+ total',
    criteria: [
      { label: 'Type', value: 'Private developer / operator — StorQuest brand', icon: '🏢' },
      { label: 'Strategy', value: 'Operates under StorQuest. Acquires stabilized and value-add', icon: '📊' },
      { label: 'Size', value: 'Urban and suburban, 50K+ SF preferred', icon: '📐' },
    ],
    notes: 'Bought the KOAR portfolio in SD (2150 Hancock, 1040 Sherman, others) at very high $/SF ($300-1,284/SF). Now in hold mode on those but will buy again.',
  },
]

export default function BuyerProfiles() {
  const [buyers, setBuyers] = useState(DEFAULT_BUYERS)
  const [selected, setSelected] = useState('uhaul')
  const [showAdd, setShowAdd] = useState(false)
  const [newBuyer, setNewBuyer] = useState({ name: '', contact: '', phone: '', notes: '', color: '#60a5fa' })

  const buyer = buyers.find(b => b.id === selected)

  const addBuyer = () => {
    if (!newBuyer.name) return
    const id = newBuyer.name.toLowerCase().replace(/\s+/g, '_')
    setBuyers(prev => [...prev, { ...newBuyer, id, logo: '🏢', criteria: [], status: 'Active' }])
    setSelected(id)
    setShowAdd(false)
    setNewBuyer({ name: '', contact: '', phone: '', notes: '', color: '#60a5fa' })
  }

  const inpStyle = {
    background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '6px',
    color: '#e2e8f0', padding: '8px 12px', fontSize: '12px', width: '100%',
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#080d1a' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#0d1526', borderRight: '1px solid #1e2d47', padding: '16px', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '12px' }}>BUYERS & INVESTORS</div>
        {buyers.map(b => (
          <button key={b.id} onClick={() => setSelected(b.id)} style={{
            width: '100%', padding: '10px 12px', marginBottom: '4px', border: 'none', borderRadius: '6px',
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
            background: selected === b.id ? `${b.color}22` : 'transparent',
            borderLeft: selected === b.id ? `3px solid ${b.color}` : '3px solid transparent',
          }}>
            <span style={{ fontSize: '16px' }}>{b.logo}</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: selected === b.id ? b.color : '#94a3b8' }}>{b.name}</div>
              <div style={{ fontSize: '10px', color: '#475569' }}>{b.status?.split(' — ')[0]}</div>
            </div>
          </button>
        ))}
        <button onClick={() => setShowAdd(v => !v)} style={{
          width: '100%', padding: '8px', marginTop: '8px', background: '#1e2d47', border: 'none',
          borderRadius: '6px', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600
        }}>
          + Add Buyer
        </button>

        {showAdd && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input placeholder="Company name" value={newBuyer.name} onChange={e => setNewBuyer(p => ({...p, name: e.target.value}))} style={inpStyle} />
            <input placeholder="Contact name" value={newBuyer.contact} onChange={e => setNewBuyer(p => ({...p, contact: e.target.value}))} style={inpStyle} />
            <input placeholder="Phone" value={newBuyer.phone} onChange={e => setNewBuyer(p => ({...p, phone: e.target.value}))} style={inpStyle} />
            <textarea placeholder="Notes / criteria" value={newBuyer.notes} onChange={e => setNewBuyer(p => ({...p, notes: e.target.value}))} rows={3} style={{...inpStyle, resize: 'vertical'}} />
            <button onClick={addBuyer} style={{ background: '#f59e0b', border: 'none', borderRadius: '6px', padding: '8px', color: '#000', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
              Save Buyer
            </button>
          </div>
        )}
      </div>

      {/* Buyer detail */}
      {buyer && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', background: `${buyer.color}22`, border: `2px solid ${buyer.color}44`,
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0
            }}>
              {buyer.logo}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>{buyer.name}</h2>
              <div style={{ fontSize: '12px', color: buyer.color, fontWeight: 600 }}>{buyer.status}</div>
              {buyer.activity && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{buyer.activity}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Contact */}
            <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '12px' }}>CONTACT</div>
              {buyer.contact && <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{buyer.contact}</div>}
              {buyer.role && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{buyer.role}</div>}
              {buyer.phone && (
                <a href={`tel:${buyer.phone}`} style={{ display: 'block', fontSize: '12px', color: '#60a5fa', marginBottom: '4px', textDecoration: 'none' }}>
                  📞 {buyer.phone}
                </a>
              )}
              {buyer.email && (
                <a href={`mailto:${buyer.email}`} style={{ display: 'block', fontSize: '12px', color: '#60a5fa', marginBottom: '4px', textDecoration: 'none' }}>
                  ✉️ {buyer.email}
                </a>
              )}
              {buyer.website && (
                <a href={`https://${buyer.website}`} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}>
                  🌐 {buyer.website}
                </a>
              )}
              {buyer.hq && <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>📍 {buyer.hq}</div>}
            </div>

            {/* SD presence */}
            {(buyer.sdLocations || buyer.sdAssets || buyer.lastSdDeal) && (
              <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '12px' }}>SAN DIEGO PRESENCE</div>
                {buyer.sdLocations && (
                  <div style={{ fontSize: '22px', fontWeight: 800, color: buyer.color, marginBottom: '4px' }}>
                    {buyer.sdLocations} locations owned
                  </div>
                )}
                {buyer.sdGaps && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '6px' }}>⚡ TARGET GAPS:</div>
                    {buyer.sdGaps.map((g, i) => (
                      <div key={i} style={{ fontSize: '11px', color: '#94a3b8', padding: '3px 0', borderBottom: '1px solid #1a2540' }}>→ {g}</div>
                    ))}
                  </div>
                )}
                {buyer.sdAssets && (
                  <div style={{ marginTop: '8px' }}>
                    {buyer.sdAssets.map((a, i) => (
                      <div key={i} style={{ fontSize: '11px', color: '#94a3b8', padding: '3px 0', borderBottom: '1px solid #1a2540' }}>• {a}</div>
                    ))}
                  </div>
                )}
                {buyer.lastSdDeal && (
                  <div style={{ marginTop: '10px', padding: '8px', background: '#1a2540', borderRadius: '6px', fontSize: '11px', color: '#94a3b8' }}>
                    <strong style={{ color: '#64748b' }}>Last SD Deal:</strong><br />{buyer.lastSdDeal}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acquisition Criteria */}
          {buyer.criteria?.length > 0 && (
            <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '18px', marginTop: '16px' }}>
              <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', marginBottom: '14px' }}>ACQUISITION CRITERIA</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {buyer.criteria.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px', background: '#1a2540', borderRadius: '6px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.08em' }}>{c.label}</div>
                      <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500, marginTop: '2px' }}>{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {buyer.notes && (
            <div style={{ background: `${buyer.color}11`, border: `1px solid ${buyer.color}33`, borderRadius: '10px', padding: '18px', marginTop: '16px' }}>
              <div style={{ fontSize: '10px', color: buyer.color, letterSpacing: '0.1em', marginBottom: '8px' }}>STRATEGY NOTES</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>{buyer.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
