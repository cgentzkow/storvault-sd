import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

function fmt$(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}

const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#f87171', '#38bdf8']

export default function Dashboard({ comps, properties }) {
  const yearData = useMemo(() => {
    const years = {}
    comps.forEach(c => {
      const y = c.year
      if (!y || y < 2019 || y > 2026) return
      if (!years[y]) years[y] = { year: y, count: 0, volume: 0, psfSum: 0, psfCount: 0, capSum: 0, capCount: 0 }
      years[y].count++
      years[y].volume += c.salePrice || 0
      if (c.pricePsf > 0) { years[y].psfSum += c.pricePsf; years[y].psfCount++ }
      if (c.capRate > 0) { years[y].capSum += c.capRate; years[y].capCount++ }
    })
    return Object.values(years).sort((a, b) => a.year - b.year).map(y => ({
      ...y,
      volumeM: +(y.volume / 1e6).toFixed(1),
      avgPsf: y.psfCount > 0 ? +(y.psfSum / y.psfCount).toFixed(0) : 0,
      avgCap: y.capCount > 0 ? +(y.capSum / y.capCount * 100).toFixed(2) : 0,
    }))
  }, [comps])

  const buyerTypeData = useMemo(() => {
    const types = {}
    comps.forEach(c => {
      const t = c.buyerType?.split(' | ')[0] || 'Unknown'
      types[t] = (types[t] || 0) + (c.salePrice || 0)
    })
    return Object.entries(types).map(([name, value]) => ({ name, value: +(value/1e6).toFixed(1) }))
      .sort((a, b) => b.value - a.value)
  }, [comps])

  const sellerTypeData = useMemo(() => {
    const types = {}
    comps.forEach(c => {
      const t = c.sellerType?.split(' | ')[0] || 'Unknown'
      types[t] = (types[t] || 0) + (c.salePrice || 0)
    })
    return Object.entries(types).map(([name, value]) => ({ name, value: +(value/1e6).toFixed(1) }))
      .sort((a, b) => b.value - a.value)
  }, [comps])

  const topBuyers = useMemo(() => {
    const buyers = {}
    comps.forEach(c => {
      if (!c.buyer) return
      const b = c.buyer.split(' | ')[0].split(' (')[0]
      if (!buyers[b]) buyers[b] = { count: 0, vol: 0 }
      buyers[b].count++
      buyers[b].vol += c.salePrice || 0
    })
    return Object.entries(buyers).map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count).slice(0, 8)
  }, [comps])

  const topSellers = useMemo(() => {
    const sellers = {}
    comps.forEach(c => {
      if (!c.seller) return
      const s = c.seller.split(' | ')[0]
      if (!sellers[s]) sellers[s] = { count: 0, vol: 0 }
      sellers[s].count++
      sellers[s].vol += c.salePrice || 0
    })
    return Object.entries(sellers).map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count).slice(0, 8)
  }, [comps])

  const ownerBreakdown = useMemo(() => {
    const types = { 'Private / Local': 0, 'REIT / Public': 0, 'U-Haul': 0 }
    properties.forEach(p => {
      if (p.ownerType === 'uhaul') types['U-Haul']++
      else if (p.ownerType === 'reit') types['REIT / Public']++
      else types['Private / Local']++
    })
    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }, [properties])

  const subData = useMemo(() => {
    const subs = {}
    properties.forEach(p => {
      if (p.submarket) subs[p.submarket] = (subs[p.submarket] || 0) + 1
    })
    return Object.entries(subs).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 12)
  }, [properties])

  const totalVol = comps.reduce((s, c) => s + (c.salePrice || 0), 0)
  const avgPsf = comps.filter(c => c.pricePsf > 0).reduce((s, c) => s + c.pricePsf, 0) / comps.filter(c => c.pricePsf > 0).length
  const avgCap = comps.filter(c => c.capRate > 0).reduce((s, c) => s + c.capRate, 0) / comps.filter(c => c.capRate > 0).length

  const card = (label, val, sub, color = '#60a5fa') => (
    <div style={{ background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.08em', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  const chartStyle = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '8px', padding: '16px' }
  const titleStyle = { fontSize: '11px', color: '#475569', letterSpacing: '0.1em', marginBottom: '14px' }
  const ttStyle = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '6px', fontSize: '11px', color: '#e2e8f0' }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px', background: '#080d1a' }}>
      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '20px' }}>
        {card('TOTAL PROPERTIES', properties.length, 'SD County', '#60a5fa')}
        {card('SALES SINCE 2019', comps.length, '70 transactions', '#34d399')}
        {card('TOTAL VOLUME', fmt$(totalVol), 'Jan 2019–2026', '#a78bfa')}
        {card('AVG PRICE / SF', `$${avgPsf.toFixed(0)}`, 'All comps', '#f59e0b')}
        {card('AVG CAP RATE', `${(avgCap).toFixed(1)}%`, 'Known cap rates', '#38bdf8')}
        {card('FOR SALE NOW', properties.filter(p => p.forSale).length, 'In SD County', '#f87171')}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={chartStyle}>
          <div style={titleStyle}>SALES VOLUME BY YEAR ($M)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}M`]} />
              <Bar dataKey="volumeM" fill="#60a5fa" radius={[3,3,0,0]} name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={chartStyle}>
          <div style={titleStyle}>AVERAGE PRICE PER SF BY YEAR</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={yearData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}/SF`]} />
              <Line type="monotone" dataKey="avgPsf" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="$/SF" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={chartStyle}>
          <div style={titleStyle}>CURRENT OWNERS (313 PROPERTIES)</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={ownerBreakdown} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${value}`}>
                {ownerBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={chartStyle}>
          <div style={titleStyle}>BUYER TYPE BY VOLUME ($M)</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={buyerTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${value}M`} labelLine={false}>
                {buyerTypeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}M`]} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={chartStyle}>
          <div style={titleStyle}>SELLER TYPE BY VOLUME ($M)</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={sellerTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${value}M`} labelLine={false}>
                {sellerTypeData.map((_, i) => <Cell key={i} fill={COLORS[i + 2]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}M`]} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* Transactions by year */}
        <div style={chartStyle}>
          <div style={titleStyle}>DEAL COUNT BY YEAR</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={yearData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" fill="#34d399" radius={[3,3,0,0]} name="Deals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top buyers */}
        <div style={chartStyle}>
          <div style={titleStyle}>TOP BUYERS (# DEALS)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {topBuyers.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name || '—'}</div>
                <div style={{
                  width: `${(b.count / topBuyers[0].count) * 80}px`,
                  height: '8px', background: '#60a5fa', borderRadius: '2px', flexShrink: 0
                }} />
                <div style={{ fontSize: '11px', color: '#60a5fa', minWidth: '20px', textAlign: 'right' }}>{b.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Properties by submarket */}
        <div style={chartStyle}>
          <div style={titleStyle}>PROPERTIES BY SUBMARKET</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {subData.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.name}</div>
                <div style={{
                  flex: 1, height: '8px', background: COLORS[i % COLORS.length], borderRadius: '2px',
                  width: `${(s.count / subData[0].count) * 100}%`
                }} />
                <div style={{ fontSize: '11px', color: '#64748b', minWidth: '20px', textAlign: 'right' }}>{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
