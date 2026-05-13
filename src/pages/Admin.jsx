import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApplicant, getOptions, listApplicants, updateApplicant } from '../lib/api'

export default function Admin() {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [options, setOptions] = useState({ placements: [], statuses: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [status, setStatus] = useState('new')
  const [placement, setPlacement] = useState('')

  async function loadApplicants() {
    setLoading(true)
    setError('')
    try {
      const [list, fetchedOptions] = await Promise.all([listApplicants(), getOptions()])
      setApplicants(list)
      setOptions(fetchedOptions)
      const first = list[0]
      if (first) {
        setSelectedId(first.id)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplicants()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    getApplicant(selectedId)
      .then((applicant) => {
        setSelectedApplicant(applicant)
        setAdminNotes(applicant.admin_notes || '')
        setStatus(applicant.status || 'new')
        setPlacement(applicant.placement_site || '')
      })
      .catch((requestError) => setError(requestError.message))
  }, [selectedId])

  const stats = useMemo(() => {
    const counts = { total: applicants.length, new: 0, shortlisted: 0, placed: 0 }
    applicants.forEach((applicant) => {
      if (applicant.status === 'new') counts.new += 1
      if (applicant.status === 'shortlisted') counts.shortlisted += 1
      if (applicant.status === 'placed') counts.placed += 1
    })
    return counts
  }, [applicants])

  async function handleSave() {
    if (!selectedApplicant) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateApplicant(selectedApplicant.id, {
        status,
        placement_site: placement || null,
        admin_notes: adminNotes,
      })
      setSelectedApplicant(updated)
      setApplicants((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    window.localStorage.removeItem('lombicor-admin-unlocked')
    navigate('/admin-login', { replace: true })
  }

  return (
    <div className="shell">
      <div className="container">
        <div className="header">
          <div>
            <div className="brand-kicker">Lombicor Admin</div>
            <h1>Applications dashboard</h1>
            <p className="muted">Review submissions, inspect saved skills, and update placement decisions.</p>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" type="button" onClick={loadApplicants}>Refresh</button>
            <button className="btn btn-ghost" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {error && (
          <div className="notice" style={{ marginBottom: '1rem' }}>
            <strong>Admin notice</strong>
            <p className="muted" style={{ marginBottom: 0 }}>{error}</p>
          </div>
        )}

        <div className="stats" style={{ marginBottom: '1rem' }}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="New" value={stats.new} />
          <StatCard label="Shortlisted" value={stats.shortlisted} />
          <StatCard label="Placed" value={stats.placed} />
        </div>

        <div className="columns" style={{ paddingBottom: '2rem' }}>
          <div className="panel list-panel">
            <h2>Applicants</h2>
            {loading && <p className="muted">Loading applications…</p>}
            {!loading && applicants.length === 0 && <p className="muted">No applications saved yet.</p>}
            {applicants.map((applicant) => (
              <button
                key={applicant.id}
                className={`list-item ${selectedId === applicant.id ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedId(applicant.id)}
              >
                <strong>{applicant.first_name} {applicant.surname}</strong>
                <div className="muted small">{applicant.ref_id}</div>
                <div className="status-row" style={{ marginTop: '0.7rem' }}>
                  <span className="status-badge active">{applicant.status || 'new'}</span>
                  <span className="tag">{renderArea(applicant)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="panel stack">
            {!selectedApplicant && <p className="muted">Pick an applicant to inspect the full form.</p>}
            {selectedApplicant && (
              <>
                <div className="grid two">
                  <SummaryPanel title="Applicant details">
                    <DetailRow label="Name" value={`${selectedApplicant.first_name} ${selectedApplicant.surname}`} />
                    <DetailRow label="Email" value={selectedApplicant.email || 'Not provided'} />
                    <DetailRow label="Phone" value={selectedApplicant.contact_number} />
                    <DetailRow label="SA ID" value={selectedApplicant.id_number} />
                    <DetailRow label="Gender" value={selectedApplicant.gender} />
                    <DetailRow label="Race" value={selectedApplicant.race} />
                    <DetailRow label="Area" value={renderArea(selectedApplicant)} />
                    <DetailRow label="Address notes" value={selectedApplicant.address_notes || 'None'} />
                  </SummaryPanel>

                  <SummaryPanel title="Work profile">
                    <DetailRow label="Skills" value={renderSkills(selectedApplicant)} />
                    <DetailRow label="Preferred shift" value={selectedApplicant.work_shift || 'No preference'} />
                    <DetailRow label="Packhouse experience" value={selectedApplicant.packhouse_experience ? 'Yes' : 'No'} />
                    <DetailRow label="Forklift licence" value={selectedApplicant.forklift_licence ? 'Yes' : 'No'} />
                    <DetailRow label="Current status" value={selectedApplicant.status || 'new'} />
                    <DetailRow label="Placement" value={selectedApplicant.placement_site || 'Not placed'} />
                  </SummaryPanel>
                </div>

                <SummaryPanel title="Uploaded documents">
                  <div className="documents">
                    <DocumentLink label="ID Copy" value={selectedApplicant.id_copy_url} />
                    <DocumentLink label="SARS Proof" value={selectedApplicant.proof_sars_url} />
                    <DocumentLink label="Bank Statement" value={selectedApplicant.proof_bank_url} />
                    <DocumentLink label="Payslip" value={selectedApplicant.payslip_url} />
                    <DocumentLink label="Forklift Licence" value={selectedApplicant.forklift_doc_url} />
                  </div>
                </SummaryPanel>

                <SummaryPanel title="Admin decision">
                  <div className="grid two">
                    <div>
                      <label className="form-label">Status</label>
                      <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        {(options.statuses || ['new', 'reviewed', 'shortlisted', 'placed', 'rejected']).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Placement site</label>
                      <select value={placement} onChange={(event) => setPlacement(event.target.value)}>
                        <option value="">Select placement</option>
                        {(options.placements || []).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Admin notes</label>
                    <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
                  </div>
                  <div className="actions">
                    <button className="btn btn-primary" type="button" disabled={saving} onClick={handleSave}>
                      {saving ? 'Saving…' : 'Save decision'}
                    </button>
                  </div>
                </SummaryPanel>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="muted small">{label}</div>
      <strong>{value}</strong>
    </div>
  )
}

function SummaryPanel({ title, children }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="stack">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div className="muted small">{label}</div>
      <div>{value}</div>
    </div>
  )
}

function DocumentLink({ label, value }) {
  return <div>{label}: {value ? <a href={value} target="_blank" rel="noreferrer">Open file</a> : <span className="muted">Not uploaded</span>}</div>
}

function renderArea(applicant) {
  return applicant.area === 'Other' ? applicant.area_other || 'Other' : applicant.area || 'Unknown'
}

function renderSkills(applicant) {
  const skills = Array.isArray(applicant.skills) ? applicant.skills : []
  const filled = applicant.skills_other ? [...skills.filter((item) => item !== 'Other'), applicant.skills_other] : skills
  return filled.length ? filled.join(', ') : 'None saved'
}
