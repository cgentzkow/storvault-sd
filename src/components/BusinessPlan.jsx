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

const REITS = ['public storage','extra space','cubesmart','life storage','simply self','national storage','smartstop']
const UHAUL = ['u-haul','uhaul']
function classify(p) {
  const n = (p.parentCompany||p.trueOwner||p.owner||'').toLowerCase()
  if (UHAUL.some(k=>n.includes(k))) return 'uhaul'
  if (REITS.some(k=>n.includes(k))) return 'reit'
  return 'private'
}

const cardStyle = { background:'#0d1526', border:'1px solid #1e2d47', borderRadius:'10px', padding:'18px', marginBottom:'16px' }
const thStyle = { padding:'7px 10px', fontSize:'10px', color:'#475569', letterSpacing:'0.08em', textAlign:'left', borderBottom:'1px solid #1e2d47', whiteSpace:'nowrap' }
const tdStyle = { padding:'7px 10px', fontSize:'11px', borderBottom:'1px solid #0a0f1e' }

const sectionHd = (title, sub) => (
  <div style={{ marginBottom:'14px' }}>
    <div style={{ fontSize:'14px', fontWeight:800, color:'#f8fafc' }}>{title}</div>
    {sub && <div style={{ fontSize:'11px', color:'#475569', marginTop:'2px' }}>{sub}</div>}
  </div>
)

// Western US intel — hardcoded from analysis
const WESTERN_BUYERS_200PSF = [
  { name:'Artemis Real Estate Partners', deals:2, vol:72.5, avgPsf:278, markets:'East Bay, CA', note:'Institutional. East Bay focus. $278/SF avg.' },
  { name:'Etude Capital, LLC', deals:10, vol:175.2, avgPsf:256, markets:'IE, Las Vegas, WA', note:'Portfolio buyer — bought 9-property portfolio Aug 2025 incl Temecula $291/SF. ZERO SD presence — prime target.' },
  { name:'Westport Properties, Inc.', deals:4, vol:58.8, avgPsf:296, markets:'OC, Vallejo, SoCal', note:'$360/SF in Costa Mesa. Active SoCal. Partners with Store Here.' },
  { name:'Baranof Holdings', deals:1, vol:30.2, avgPsf:436, markets:'San Francisco, CA', note:'SF premium buyer. Already owns 3 SD properties.' },
  { name:'InSite Property Group', deals:1, vol:21.4, avgPsf:364, markets:'East Bay, CA', note:'In your market. Paid $364/SF East Bay.' },
  { name:'Ares Management Corporation', deals:1, vol:21.3, avgPsf:267, markets:'San Diego, CA', note:'Paid $267/SF IN SD already. Institutional capital.' },
  { name:'Blue Vista', deals:1, vol:17.5, avgPsf:261, markets:'San Diego, CA', note:'Paid $261/SF in SD. Knows the market.' },
  { name:'Trojan Storage', deals:1, vol:21.5, avgPsf:227, markets:'Los Angeles, CA', note:'LA operator expanding.' },
]

const WESTERN_STATE_DATA = [
  { state:'CA', deals:66, vol:700, avgPsf:179, cap:6.05, capComps:8 },
  { state:'WA', deals:46, vol:298, avgPsf:118, cap:6.76, capComps:15 },
  { state:'NV', deals:41, vol:271, avgPsf:104, cap:5.05, capComps:4 },
  { state:'AZ', deals:101, vol:180, avgPsf:158, cap:6.01, capComps:1 },
  { state:'OR', deals:21, vol:70, avgPsf:109, cap:6.98, capComps:8 },
]

const WESTERN_MARKETS = [
  { market:'Las Vegas, NV', deals:34, vol:261, avgPsf:120, cap:4.50 },
  { market:'Seattle, WA', deals:18, vol:205, avgPsf:154, cap:null },
  { market:'Inland Empire, CA', deals:12, vol:132, avgPsf:159, cap:8.15 },
  { market:'Phoenix, AZ', deals:41, vol:131, avgPsf:249, cap:6.01 },
  { market:'East Bay, CA', deals:5, vol:118, avgPsf:269, cap:4.80 },
  { market:'Los Angeles, CA', deals:7, vol:91, avgPsf:192, cap:6.00 },
  { market:'San Diego, CA', deals:4, vol:44, avgPsf:213, cap:5.65 },
  { market:'Portland, OR', deals:8, vol:43, avgPsf:117, cap:6.21 },
  { market:'San Francisco, CA', deals:4, vol:43, avgPsf:366, cap:5.23 },
  { market:'San Jose, CA', deals:4, vol:33, avgPsf:168, cap:6.37 },
]

const SIZE_BANDS = [
  { label:'< 30K SF', deals:128, avgPrice:1.2, avgPsf:211, cap:7.05 },
  { label:'30–60K SF', deals:68, avgPrice:5.6, avgPsf:127, cap:5.70 },
  { label:'60–100K SF', deals:77, avgPrice:9.3, avgPsf:120, cap:5.19 },
  { label:'100K+ SF', deals:19, avgPrice:18.8, avgPsf:151, cap:3.50 },
]

const TOP_SELLERS = [
  { name:'W.P. Carey Inc.', deals:12, vol:198.2, avgPsf:202, note:'⚠️ REIT dumping 12 props — exiting self-storage entirely. Major exit signal.' },
  { name:'Towne Storage', deals:10, vol:120.2, avgPsf:159, note:'Regional operator cashing out.' },
  { name:'Hall Equities Group', deals:1, vol:47.0, avgPsf:323, note:'Private seller, top of market pricing.' },
  { name:'Merit Hill Capital / Centerbridge', deals:2, vol:26.4, avgPsf:185, note:'Institutional exit.' },
  { name:'Banner Real Estate Group', deals:1, vol:25.5, avgPsf:233, note:'Private seller.' },
  { name:'Claremont Companies', deals:1, vol:25.8, avgPsf:232, note:'New England operator, exiting West.' },
]


const HOLD_PERIOD_DATA = [
  { label: '<1 Year',    deals: 57,  vol: 96,  avgPsf: 129, cap: 7.65, note: 'Flips / distressed. Lowest $/SF, highest cap — opportunistic buying.' },
  { label: '1–2 Years',  deals: 11,  vol: 60,  avgPsf: 208, cap: 6.39, note: '🔑 HIGHEST $/SF — quick value-add exits commanding premium. 2023-24 buyers cashing out now.' },
  { label: '2–4 Years',  deals: 34,  vol: 380, avgPsf: 179, cap: 5.95, note: '⚠️ BIGGEST VOLUME — 2021-22 pandemic buyers selling NOW. Watch for motivated sellers.' },
  { label: '4–7 Years',  deals: 32,  vol: 217, avgPsf: 126, cap: 6.89, note: 'Mid-cycle exits. 2019-21 buyers.' },
  { label: '7–10 Years', deals: 25,  vol: 205, avgPsf: 138, cap: 5.91, note: '2015-18 buyers exiting.' },
  { label: '10–15 Years',deals: 23,  vol: 164, avgPsf: 157, cap: 6.02, note: 'Long-term operators.' },
  { label: '15–20 Years',deals: 6,   vol: 79,  avgPsf: 229, cap: 4.80, note: '20+ year holders get highest cap compression — patient capital wins.' },
]

const SELLER_BUYER_FLOW = [
  { flow: 'Private → Private',       deals: 114, vol: 670, note: 'Dominant. Mom-and-pop selling to private operators.' },
  { flow: 'Public → Private Equity', deals: 9,   vol: 166, note: '⚠️ REITs exiting to PE — W.P. Carey pattern. Institutional selling.' },
  { flow: 'Private → Institutional', deals: 8,   vol: 131, note: 'Private operators selling to institutions at top dollar.' },
  { flow: 'User → Public',           deals: 10,  vol: 120, note: 'Owner-users selling to REITs. Conversion opportunities.' },
  { flow: 'Private → Public',        deals: 7,   vol: 105, note: 'Private selling to REITs.' },
  { flow: 'Private → User',          deals: 8,   vol: 48,  note: 'Off-market, non-investment trades.' },
]

const QUARTER_DATA = [
  { q: 'Q2 2025', deals: 27,  vol: 200, avgPsf: 168 },
  { q: 'Q3 2025', deals: 107, vol: 548, avgPsf: 117, peak: true },
  { q: 'Q4 2025', deals: 69,  vol: 479, avgPsf: 144 },
  { q: 'Q1 2026', deals: 58,  vol: 179, avgPsf: 201 },
  { q: 'Q2 2026', deals: 31,  vol: 204, avgPsf: 127 },
]

export default function BusinessPlan() {
  const { reitProps, privateProps, uhaulProps, ownerMap, buyerIntel, yearData, maturing } = useMemo(() => {
    const reitProps = propertiesData.filter(p=>classify(p)==='reit')
    const privateProps = propertiesData.filter(p=>classify(p)==='private')
    const uhaulProps = propertiesData.filter(p=>classify(p)==='uhaul')
    const ownerMap = {}
    privateProps.forEach(p => {
      const key = (p.trueOwner||p.owner||'').trim()
      if (!key||key==='Unknown') return
      if (!ownerMap[key]) ownerMap[key] = { name:key, props:[], sf:0 }
      ownerMap[key].props.push(p); ownerMap[key].sf += p.sf||0
    })
    const buyerMap = {}
    compsData.forEach(c => {
      if (!c.buyer) return
      const name = c.buyer.split(' | ')[0].split(' (')[0].trim()
      if (!name||name==='Unknown') return
      if (!buyerMap[name]) buyerMap[name] = { name, deals:[], totalVol:0, avgPsf:[], avgCap:[], lastDeal:null }
      buyerMap[name].deals.push(c); buyerMap[name].totalVol += c.salePrice||0
      if (c.pricePerSF>0) buyerMap[name].avgPsf.push(c.pricePerSF)
      if (c.capRate>0) buyerMap[name].avgCap.push(c.capRate)
    })
    const buyerIntel = Object.values(buyerMap).map(b=>({
      ...b,
      avgPsf: b.avgPsf.length ? b.avgPsf.reduce((s,v)=>s+v,0)/b.avgPsf.length : 0,
      avgCap: b.avgCap.length ? b.avgCap.reduce((s,v)=>s+v,0)/b.avgCap.length : 0,
      lastDeal: b.deals.sort((a,b)=>(b.saleDate||'').localeCompare(a.saleDate||''))[0],
    })).sort((a,b)=>b.deals.length-a.deals.length)

    const yrMap = {}
    compsData.forEach(c => {
      const y = c.year; if(!y) return
      if(!yrMap[y]) yrMap[y] = { year:y, count:0, vol:0, psfVals:[] }
      yrMap[y].count++; yrMap[y].vol += c.salePrice||0
      if(c.pricePerSF>0) yrMap[y].psfVals.push(c.pricePerSF)
    })
    const yearData = Object.values(yrMap).sort((a,b)=>a.year-b.year).map(y=>({
      ...y, avgPsf: y.psfVals.length ? y.psfVals.reduce((s,v)=>s+v,0)/y.psfVals.length : 0
    }))

    const now = new Date(), in2yr = new Date(); in2yr.setFullYear(in2yr.getFullYear()+2)
    const maturing = propertiesData.filter(p => {
      if (!p.loanMaturity||p.loanMaturity==='nan') return false
      const d = new Date(p.loanMaturity); return d>=now&&d<=in2yr
    }).sort((a,b)=>a.loanMaturity.localeCompare(b.loanMaturity))

    return { reitProps, privateProps, uhaulProps, ownerMap, buyerIntel, yearData, maturing }
  }, [])

  const topPrivate = Object.values(ownerMap).sort((a,b)=>b.props.length-a.props.length).slice(0,20)
  const reitByOwner = {}
  reitProps.forEach(p => {
    const k=(p.parentCompany||p.trueOwner||p.owner||'Other').trim()
    if(!reitByOwner[k]) reitByOwner[k]={name:k,count:0,sf:0}
    reitByOwner[k].count++; reitByOwner[k].sf+=p.sf||0
  })
  const reitList = Object.values(reitByOwner).sort((a,b)=>b.count-a.count)

  const highlight = (color) => ({ color, fontWeight:700 })

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px', background:'#080d1a' }}>
      <div style={{ maxWidth:'1400px', margin:'0 auto' }}>
        <div style={{ marginBottom:'24px' }}>
          <h1 style={{ margin:'0 0 4px', fontSize:'20px', fontWeight:800, color:'#f8fafc' }}>StorVault SD — Business Plan</h1>
          <p style={{ margin:0, fontSize:'12px', color:'#475569' }}>315 SD properties · {compsData.length} SD sale comps since 2019 · 292 Western US comps last 12 months</p>
        </div>

        {/* ── SECTION 1: SD Sales Trend ── */}
        <div style={cardStyle}>
          {sectionHd('SD County — Sales Volume Trend', 'Your market, since 2019')}
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Year','# Sales','Volume','Avg $/SF'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {yearData.map(y=>(
                <tr key={y.year}>
                  <td style={{ ...tdStyle, ...highlight('#f59e0b') }}>{y.year}</td>
                  <td style={{ ...tdStyle, ...highlight('#60a5fa') }}>{y.count}</td>
                  <td style={{ ...tdStyle, ...highlight('#34d399') }}>{fmt$(y.vol)}</td>
                  <td style={{ ...tdStyle, color:'#e2e8f0' }}>{y.avgPsf>0?`$${y.avgPsf.toFixed(0)}`:' —'}</td>
                </tr>
              ))}
              <tr style={{ background:'#1a2540' }}>
                <td style={{ ...tdStyle, color:'#f8fafc', fontWeight:700 }}>TOTAL</td>
                <td style={{ ...tdStyle, ...highlight('#60a5fa') }}>{compsData.length}</td>
                <td style={{ ...tdStyle, ...highlight('#34d399') }}>{fmt$(compsData.reduce((s,c)=>s+(c.salePrice||0),0))}</td>
                <td style={{ ...tdStyle, color:'#f59e0b', fontWeight:700 }}>$213/SF SD avg</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── SECTION 2: Western US Market Intel ── */}
        <div style={cardStyle}>
          {sectionHd('🌎 Western US Market Intel — Last 12 Months', '292 sales · $1.61B volume across CA, WA, NV, AZ, OR')}

          {/* By State */}
          <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:700, marginBottom:'8px', letterSpacing:'0.06em' }}>BY STATE</div>
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
            <thead><tr>{['State','Deals','Volume','Avg $/SF','Cap Rate','Cap Comps'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {WESTERN_STATE_DATA.map(s=>(
                <tr key={s.state}>
                  <td style={{ ...tdStyle, ...highlight(s.state==='CA'?'#f59e0b':'#e2e8f0') }}>{s.state}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{s.deals}</td>
                  <td style={{ ...tdStyle, ...highlight('#34d399') }}>${s.vol}M</td>
                  <td style={{ ...tdStyle, ...highlight(s.avgPsf>=200?'#f59e0b':'#94a3b8') }}>${s.avgPsf}/SF</td>
                  <td style={{ ...tdStyle, color:'#a78bfa' }}>{s.cap.toFixed(2)}%</td>
                  <td style={{ ...tdStyle, color:'#334155', fontSize:'10px' }}>{s.capComps} comps</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* By Market */}
          <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:700, marginBottom:'8px', letterSpacing:'0.06em' }}>BY MARKET</div>
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
            <thead><tr>{['Market','Deals','Volume','Avg $/SF','Cap Rate'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {WESTERN_MARKETS.map(m=>(
                <tr key={m.market} style={{ background: m.market.includes('San Diego')?'rgba(245,158,11,0.08)':'transparent' }}>
                  <td style={{ ...tdStyle, color: m.market.includes('San Diego')?'#f59e0b':'#e2e8f0', fontWeight: m.market.includes('San Diego')?700:400 }}>{m.market}{m.market.includes('San Diego')?' ★':''}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{m.deals}</td>
                  <td style={{ ...tdStyle, ...highlight('#34d399') }}>${m.vol}M</td>
                  <td style={{ ...tdStyle, ...highlight(m.avgPsf>=200?'#f59e0b':'#94a3b8') }}>${m.avgPsf}/SF</td>
                  <td style={{ ...tdStyle, color:'#a78bfa' }}>{m.cap?`${m.cap.toFixed(2)}%`:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Size Bands */}
          <div style={{ fontSize:'11px', color:'#f59e0b', fontWeight:700, marginBottom:'8px', letterSpacing:'0.06em' }}>SIZE SWEET SPOTS — What's Trading</div>
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
            <thead><tr>{['Size Band','# Deals','Avg Price','Avg $/SF','Avg Cap'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {SIZE_BANDS.map(b=>(
                <tr key={b.label}>
                  <td style={{ ...tdStyle, color:'#e2e8f0' }}>{b.label}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{b.deals}</td>
                  <td style={{ ...tdStyle, color:'#34d399' }}>${b.avgPrice}M</td>
                  <td style={{ ...tdStyle, ...highlight(b.avgPsf>=200?'#f59e0b':'#94a3b8') }}>${b.avgPsf}/SF</td>
                  <td style={{ ...tdStyle, color:'#a78bfa' }}>{b.cap.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Insight box */}
          <div style={{ background:'#0a1122', border:'1px solid #1e2d47', borderRadius:'8px', padding:'14px', fontSize:'12px', lineHeight:1.8, color:'#94a3b8' }}>
            <strong style={{ color:'#f59e0b' }}>Key Insight:</strong> Small assets (&lt;30K SF) command the highest $/SF ($211) but highest cap rates (7.05%) — private buyers overpaying. Large assets (100K+) price at $151/SF but cap at only 3.50% — institutional compression. <strong style={{ color:'#60a5fa' }}>SD properties in the 60-100K SF range are undervalued vs. market — buyers here are paying $213/SF at 5.65% cap.</strong>
          </div>
        </div>

        {/* ── SECTION 3: Buyers Paying >$200/SF in CA ── */}
        <div style={cardStyle}>
          {sectionHd('🎯 CA Buyers Paying >$200/SF — Your Best Targets', 'These buyers have demonstrated willingness to pay premium pricing in California')}
          {WESTERN_BUYERS_200PSF.map(b => (
            <div key={b.name} style={{ background:'#0a1122', border:'1px solid #1e2d47', borderRadius:'8px', padding:'12px', marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                <span style={{ fontSize:'13px', fontWeight:700, color:'#e2e8f0' }}>{b.name}</span>
                <div style={{ display:'flex', gap:'12px', fontSize:'11px' }}>
                  <span style={{ color:'#60a5fa' }}>{b.deals} deal{b.deals!==1?'s':''}</span>
                  <span style={{ color:'#34d399', fontWeight:700 }}>${b.vol}M</span>
                  <span style={{ color:'#f59e0b', fontWeight:700 }}>${b.avgPsf}/SF avg</span>
                </div>
              </div>
              <div style={{ fontSize:'11px', color:'#64748b', marginBottom:'4px' }}>📍 {b.markets}</div>
              <div style={{ fontSize:'11px', color:'#94a3b8', fontStyle:'italic' }}>{b.note}</div>
            </div>
          ))}
        </div>

        {/* ── SECTION 4: Seller Signal ── */}
        <div style={cardStyle}>
          {sectionHd('🚨 Seller Intelligence — Who\'s Exiting', 'Watch these sellers — their motivation reveals market sentiment')}
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', padding:'14px', marginBottom:'16px' }}>
            <div style={{ fontSize:'13px', fontWeight:800, color:'#f87171', marginBottom:'6px' }}>⚠️ W.P. Carey — 12 Properties Dumped ($198M)</div>
            <div style={{ fontSize:'12px', color:'#94a3b8', lineHeight:1.7 }}>
              W.P. Carey is a large diversified REIT that appears to be <strong style={{ color:'#f87171' }}>exiting self-storage entirely</strong>. Selling 12 properties in one period at $202/SF avg is a major institutional exit signal. When a REIT this size exits a sector, it often signals they believe the cap rate compression cycle is over. <strong style={{ color:'#f59e0b' }}>This is exactly the kind of motivated institutional seller to track.</strong>
            </div>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Seller','Deals','Volume','Avg $/SF','Notes'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {TOP_SELLERS.map(s=>(
                <tr key={s.name}>
                  <td style={{ ...tdStyle, color:'#e2e8f0', fontWeight:600 }}>{s.name}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{s.deals}</td>
                  <td style={{ ...tdStyle, ...highlight('#34d399') }}>{fmt$(s.vol*1e6)}</td>
                  <td style={{ ...tdStyle, color:'#94a3b8' }}>${s.avgPsf}/SF</td>
                  <td style={{ ...tdStyle, color:'#64748b', fontSize:'10px' }}>{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SECTION 5: SD Owner Breakdown ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
          <div style={cardStyle}>
            {sectionHd('REITs / Nationals', 'Not your call list — unlikely to sell casually')}
            <div style={{ fontSize:'11px', color:'#475569', marginBottom:'10px' }}>
              <strong style={{ color:'#60a5fa' }}>{reitProps.length}</strong> properties · <strong style={{ color:'#34d399' }}>{fmtSF(reitProps.reduce((s,p)=>s+(p.sf||0),0))}</strong>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Owner','Props','SF'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {reitList.map(r=>(
                  <tr key={r.name}>
                    <td style={{ ...tdStyle, color:'#94a3b8' }}>{r.name}</td>
                    <td style={{ ...tdStyle, color:'#60a5fa' }}>{r.count}</td>
                    <td style={{ ...tdStyle, color:'#e2e8f0' }}>{fmtSF(r.sf)}</td>
                  </tr>
                ))}
                <tr style={{ background:'#1a2540' }}>
                  <td style={{ ...tdStyle, color:'#f8fafc', fontWeight:700 }}>U-Haul</td>
                  <td style={{ ...tdStyle, color:'#60a5fa', fontWeight:700 }}>{uhaulProps.length}</td>
                  <td style={{ ...tdStyle, color:'#e2e8f0', fontWeight:700 }}>{fmtSF(uhaulProps.reduce((s,p)=>s+(p.sf||0),0))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={cardStyle}>
            {sectionHd('Private / Local — Your Call List', `${privateProps.length} properties to target`)}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Owner','Props','SF','Notes'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {topPrivate.map(o=>(
                  <tr key={o.name}>
                    <td style={{ ...tdStyle, color:'#f59e0b', fontWeight:600, maxWidth:'160px' }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.name}</div>
                    </td>
                    <td style={{ ...tdStyle, color:'#60a5fa' }}>{o.props.length}</td>
                    <td style={{ ...tdStyle, color:'#e2e8f0' }}>{fmtSF(o.sf)}</td>
                    <td style={{ ...tdStyle, color:'#64748b', fontSize:'10px' }}>
                      {o.sf>500000?'🔑 Largest local':o.sf>200000?'📋 Multi-property':o.props.length===1?'👤 Mom-and-pop':''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 6: SD Buyer Intel ── */}
        <div style={cardStyle}>
          {sectionHd('SD Buyer Intelligence (since 2019)', 'Who has bought self-storage in your market')}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px' }}>
            {buyerIntel.slice(0,8).map(b=>(
              <div key={b.name} style={{ background:'#0a1122', border:'1px solid #1e2d47', borderRadius:'8px', padding:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontWeight:700, fontSize:'12px', color:'#e2e8f0' }}>{b.name}</span>
                  <span style={{ background:'#f59e0b22', color:'#f59e0b', borderRadius:'10px', padding:'2px 7px', fontSize:'10px', fontWeight:700 }}>{b.deals.length} deals</span>
                </div>
                <div style={{ display:'flex', gap:'12px', fontSize:'11px', marginBottom:'6px' }}>
                  <span style={{ color:'#34d399', fontWeight:700 }}>{fmt$(b.totalVol)}</span>
                  {b.avgPsf>0&&<span style={{ color:'#60a5fa' }}>${b.avgPsf.toFixed(0)}/SF</span>}
                  {b.avgCap>0&&<span style={{ color:'#a78bfa' }}>{(b.avgCap*100).toFixed(2)}% cap</span>}
                </div>
                {b.lastDeal&&<div style={{ fontSize:'10px', color:'#475569' }}>Last: {b.lastDeal.address}, {b.lastDeal.city} · {b.lastDeal.saleDate?.slice(0,10)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 7: Loan Maturities ── */}
        <div style={cardStyle}>
          {sectionHd('⚠️ Loan Maturities — Next 24 Months', `${maturing.length} SD properties with loans maturing — motivated seller potential`)}
          {maturing.length===0?(
            <div style={{ color:'#475569', fontSize:'12px' }}>No loans maturing in next 24 months in dataset.</div>
          ):(
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Maturity','Property','Owner','Lender','Loan','SF','Submarket'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {maturing.slice(0,20).map(p=>(
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, ...highlight('#f59e0b'), whiteSpace:'nowrap' }}>{p.loanMaturity}</td>
                    <td style={{ ...tdStyle, color:'#e2e8f0' }}>
                      <div>{p.name||p.address}</div>
                      {p.name&&<div style={{ fontSize:'10px', color:'#475569' }}>{p.address}, {p.city}</div>}
                    </td>
                    <td style={{ ...tdStyle, color:'#f59e0b', fontSize:'11px' }}>{p.trueOwner||p.owner||'—'}</td>
                    <td style={{ ...tdStyle, color:'#64748b', fontSize:'11px' }}>{p.lender||'—'}</td>
                    <td style={{ ...tdStyle, color:'#94a3b8' }}>{fmt$(p.loanAmount)}</td>
                    <td style={{ ...tdStyle, color:'#60a5fa' }}>{p.sf>0?p.sf.toLocaleString():'—'}</td>
                    <td style={{ ...tdStyle, color:'#64748b', fontSize:'11px' }}>{p.submarket||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── SECTION 8: Hold Period Analysis ── */}
        <div style={cardStyle}>
          {sectionHd("Hold Period Analysis — When Are Today's Sellers Exiting?', '292 Western US deals — understanding exit cycles tells you who's motivated to sell next')}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'16px' }}>
            <thead><tr>{['Hold Period','Deals','Volume','Avg $/SF','Avg Cap','Insight'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {HOLD_PERIOD_DATA.map(b=>(
                <tr key={b.label} style={{ background: b.label==='2–4 Years'?'rgba(248,113,113,0.06)': b.label==='1–2 Years'?'rgba(245,158,11,0.06)':'transparent' }}>
                  <td style={{ ...tdStyle, color:'#e2e8f0', fontWeight: (b.label==='2–4 Years'||b.label==='1–2 Years')?700:400 }}>{b.label}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{b.deals}</td>
                  <td style={{ ...tdStyle, color:'#34d399' }}>${b.vol}M</td>
                  <td style={{ ...tdStyle, ...highlight(b.avgPsf>=200?'#f59e0b':'#94a3b8') }}>${b.avgPsf}/SF</td>
                  <td style={{ ...tdStyle, color:'#a78bfa' }}>{b.cap.toFixed(2)}%</td>
                  <td style={{ ...tdStyle, color:'#64748b', fontSize:'10px' }}>{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'8px', padding:'14px', fontSize:'12px', lineHeight:1.8, color:'#94a3b8' }}>
            <strong style={{ color:'#f59e0b' }}>Strategic Implication:</strong> The 2–4 year bucket has the most volume ($380M, 34 deals). <strong style={{ color:'#f8fafc' }}>The 2021–2022 pandemic buyers are selling RIGHT NOW.</strong> These were value-add buyers who acquired at inflated prices and are exiting. This creates motivated sellers in your market — watch for properties that sold 2021-22 and are now being listed. Also: <strong style={{ color:'#34d399' }}>portfolio aggregation commands $179/SF vs $142/SF for single assets — a 26% premium.</strong> Owning multiple SD assets before selling dramatically increases exit value.
          </div>
        </div>

        {/* ── SECTION 9: Capital Flow ── */}
        <div style={cardStyle}>
          {sectionHd("Capital Flow — Who's Selling to Whom', 'Seller type → Buyer type tells you which direction institutional money is moving')}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'16px' }}>
            <thead><tr>{['Capital Flow','Deals','Volume','Signal'].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {SELLER_BUYER_FLOW.map(f=>(
                <tr key={f.flow} style={{ background: f.flow.includes('Public → Private Equity')?'rgba(248,113,113,0.06)':'transparent' }}>
                  <td style={{ ...tdStyle, color:'#e2e8f0', fontWeight:600 }}>{f.flow}</td>
                  <td style={{ ...tdStyle, color:'#60a5fa' }}>{f.deals}</td>
                  <td style={{ ...tdStyle, color:'#34d399' }}>${f.vol}M</td>
                  <td style={{ ...tdStyle, color:'#64748b', fontSize:'10px' }}>{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:'8px', padding:'12px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#f87171', marginBottom:'6px' }}>⚠️ Bearish Signal</div>
              <div style={{ fontSize:'11px', color:'#94a3b8', lineHeight:1.7 }}>Public → Private Equity ($166M): Institutional REITs are selling to PE. When smart money sells, pay attention. W.P. Carey dumping 12 properties confirms this.</div>
            </div>
            <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:'8px', padding:'12px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#34d399', marginBottom:'6px' }}>✅ Bullish Signal</div>
              <div style={{ fontSize:'11px', color:'#94a3b8', lineHeight:1.7 }}>Private → Institutional ($131M): Private operators are getting top dollar from institutions. Institutional capital is still buying — they just need the right asset. <strong style={{ color:'#34d399' }}>Build the portfolio, sell to an institution.</strong></div>
            </div>
          </div>
        </div>

        {/* ── SECTION 10: Deal Velocity ── */}
        <div style={cardStyle}>
          {sectionHd('📈 Deal Velocity — Quarter by Quarter', 'Is the market speeding up or slowing down?')}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
            {QUARTER_DATA.map(q => {
              const maxDeals = Math.max(...QUARTER_DATA.map(d=>d.deals))
              const barWidth = (q.deals/maxDeals)*100
              return (
                <div key={q.q} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'70px', fontSize:'11px', color: q.peak?'#f59e0b':'#64748b', fontWeight: q.peak?700:400, flexShrink:0 }}>{q.q}</div>
                  <div style={{ flex:1, background:'#1a2540', borderRadius:'4px', height:'28px', position:'relative', overflow:'hidden' }}>
                    <div style={{ width:`${barWidth}%`, height:'100%', background: q.peak?'#f59e0b22':'#1e3a5f', borderRight:`2px solid ${q.peak?'#f59e0b':'#2d5a8e'}`, display:'flex', alignItems:'center', paddingLeft:'8px' }}>
                      <span style={{ fontSize:'11px', color: q.peak?'#f59e0b':'#60a5fa', fontWeight:700 }}>{q.deals} deals</span>
                    </div>
                  </div>
                  <div style={{ width:'60px', fontSize:'11px', color:'#34d399', textAlign:'right', flexShrink:0 }}>${q.vol}M</div>
                  <div style={{ width:'60px', fontSize:'11px', color:'#f59e0b', textAlign:'right', flexShrink:0 }}>${q.avgPsf}/SF</div>
                </div>
              )
            })}
          </div>
          <div style={{ background:'#0a1122', border:'1px solid #1e2d47', borderRadius:'8px', padding:'12px', fontSize:'11px', color:'#94a3b8', lineHeight:1.7 }}>
            <strong style={{ color:'#f8fafc' }}>Q3 2025 was the peak</strong> (107 deals, $548M) — the largest quarter in this dataset. Activity is moderating in Q4 2025 and Q1 2026, but $/SF is <em>rising</em> in Q1 2026 ($201/SF) despite fewer deals. <strong style={{ color:'#34d399' }}>Fewer deals at higher prices = tightening supply, not demand destruction.</strong> This is a healthy market correction, not a collapse.
          </div>
        </div>

      </div>
    </div>
  )
}
// This file gets the additional sections appended via the main rewrite below
