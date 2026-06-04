import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'

function fmt$(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}
function fmtPSF(n) { return (!n || isNaN(n)) ? '—' : `$${n.toFixed(0)}/SF` }
function fmtPct(n) { return (!n || isNaN(n)) ? '—' : `${(n*100).toFixed(2)}%` }

const COLORS = ['#60a5fa','#34d399','#f59e0b','#a78bfa','#f87171','#38bdf8','#fb923c','#e879f9']
const TIP_STYLE = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '6px', fontSize: '11px', color: '#e2e8f0' }

const PERIODS = [
  { label: '12 Mo', months: 12 },
  { label: '24 Mo', months: 24 },
  { label: '36 Mo', months: 36 },
  { label: 'All', months: 9999 },
]

export default function Dashboard({ comps, properties }) {
  const [period, setPeriod] = useState(9999)
  const [showCompsTable, setShowCompsTable] = useState(false)
  const [sortCol, setSortCol] = useState('saleDate')
  const [sortDir, setSortDir] = useState(-1)

  const cutoff = useMemo(() => {
    if (period === 9999) return new Date('2010-01-01')
    const d = new Date()
    d.setMonth(d.getMonth() - period)
    return d
  }, [period])

  const filteredComps = useMemo(() =>
    comps.filter(c => c.saleDate && new Date(c.saleDate) >= cutoff)
  , [comps, cutoff])

  const yearData = useMemo(() => {
    const years = {}
    filteredComps.forEach(c => {
      const y = c.year
      if (!y) return
      if (!years[y]) years[y] = { year: y, count: 0, volume: 0, psfSum: 0, psfCount: 0, capSum: 0, capCount: 0 }
      years[y].count++
      years[y].volume += c.salePrice || 0
      if (c.pricePerSF > 0) { years[y].psfSum += c.pricePerSF; years[y].psfCount++ }
      if (c.capRate > 0) { years[y].capSum += c.capRate; years[y].capCount++ }
    })
    return Object.values(years).sort((a,b) => a.year - b.year).map(y => ({
      ...y,
      volumeM: +(y.volume/1e6).toFixed(1),
      avgPsf: y.psfCount > 0 ? +(y.psfSum/y.psfCount).toFixed(0) : null,
      avgCap: y.capCount > 0 ? +(y.capSum/y.capCount*100).toFixed(2) : null,
    }))
  }, [filteredComps])

  const totals = useMemo(() => ({
    volume: filteredComps.reduce((s,c) => s + (c.salePrice||0), 0),
    count: filteredComps.length,
    avgPsf: (() => {
      const valid = filteredComps.filter(c => c.pricePerSF > 0)
      return valid.length ? valid.reduce((s,c) => s + c.pricePerSF, 0) / valid.length : 0
    })(),
    avgCap: (() => {
      const valid = filteredComps.filter(c => c.capRate > 0)
      return valid.length ? valid.reduce((s,c) => s + c.capRate, 0) / valid.length : 0
    })(),
    forSale: properties.filter(p => p.forSale).length,
  }), [filteredComps, properties])

  const topBuyers = useMemo(() => {
    const b = {}
    filteredComps.forEach(c => {
      if (!c.buyer) return
      const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
      if (!b[name]) b[name] = { count: 0, vol: 0 }
      b[name].count++; b[name].vol += c.salePrice||0
    })
    return Object.entries(b).map(([name,d]) => ({ name, ...d })).sort((a,b) => b.count-a.count).slice(0,8)
  }, [filteredComps])

  const topSellers = useMemo(() => {
    const s = {}
    filteredComps.forEach(c => {
      if (!c.seller) return
      const name = c.seller.split(' | ')[0].trim()
      if (!s[name]) s[name] = { count: 0, vol: 0 }
      s[name].count++; s[name].vol += c.salePrice||0
    })
    return Object.entries(s).map(([name,d]) => ({ name, ...d })).sort((a,b) => b.count-a.count).slice(0,8)
  }, [filteredComps])

  const ownerBreakdown = useMemo(() => {
    const types = { 'Private / Local': 0, 'REIT / Public': 0, 'U-Haul': 0 }
    properties.forEach(p => {
      const n = (p.parentCompany||p.owner||'').toLowerCase()
      if (n.includes('u-haul')||n.includes('uhaul')) types['U-Haul']++
      else if (['public storage','extra space','cubesmart','life storage','national storage','simply self'].some(r=>n.includes(r))) types['REIT / Public']++
      else types['Private / Local']++
    })
    return Object.entries(types).map(([name,value]) => ({ name, value }))
  }, [properties])

  const sortedComps = useMemo(() => {
    return [...filteredComps].sort((a,b) => {
      const av = a[sortCol]||0, bv = b[sortCol]||0
      return typeof av === 'string' ? av.localeCompare(bv)*sortDir : (av-bv)*sortDir
    })
  }, [filteredComps, sortCol, sortDir])

  const cardStyle = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '20px' }
  const toggleSort = col => { if (sortCol===col) setSortDir(d=>-d); else { setSortCol(col); setSortDir(-1) } }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px', background: '#080d1a' }}>
      {/* Period filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', color: '#475569', marginRight: '4px' }}>SHOW:</span>
        {PERIODS.map(p => (
          <button key={p.months} onClick={() => setPeriod(p.months)} style={{
            padding: '5px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700,
            background: period===p.months ? '#f59e0b' : '#1e2d47',
            color: period===p.months ? '#000' : '#94a3b8',
          }}>{p.label}</button>
        ))}
        <button onClick={() => setShowCompsTable(v=>!v)} style={{
          marginLeft: 'auto', padding: '5px 14px', border: '1px solid #1e2d47', borderRadius: '6px',
          cursor: 'pointer', fontSize: '11px', fontWeight: 700, background: showCompsTable ? '#1e2d47' : 'transparent', color: '#60a5fa',
        }}>{showCompsTable ? '▲ Hide Comps' : '▼ Show All Comps'}</button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'TOTAL PROPERTIES', val: properties.length, sub: 'SD County', color: '#60a5fa' },
          { label: 'SALES', val: totals.count, sub: `${period===9999?'All time':period+' months'}`, color: '#34d399' },
          { label: 'TOTAL VOLUME', val: fmt$(totals.volume), sub: `${period===9999?'Jan 2019–2026':period+' months'}`, color: '#a78bfa' },
          { label: 'AVG PRICE / SF', val: fmtPSF(totals.avgPsf), sub: 'All comps', color: '#f59e0b' },
          { label: 'AVG CAP RATE', val: totals.avgCap > 0 ? `${(totals.avgCap*100).toFixed(1)}%` : '—', sub: 'Known cap rates', color: '#34d399' },
          { label: 'FOR SALE NOW', val: totals.forSale, sub: 'In SD County', color: '#f87171' },
        ].map(k => (
          <div key={k.label} style={cardStyle}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: k.color, marginBottom: '4px' }}>{k.val}</div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.08em' }}>{k.label}</div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>SALES VOLUME BY YEAR ($M)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
              <Tooltip contentStyle={TIP_STYLE} formatter={v=>[`$${v}M`,'Volume']} />
              <Bar dataKey="volumeM" fill="#60a5fa" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>AVG PRICE PER SF BY YEAR</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yearData.filter(y=>y.avgPsf)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" />
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v=>`$${v}`} />
              <Tooltip contentStyle={TIP_STYLE} formatter={v=>[`$${v}/SF`,'Avg Price/SF']} />
              <Line type="monotone" dataKey="avgPsf" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>CURRENT OWNERS ({properties.length} PROPERTIES)</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={ownerBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                {ownerBreakdown.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={TIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {ownerBreakdown.map((o,i) => (
              <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i] }} />{o.name}
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>TOP BUYERS (# DEALS)</div>
          {topBuyers.map((b,i) => (
            <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ height: '6px', borderRadius: '3px', background: COLORS[i%COLORS.length], width: `${topBuyers.length > 0 ? (b.count/topBuyers[0].count)*80 : 0}px` }} />
                <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 700, width: '16px', textAlign: 'right' }}>{b.count}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>PROPERTIES BY SUBMARKET</div>
          {(() => {
            const sm = {}
            properties.forEach(p => { if (p.submarket) sm[p.submarket] = (sm[p.submarket]||0)+1 })
            return Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count],i) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: COLORS[i%COLORS.length], width: `${Math.max(6,(count/properties.length)*120)}px` }} />
                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 700, width: '24px', textAlign: 'right' }}>{count}</span>
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Comps table */}
      {showCompsTable && (
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.08em', marginBottom: '12px' }}>
            SALE COMPS — {filteredComps.length} transactions
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  {[['saleDate','Date'],['address','Property'],['city','City'],['sf','SF'],['salePrice','Price'],['pricePerSF','$/SF'],['capRate','Cap'],['buyer','Buyer'],['seller','Seller']].map(([col,label]) => (
                    <th key={col} onClick={() => toggleSort(col)} style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', borderBottom: '1px solid #1e2d47', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
                      {label}{sortCol===col ? (sortDir>0?'▲':'▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedComps.map((c,i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0d1526' }}>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.saleDate?.slice(0,10)}</td>
                    <td style={{ padding: '6px 8px', color: '#e2e8f0', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name||c.address}</td>
                    <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{c.city}</td>
                    <td style={{ padding: '6px 8px', color: '#60a5fa' }}>{c.sf?.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', color: '#34d399', fontWeight: 700 }}>{fmt$(c.salePrice)}</td>
                    <td style={{ padding: '6px 8px', color: '#f59e0b' }}>{c.pricePerSF > 0 ? `$${c.pricePerSF.toFixed(0)}` : '—'}</td>
                    <td style={{ padding: '6px 8px', color: '#a78bfa' }}>{c.capRate > 0 ? `${(c.capRate*100).toFixed(2)}%` : '—'}</td>
                    <td style={{ padding: '6px 8px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.buyer}</td>
                    <td style={{ padding: '6px 8px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.seller}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
