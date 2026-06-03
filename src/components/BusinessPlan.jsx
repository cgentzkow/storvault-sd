import { useMemo } from 'react'
import compsData from '../data/comps.json'
import propertiesData from '../data/properties.json'

function fmt$(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${n}`
}
function fmtSF(n) { return n >= 1e6 ? `${(n/1e6).toFixed(1)}M SF` : `${(n/1e3).toFixed(0)}K SF` }

const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop','nsa real','nsa ','stor-quest','storquest']
const UHAUL = ['u-haul','uhaul']

function classify(p) {
  const n = (p.parentCompany || p.trueOwner || p.owner || '').toLowerCase()
  if (UHAUL.some(k => n.includes(k))) return 'uhaul'
  if (REITS.some(k => n.includes(k))) return 'reit'
  return 'private'
}

const cardStyle = { background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '10px', padding: '18px' }
const thStyle = { padding: '7px 10px', fontSize: '10px', color: '#475569', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid #1e2d47', whiteSpace: 'nowrap' }
const tdStyle = { padding: '7px 10px', fontSize: '11px', borderBottom: '1px solid #0a0f1e' }

export default function BusinessPlan() {
  const { reitProps, privateProps, uhaulProps, ownerMap, buyerIntel, yearData } = useMemo(() => {
    const reitProps = propertiesData.filter(p => classify(p) === 'reit')
    const privateProps = propertiesData.filter(p => classify(p) === 'private')
    const uhaulProps = propertiesData.filter(p => classify(p) === 'uhaul')

    // Private owner aggregation
    const ownerMap = {}
    privateProps.forEach(p => {
      const key = (p.trueOwner || p.owner || 'Unknown').trim()
      if (!key || key === 'Unknown') return
      if (!ownerMap[key]) ownerMap[key] = { name: key, props: [], sf: 0 }
      ownerMap[key].props.push(p)
      ownerMap[key].sf += p.sf || 0
    })

    // Buyer intelligence from comps
    const buyerMap = {}
    compsData.forEach(c => {
      if (!c.buyer) return
      const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
      if (!name || name === 'Unknown') return
      if (!buyerMap[name]) buyerMap[name] = { name, deals: [], totalVol: 0, avgPsf: [], avgCap: [] }
      buyerMap[name].deals.push(c)
      buyerMap[name].totalVol += c.salePrice || 0
      if (c.pricePerSF > 0) buyerMap[name].avgPsf.push(c.pricePerSF)
      if (c.capRate > 0) buyerMap[name].avgCap.push(c.capRate)
    })

    const buyerIntel = Object.values(buyerMap)
      .map(b => ({
        ...b,
        avgPsf: b.avgPsf.length ? b.avgPsf.reduce((s,v)=>s+v,0)/b.avgPsf.length : 0,
        avgCap: b.avgCap.length ? b.avgCap.reduce((s,v)=>s+v,0)/b.avgCap.length : 0,
        lastDeal: b.deals.sort((a,b) => (b.saleDate||'').localeCompare(a.saleDate||''))[0],
      }))
      .sort((a,b) => b.deals.length - a.deals.length)

    // Year data for sales trend table
    const yrMap = {}
    compsData.forEach(c => {
      const y = c.year; if (!y) return
      if (!yrMap[y]) yrMap[y] = { year: y, count: 0, vol: 0, psfVals: [] }
      yrMap[y].count++
      yrMap[y].vol += c.salePrice || 0
      if (c.pricePerSF > 0) yrMap[y].psfVals.push(c.pricePerSF)
    })
    const yearData = Object.values(yrMap).sort((a,b) => a.year - b.year).map(y => ({
      ...y, avgPsf: y.psfVals.length ? y.psfVals.reduce((s,v)=>s+v,0)/y.psfVals.length : 0
    }))

    return { reitProps, privateProps, uhaulProps, ownerMap, buyerIntel, yearData }
  }, [])

  const topPrivate = Object.values(ownerMap).sort((a,b) => b.props.length - a.props.length).slice(0, 20)
  const reitByOwner = {}
  reitProps.forEach(p => {
    const k = (p.parentCompany || p.trueOwner || p.owner || 'Other').trim()
    if (!reitByOwner[k]) reitByOwner[k] = { name: k, count: 0, sf: 0 }
    reitByOwner[k].count++; reitByOwner[k].sf += p.sf || 0
  })
  const reitList = Object.values(reitByOwner).sort((a,b) => b.count-a.count)

  // Loan maturities upcoming
  const now = new Date()
  const in2yr = new Date(); in2yr.setFullYear(in2yr.getFullYear()+2)
  const maturing = propertiesData.filter(p => {
    if (!p.loanMaturity || p.loanMaturity === 'nan') return false
    const d = new Date(p.loanMaturity)
    return d >= now && d <= in2yr
  }).sort((a,b) => a.loanMaturity.localeCompare(b.loanMaturity))

  const sectionHd = (title, sub) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>{title}</div>
      {sub && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', background: '#080d1a' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
            StorVault SD — Business Plan
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
            313 self-storage properties · SD County · {compsData.length} sale comps since Jan 2019
          </p>
        </div>

        {/* Sales Trend Table */}
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          {sectionHd('Sales Volume Trend', 'SD County self-storage transactions by year')}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Year','# Sales','Volume','Avg $/SF'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {yearData.map(y => (
                <tr key={y.year}>
                  <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 700 }}>{y.year}</td>
                  <td style={{ ...tdStyle, color: '#60a5fa' }}>{y.count}</td>
                  <td style={{ ...tdStyle, color: '#34d399', fontWeight: 600 }}>{fmt$(y.vol)}</td>
                  <td style={{ ...tdStyle, color: '#e2e8f0' }}>{y.avgPsf > 0 ? `$${y.avgPsf.toFixed(0)}` : '—'}</td>
                </tr>
              ))}
              <tr style={{ background: '#1a2540' }}>
                <td style={{ ...tdStyle, color: '#f8fafc', fontWeight: 700 }}>TOTAL</td>
                <td style={{ ...tdStyle, color: '#60a5fa', fontWeight: 700 }}>{compsData.length}</td>
                <td style={{ ...tdStyle, color: '#34d399', fontWeight: 700 }}>{fmt$(compsData.reduce((s,c)=>s+(c.salePrice||0),0))}</td>
                <td style={{ ...tdStyle, color: '#e2e8f0', fontWeight: 700 }}>
                  ${(compsData.filter(c=>c.pricePerSF>0).reduce((s,c)=>s+c.pricePerSF,0)/compsData.filter(c=>c.pricePerSF>0).length).toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Owner Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* REITs */}
          <div style={cardStyle}>
            {sectionHd('REITs / Nationals', 'Own it — unlikely to sell casually')}
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
              <strong style={{ color: '#60a5fa' }}>{reitProps.length}</strong> properties · <strong style={{ color: '#34d399' }}>{fmtSF(reitProps.reduce((s,p)=>s+(p.sf||0),0))}</strong> · Not your call list
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Owner','Properties','Total SF','Avg SF'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {reitList.map(r => (
                  <tr key={r.name}>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ ...tdStyle, color: '#60a5fa' }}>{r.count}</td>
                    <td style={{ ...tdStyle, color: '#e2e8f0' }}>{fmtSF(r.sf)}</td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>{fmtSF(Math.round(r.sf/r.count))}</td>
                  </tr>
                ))}
                <tr style={{ background: '#1a2540' }}>
                  <td style={{ ...tdStyle, color: '#f8fafc', fontWeight: 700 }}>U-Haul</td>
                  <td style={{ ...tdStyle, color: '#60a5fa', fontWeight: 700 }}>{uhaulProps.length}</td>
                  <td style={{ ...tdStyle, color: '#e2e8f0', fontWeight: 700 }}>{fmtSF(uhaulProps.reduce((s,p)=>s+(p.sf||0),0))}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{uhaulProps.length ? fmtSF(Math.round(uhaulProps.reduce((s,p)=>s+(p.sf||0),0)/uhaulProps.length)) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Private / Local — Your Call List */}
          <div style={cardStyle}>
            {sectionHd('Private / Local — Your Call List', 'These are your targets')}
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
              <strong style={{ color: '#f59e0b' }}>{privateProps.length}</strong> properties · <strong style={{ color: '#34d399' }}>{fmtSF(privateProps.reduce((s,p)=>s+(p.sf||0),0))}</strong>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Owner','Props','Total SF','Notes'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {topPrivate.map((o, i) => (
                  <tr key={o.name}>
                    <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 600, maxWidth: '180px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                    </td>
                    <td style={{ ...tdStyle, color: '#60a5fa' }}>{o.props.length}</td>
                    <td style={{ ...tdStyle, color: '#e2e8f0' }}>{fmtSF(o.sf)}</td>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: '10px' }}>
                      {o.sf > 500000 ? '🔑 Largest local operator' :
                       o.sf > 200000 ? '📋 Multi-property' :
                       o.props.length === 1 ? '👤 Individual / Mom-and-pop' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buyer Intelligence */}
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          {sectionHd('Buyer Intelligence', 'Who has bought self-storage in SD — build these relationships')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {buyerIntel.slice(0, 8).map(b => (
              <div key={b.name} style={{ background: '#0a1122', border: '1px solid #1e2d47', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#e2e8f0', flex: 1, marginRight: '8px' }}>{b.name}</div>
                  <span style={{ background: '#f59e0b22', color: '#f59e0b', borderRadius: '10px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                    {b.deals.length} deal{b.deals.length!==1?'s':''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginBottom: '8px' }}>
                  <div><span style={{ color: '#475569' }}>Volume: </span><span style={{ color: '#34d399', fontWeight: 700 }}>{fmt$(b.totalVol)}</span></div>
                  {b.avgPsf > 0 && <div><span style={{ color: '#475569' }}>Avg $/SF: </span><span style={{ color: '#60a5fa' }}>${b.avgPsf.toFixed(0)}</span></div>}
                  {b.avgCap > 0 && <div><span style={{ color: '#475569' }}>Avg Cap: </span><span style={{ color: '#a78bfa' }}>{(b.avgCap*100).toFixed(2)}%</span></div>}
                </div>
                {b.lastDeal && (
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    Last deal: {b.lastDeal.address}, {b.lastDeal.city} · {b.lastDeal.saleDate?.slice(0,10)} · {fmt$(b.lastDeal.salePrice)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Loan Maturities */}
        <div style={cardStyle}>
          {sectionHd('⚠️ Loan Maturities — Next 24 Months', `${maturing.length} properties with loans maturing by mid-2028 — motivated seller potential`)}
          {maturing.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '12px' }}>No loans maturing in next 24 months found in dataset.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Maturity','Property','Owner','Lender','Loan Amount','SF','Submarket'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {maturing.slice(0,20).map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.loanMaturity}</td>
                    <td style={{ ...tdStyle, color: '#e2e8f0' }}>
                      <div>{p.name || p.address}</div>
                      {p.name && <div style={{ fontSize: '10px', color: '#475569' }}>{p.address}, {p.city}</div>}
                    </td>
                    <td style={{ ...tdStyle, color: '#f59e0b', fontSize: '11px' }}>{p.trueOwner || p.owner || '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: '11px' }}>{p.lender || '—'}</td>
                    <td style={{ ...tdStyle, color: '#94a3b8' }}>{fmt$(p.loanAmount)}</td>
                    <td style={{ ...tdStyle, color: '#60a5fa' }}>{p.sf > 0 ? p.sf.toLocaleString() : '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: '11px' }}>{p.submarket || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
