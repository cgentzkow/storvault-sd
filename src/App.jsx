import { useState, useEffect } from 'react'
import { db } from './firebase.js'
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore'
import Login from './components/Login.jsx'
import MapView from './components/MapView.jsx'
import PropertyList from './components/PropertyList.jsx'
import Dashboard from './components/Dashboard.jsx'
import BuyerProfiles from './components/BuyerProfiles.jsx'
import BusinessPlan from './components/BusinessPlan.jsx'
import Leads from './components/Leads.jsx'
import GlobalSearch from './components/GlobalSearch.jsx'
import rawProperties from './data/properties.json'
import rawComps from './data/comps.json'

const NAV_ITEMS = [
  { id: 'map', label: 'MAP', icon: '🗺' },
  { id: 'properties', label: 'PROPERTIES', icon: '🏢' },
  { id: 'leads', label: 'LEADS', icon: '📋' },
  { id: 'dashboard', label: 'MARKET', icon: '📊' },
  { id: 'buyers', label: 'BUYERS', icon: '🎯' },
  { id: 'plan', label: 'PLAN', icon: '📈' },
]

const USERS = {
  'chris@duhscommercial.com': { name: 'Chris Gentzkow', id: 'CG' },
  'austin@duhscommercial.com': { name: 'Austin Dias', id: 'AD' },
}

// Google Maps loaded via useGoogleMaps hook

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sv_user')) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('map')
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [dbReady, setDbReady] = useState(false)

  // Hash-based routing for back button support
  useEffect(() => {
    const onHashChange = () => {
      const tab = window.location.hash.replace('#', '') || 'map'
      const valid = ['map','properties','leads','dashboard','buyers','plan']
      if (valid.includes(tab)) setActiveTab(tab)
    }
    window.addEventListener('hashchange', onHashChange)
    onHashChange()
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleLogin = (user) => { sessionStorage.setItem('sv_user', JSON.stringify(user)); setCurrentUser(user) }
  const handleLogout = () => { sessionStorage.removeItem('sv_user'); setCurrentUser(null) }

  useEffect(() => {
    if (!currentUser) return
    const base = rawProperties.map(p => ({ ...p, callStatus: p.callStatus || 'not_called', callLog: [] }))
    setProperties(base)
    const unsub = onSnapshot(collection(db, 'storvault_properties'), snap => {
      const crmMap = {}
      snap.forEach(d => { crmMap[d.id] = d.data() })
      setProperties(prev => prev.map(p => ({
        ...p,
        callStatus: crmMap[String(p.id)]?.callStatus || p.callStatus || 'not_called',
        callLog: crmMap[String(p.id)]?.callLog || [],
      })))
      setDbReady(true)
    }, () => setDbReady(true))
    return () => unsub()
  }, [currentUser])

  const updateProperty = async (id, updates) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const crmFields = {}
    if ('callStatus' in updates) crmFields.callStatus = updates.callStatus
    if ('callLog' in updates) crmFields.callLog = updates.callLog
    if (Object.keys(crmFields).length > 0)
      await setDoc(doc(db, 'storvault_properties', String(id)), crmFields, { merge: true })
  }

  const handleSearchSelect = (result) => {
    if (result.type === 'property') {
      setSelectedProperty(result.property)
      setActiveTab('map')
    }
  }

  if (!currentUser) return <Login onLogin={handleLogin} />

  const profile = USERS[currentUser.email] || { name: currentUser.email, id: 'U' }
  const stats = {
    total: properties.length,
    called: properties.filter(p => p.callStatus !== 'not_called').length,
    interested: properties.filter(p => p.callStatus === 'interested').length,
    forSale: properties.filter(p => p.forSale).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080d1a' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '52px', background: '#0d1526', borderBottom: '1px solid #1e2d47', flexShrink: 0, zIndex: 100, gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width:'28px', height:'28px', background:'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:800, color:'#000' }}>S</div>
          <span style={{ fontSize:'14px', fontWeight:700, letterSpacing:'0.08em', color:'#f8fafc', whiteSpace:'nowrap' }}>
            STORVAULT <span style={{ color:'#f59e0b' }}>SD</span>
          </span>
          {!dbReady && <span style={{ fontSize:'9px', color:'#475569' }}>connecting…</span>}
        </div>

        {/* Global Search */}
        <GlobalSearch properties={properties} onSelectProperty={(p) => { setSelectedProperty(p); setActiveTab('map') }} onNavigate={handleSearchSelect} />

        <nav style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); window.location.hash = item.id }} style={{
              padding:'5px 10px', border:'none', borderRadius:'5px', cursor:'pointer',
              fontSize:'10px', fontWeight:700, letterSpacing:'0.05em',
              background: activeTab===item.id ? '#f59e0b' : 'transparent',
              color: activeTab===item.id ? '#000' : '#94a3b8',
            }}>{item.icon} {item.label}</button>
          ))}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:'16px', flexShrink:0 }}>
          <div style={{ display:'flex', gap:'14px', fontSize:'10px' }}>
            {[
              { label:'PROPS', val:stats.total, color:'#60a5fa' },
              { label:'CALLED', val:stats.called, color:'#34d399' },
              { label:'HOT', val:stats.interested, color:'#f59e0b' },
              { label:'4 SALE', val:stats.forSale, color:'#f87171' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ color:s.color, fontWeight:800, fontSize:'13px' }}>{s.val}</div>
                <div style={{ color:'#475569' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', borderLeft:'1px solid #1e2d47', paddingLeft:'14px' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:'#1e2d47', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:'#f59e0b' }}>{profile.id}</div>
            <div>
              <div style={{ fontSize:'10px', color:'#e2e8f0', fontWeight:600 }}>{profile.name.split(' ')[0]}</div>
              <button onClick={handleLogout} style={{ background:'none', border:'none', color:'#475569', fontSize:'9px', cursor:'pointer', padding:0, textDecoration:'underline' }}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex:1, overflow:'hidden' }}>
        {activeTab==='map' && <MapView properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} updateProperty={updateProperty} currentUser={currentUser} />}
        {activeTab==='properties' && <PropertyList properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} updateProperty={updateProperty} currentUser={currentUser} />}
        {activeTab==='leads' && <Leads currentUser={currentUser} />}
        {activeTab==='dashboard' && <Dashboard comps={rawComps} properties={properties} />}
        {activeTab==='buyers' && <BuyerProfiles currentUser={currentUser} properties={properties} onSelectProperty={(p) => { setSelectedProperty(p); setActiveTab('map') }} />}
        {activeTab==='plan' && <BusinessPlan />}
      </main>
    </div>
  )
}
