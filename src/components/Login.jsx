import { useState } from 'react'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Invalid email or password')
    }
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#080d1a',
    }}>
      <div style={{
        background: '#0d1526', border: '1px solid #1e2d47', borderRadius: '12px',
        padding: '40px', width: '340px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 800, color: '#000'
          }}>S</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.06em' }}>
              STORVAULT <span style={{ color: '#f59e0b' }}>SD</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>Self-Storage Intelligence</div>
          </div>
        </div>

        <form onSubmit={login}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={{
              width: '100%', padding: '10px 12px', marginBottom: '10px',
              background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '6px',
              color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            style={{
              width: '100%', padding: '10px 12px', marginBottom: '16px',
              background: '#1a2540', border: '1px solid #2d3f5e', borderRadius: '6px',
              color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box', outline: 'none',
            }}
          />
          {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', background: '#f59e0b', border: 'none',
            borderRadius: '6px', color: '#000', fontWeight: 700, fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
