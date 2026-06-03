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

export default function PropertyList({ properties, selectedProperty, setSelectedProperty, updateProperty }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('sf')
  const [sortDir, setSortDir] = useState('desc')
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubmarket, setFilterSubmarket] = useState('all')

  const submarkets = [...new Set(properties.map(p => p.submarket))].filter(Boolean).sort()

  const filtered = useMemo(() => {
    let arr = [...properties]
    if (search) {
      const s = search.toLowerCase()
      arr = arr.filter(p =>
        p.address?.toLowerCase().includes(s) ||
        p.name?.toLowerCase().includes(s) ||
        p.owner?.toLowerCase().includes(s) ||
        p.city?.toLowerCase().includes(s) ||
        p.submarket?.toLowerCase().includes(s)
      )
    }
    if (filterOwner !== 'all') arr = arr.filter(p => p.ownerType === filterOwner)
    if (filterStatus !== 'all') arr = arr.filter(p => p.callStatus === filterStatus)
    if (filterSubmarket !== 'all') arr = arr.filter(p => p.submarket === filterSubmarket)

    arr.sort((a, b) => {
      let av = a[sortBy] || 0, bv = b[sortBy] || 0
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return arr
  }, [properties, search, sortBy, sortDir, filterOwner, filterStatus, filterSubmarket])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const th = (label, col) => (
    <th key={col} onClick={() => handleSort(col)} style={{
      padding: '8px 12px', fontSize: '10px', color: sortBy === col ? '#f59e0b' : '#475569',
      letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      borderBottom: '1px solid #1e2d47', textAlign: 'left',
    }}>
      {label} {sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const inpStyle = {
    background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '6px',
    color: '#e2e8f0', padding: '7px 12px', fontSize: '12px',
  }

  const selStyle = { ...inpStyle, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#080d1a' }}>
      {/* Table area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '12px 16px', background: '#0d1526', borderBottom: '1px solid #1e2d47',
          display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'
        }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search address, owner, city..."
            style={{ ...inpStyle, width: '260px' }}
          />
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
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto' }}>
            <strong style={{ color: '#60a5fa' }}>{filtered.length}</strong> of {properties.length}
          </span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#0a0f1e', zIndex: 1 }}>
              <tr>
                <th style={{ width: '10px', padding: '8px 12px', borderBottom: '1px solid #1e2d47' }} />
                {th('ADDRESS / NAME', 'address')}
                {th('OWNER', 'owner')}
                {th('SUBMARKET', 'submarket')}
                {th('SIZE', 'sf')}
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
                  <tr key={p.id}
                    onClick={() => setSelectedProperty(isSelected ? null : p)}
                    style={{
                      cursor: 'pointer', borderBottom: '1px solid #0f1929',
                      background: isSelected ? '#1a2540' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#111827' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      {p.forSale && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} title="For Sale" />
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{p.name || p.address}</div>
                      {p.name && <div style={{ color: '#475569', fontSize: '10px' }}>{p.address}</div>}
                      <div style={{ color: '#475569', fontSize: '10px' }}>{p.city}</div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ color: p.ownerType === 'uhaul' ? '#ef4444' : p.ownerType === 'reit' ? '#60a5fa' : '#f59e0b', fontSize: '11px' }}>
                        {p.trueOwner || p.owner || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px' }}>{p.submarket || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {p.sf > 0 ? `${p.sf.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {p.lastSaleDate || '—'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmt$(p.lastSalePrice)}
                    </td>
                    <td style={{ padding: '8px 12px', color: loanWarning ? '#f59e0b' : '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {p.loanMaturity && p.loanMaturity !== 'nan' ? p.loanMaturity : '—'}
                      {loanWarning && ' ⚠️'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                        background: `${statusColor}20`, color: statusColor, whiteSpace: 'nowrap'
                      }}>
                        {p.callStatus?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Property Drawer */}
      {selectedProperty && (
        <PropertyDrawer
          property={properties.find(p => p.id === selectedProperty.id) || selectedProperty}
          onClose={() => setSelectedProperty(null)}
          updateProperty={updateProperty}
        />
      )}
    </div>
  )
}
