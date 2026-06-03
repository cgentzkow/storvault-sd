import { useState, useEffect } from 'react'
import { db } from './firebase.js'
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore'
import Login from './components/Login.jsx'
import MapView from './components/MapView.jsx'
import PropertyList from './components/PropertyList.jsx'
import Dashboard from './components/Dashboard.jsx'
import BuyerProfiles from './components/BuyerProfiles.jsx'
import BusinessPlan from './components/BusinessPlan.jsx'
import rawProperties from './data/properties.json'
import rawComps from './data/comps.json'

const NAV_ITEMS = [
  { id: 'map', label: 'MAP', icon: '🗺' },
  { id: 'properties', label: 'PROPERTIES', icon: '🏢' },
  { id: 'dashboard', label: 'MARKET', icon: '📊' },
  { id: 'buyers', label: 'BUYERS', icon: '🎯' },
  { id: 'plan', label: 'BUSINESS PLAN', icon: '📋' },
]

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sv_user')) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('map')
  const [properties, setProperties] = useState([])
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [dbReady, setDbReady] = useState(false)

  const handleLogin = (user) => {
    sessionStorage.setItem('sv_user', JSON.stringify(user))
    setCurrentUser(user)
  }
  const handleLogout = () => {
    sessionStorage.removeItem('sv_user')
    setCurrentUser(null)
  }

  useEffect(() => {
    if (!currentUser) return
    const baseProps = rawProperties.map(p => ({
      ...p,
      callStatus: p.callStatus || 'not_called',
      callLog: [],
    }))
    setProperties(baseProps)

    const unsub = onSnapshot(collection(db, 'storvault_properties'), snapshot => {
      const crmMap = {}
      snapshot.forEach(d => { crmMap[d.id] = d.data() })
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
    if (Object.keys(crmFields).length > 0) {
      await setDoc(doc(db, 'storvault_properties', String(id)), crmFields, { merge: true })
    }
  }

  if (!currentUser) return <Login onLogin={handleLogin} />

  const stats = {
    total: properties.length,
    called: properties.filter(p => p.callStatus !== 'not_called').length,
    interested: properties.filter(p => p.callStatus === 'interested').length,
    forSale: properties.filter(p => p.forSale).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080d1a' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '52px', background: '#0d1526',
        borderBottom: '1px solid #1e2d47', flexShrink: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px', height: '28px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 800, color: '#000'
          }}>S</div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', color: '#f8fafc' }}>
            STORVAULT <span style={{ color: '#f59e0b' }}>SD</span>
          </span>
          {!dbReady && <span style={{ fontSize: '10px', color: '#475569' }}>connecting…</span>}
        </div>
        <nav style={{ display: 'flex', gap: '4px' }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
              background: activeTab === item.id ? '#f59e0b' : 'transparent',
              color: activeTab === item.id ? '#000' : '#94a3b8',
            }}>{item.icon} {item.label}</button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', fontSize: '11px' }}>
            {[
              { label: 'PROPERTIES', val: stats.total, color: '#60a5fa' },
              { label: 'CALLED', val: stats.called, color: '#34d399' },
              { label: 'INTERESTED', val: stats.interested, color: '#f59e0b' },
              { label: 'FOR SALE', val: stats.forSale, color: '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: '15px' }}>{s.val}</div>
                <div style={{ color: '#475569', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #1e2d47', paddingLeft: '16px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', background: '#1e2d47',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: '#f59e0b'
            }}>{currentUser.id}</div>
            <div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>{currentUser.name}</div>
              <button onClick={handleLogout} style={{
                background: 'none', border: 'none', color: '#475569', fontSize: '10px',
                cursor: 'pointer', padding: 0, textDecoration: 'underline'
              }}>Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'map' && <MapView properties={properties} currentUser={currentUser} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} updateProperty={updateProperty} />}
        {activeTab === 'properties' && <PropertyList properties={properties} currentUser={currentUser} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty} updateProperty={updateProperty} />}
        {activeTab === 'dashboard' && <Dashboard comps={rawComps} properties={properties} />}
        {activeTab === 'buyers' && <BuyerProfiles currentUser={currentUser} />}
        {activeTab === 'plan' && <BusinessPlan />}
      </main>
    </div>
  )
}
