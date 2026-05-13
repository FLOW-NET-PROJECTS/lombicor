import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { unlockAdmin } from '../lib/api'

export default function AdminGate() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await unlockAdmin(pin)
      window.localStorage.setItem('lombicor-admin-unlocked', 'true')
      window.location.replace('/admin')
      return
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="shell center-wrap">
      <div className="hero-card pin-card stack">
        <div>
          <div className="brand-kicker">Admin access</div>
          <h1>Enter the admin PIN</h1>
          <p className="muted">No Google login is needed here. Enter the PIN to open the admin dashboard.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">PIN code</label>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter PIN"
            />
          </div>
          {error && <div className="field-error">{error}</div>}
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Checking…' : 'Open admin'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/')}>Back to form</button>
          </div>
        </form>
      </div>
    </div>
  )
}
