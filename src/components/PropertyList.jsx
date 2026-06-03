import { useState, useMemo } from 'react'
import PropertyDrawer from './PropertyDrawer.jsx'

const STATUS_COLORS = {
  not_called: '#60a5fa', called: '#34d399', interested: '#f59e0b',
  not_interested: '#94a3b8', under_nda: '#a78bfa', listed: '#f87171',
}

function fmt$(n) {
  if (!n) return '—'
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

function exportCSV(props) {
  const rows = [
    ['Property Address', 'City', 'Zip', 'Property Name', 'SF', 'Acres', 'Year Built', 'Submarket',
     'True Owner', 'Owner Name', 'Owner Contact', 'Owner Phone', 'Owner Address',
     'Parent Company', 'Last Sale Date', 'Last Sale Price', 'Lender', 'Loan Amount', 'Loan Maturity',
     'For Sale', 'Call Status', 'Parcel'].join(',')
  ]
  props.forEach(p => {
    const esc = v => `"${String(v||'').replace(/"/g,'""')}"`
    rows.push([
      esc(p.address), esc(p.city), esc(p.zip), esc(p.name),
      p.sf||'', p.acres||'', p.yearBuilt||'', esc(p.submarket),
      esc(p.trueOwner), esc(p.owner), esc(p.ownerContact), esc(p.ownerPhone), esc(p.ownerAddress),
      esc(p.parentCompany), esc(p.lastSaleDate), p.lastSalePrice||'', esc(p.lender), p.loanAmount||'', esc(p.loanMaturity),
      p.forSale?'Yes':'No', esc(p.callStatus), esc(p.parcel)
    ].join(','))
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `storvault-export-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function PropertyList({ properties, selectedProperty, setSelectedProperty, updateProperty, currentUser }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('sf')
  const [sortDir, setSortDir] = useState('desc')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')
  const [filterMinSF, setFilterMinSF] = useState('')
  const [filterMaxSF, setFilterMaxSF] = useState('')

  const submarkets = [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort()

  const filtered = useMemo(() => {
    let arr = [...properties]
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(p =>
        (p.address||'').toLowerCase().includes(s) ||
        (p.name||'').toLowerCase().includes(s) ||
        (p.owner||'').toLowerCase().includes(s) ||
        (p.trueOwner||'').toLowerCase().includes(s) ||
        (p.city||'').toLowerCase().includes(s) ||
        (p.submarket||'').toLowerCase().includes(s) ||
        (p.parentCompany||'').toLowerCase().includes(s)
      )
    }
    if (filterStatus !== 'all') arr = arr.filter(p => p.callStatus === filterStatus)
    if (filterSubmarket !== 'all') arr = arr.filter(p => p.submarket === filterSubmarket)
    if (filterOwner !== 'all') {
      arr = arr.filter(p => {
        const n = (p.parentCompany||p.owner||'').toLowerCase()
        if (filterOwner === 'uhaul') return n.includes('u-haul')||n.includes('uhaul')
        if (filterOwner === 'reit') return ['public storage','extra space','cubesmart','life storage','simply self','national storage'].some(r=>n.includes(r))
        if (filterOwner === 'private') return !['u-haul','uhaul','public storage','extra space','cubesmart','life storage','simply self'].some(r=>n.includes(r))
        return true
      })
    }
    if (filterMinSF) arr = arr.filter(p => p.sf >= parseInt(filterMinSF))
    if (filterMaxSF) arr = arr.filter(p => p.sf <= parseInt(filterMaxSF))

    arr.sort((a, b) => {
      const av = a[sortBy]||0, bv = b[sortBy]||0
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? (av-bv) : (bv-av)
    })
    return arr
  }, [properties, search, sortBy, sortDir, filterOwner, filterStatus, filterSubmarket, filterMinSF, filterMaxSF])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const th = (label, col) => (
    <th key={col} onClick={() => handleSort(col)} style={{
      padding: '8px 12px', fontSize: '10px', color: sortBy === col ? '#f59e0b' : '#475569',
      letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      borderBottom: '1px solid #1e2d47', textAlign: 'left',
    }}>{label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
  )

  const inpStyle = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '6px', color: '#e2e8f0', padding: '7px 10px', fontSize: '12px' }
  const selStyle = { ...inpStyle, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#080d1a' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '10px 14px', background: '#0d1526', borderBottom: '1px solid #1e2d47', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search address, owner, city..."
            style={{ ...inpStyle, width: '220px' }} />
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selStyle}>
            <option value="all">All Owners</option>
            <option value="private">Private / Local</option>
            <option value="reit">REIT / Public</option>
            <option value="uhaul">U-Haul</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
            <option value="all">All Statuses</option>
            <option value="not_called">Not Called</option>
            <option value="called">Called</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="under_nda">Under NDA</option>
            <option value="listed">Listed</option>
          </select>
          <select value={filterSubmarket} onChange={e => setFilterSubmarket(e.target.value)} style={selStyle}>
            <option value="all">All Submarkets</option>
            {submarkets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={filterMinSF} onChange={e => setFilterMinSF(e.target.value)}
            placeholder="Min SF" type="number" style={{ ...inpStyle, width: '80px' }} />
          <input value={filterMaxSF} onChange={e => setFilterMaxSF(e.target.value)}
            placeholder="Max SF" type="number" style={{ ...inpStyle, width: '80px' }} />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#475569' }}>
              <strong style={{ color: '#60a5fa' }}>{filtered.length}</strong> of {properties.length}
            </span>
            <button onClick={() => exportCSV(filtered)} style={{
              padding: '7px 14px', background: '#1e2d47', border: '1px solid #2d3f5e', borderRadius: '6px',
              color: '#34d399', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}>⬇ Export CSV</button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#0a0f1e', zIndex: 1 }}>
              <tr>
                <th style={{ width: '10px', padding: '8px 12px', borderBottom: '1px solid #1e2d47' }} />
                {th('ADDRESS / NAME', 'address')}
                {th('TRUE OWNER', 'trueOwner')}
                {th('PHONE', 'ownerPhone')}
                {th('SUBMARKET', 'submarket')}
                {th('SIZE ↓', 'sf')}
                {th('LAST SALE', 'lastSaleDate')}
                {th('PRICE', 'lastSalePrice')}
                {th('LOAN MATURITY', 'loanMaturity')}
                {th('STATUS', 'callStatus')}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isSelected = selectedProperty?.id === p.id
                const statusColor = STATUS_COLORS[p.callStatus] || '#60a5fa'
                const loanWarning = p.loanMaturity && p.loanMaturity !== 'nan' &&
                  new Date(p.loanMaturity) < new Date(Date.now() + 1000*60*60*24*365*2)
                return (
                  <tr key={p.id} onClick={() => setSelectedProperty(isSelected ? null : p)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #0f1929', background: isSelected ? '#1a2540' : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#111827' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#1a2540' : 'transparent' }}>
                    <td style={{ padding: '8px 12px' }}>
                      {p.forSale && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{p.name || p.address}</div>
                      {p.name && <div style={{ color: '#475569', fontSize: '10px' }}>{p.address}</div>}
                      <div style={{ color: '#475569', fontSize: '10px' }}>{p.city}</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>{p.trueOwner || p.owner || '—'}</div>
                      {p.ownerContact && <div style={{ color: '#64748b', fontSize: '10px' }}>{p.ownerContact}</div>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {p.ownerPhone ? (
                        <a href={`tel:${p.ownerPhone}`} onClick={e=>e.stopPropagation()}
                          style={{ color: '#60a5fa', fontSize: '11px', textDecoration: 'none' }}>{p.ownerPhone}</a>
                      ) : <span style={{ color: '#334155', fontSize: '11px' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px' }}>{p.submarket || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {p.sf > 0 ? p.sf.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>{p.lastSaleDate || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmt$(p.lastSalePrice)}</td>
                    <td style={{ padding: '8px 12px', color: loanWarning ? '#f59e0b' : '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {p.loanMaturity && p.loanMaturity !== 'nan' ? p.loanMaturity : '—'}{loanWarning ? ' ⚠️' : ''}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: `${statusColor}20`, color: statusColor, whiteSpace: 'nowrap' }}>
                        {p.callStatus?.replace(/_/g,' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProperty && (
        <PropertyDrawer currentUser={currentUser}
          property={properties.find(p => p.id === selectedProperty.id) || selectedProperty}
          onClose={() => setSelectedProperty(null)}
          updateProperty={updateProperty} />
      )}
    </div>
  )
}
