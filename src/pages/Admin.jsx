import { useEffect, useMemo, useState } from 'react'
import { getApplicant, getOptions, listApplicants, updateApplicant } from '../lib/api'

const DEFAULT_OPTIONS = {
  placements: [],
  statuses: ['new', 'reviewed', 'shortlisted', 'placed', 'rejected'],
  areas: ['Uitenhage', 'Kirkwood', 'Addo', 'Other'],
}

export default function Admin() {
  const [applicants, setApplicants] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [status, setStatus] = useState('new')
  const [placement, setPlacement] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [placementFilter, setPlacementFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  async function loadApplicants() {
    setLoading(true)
    setError('')
    try {
      const [list, fetchedOptions] = await Promise.all([listApplicants(), getOptions()])
      setApplicants(list)
      setOptions({ ...DEFAULT_OPTIONS, ...fetchedOptions })
      const first = list[0]
      if (first) {
        setSelectedId((current) => current || first.id)
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

  const filteredApplicants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const next = applicants.filter((applicant) => {
      const matchesQuery = !query || buildSearchText(applicant).includes(query)
      const matchesStatus = statusFilter === 'all' || (applicant.status || 'new') === statusFilter
      const matchesArea = areaFilter === 'all' || renderArea(applicant) === areaFilter
      const matchesPlacement = placementFilter === 'all' || (applicant.placement_site || 'Unplaced') === placementFilter
      return matchesQuery && matchesStatus && matchesArea && matchesPlacement
    })

    next.sort((left, right) => {
      if (sortBy === 'oldest') {
        return new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime()
      }
      if (sortBy === 'name-asc') {
        return `${left.first_name} ${left.surname}`.localeCompare(`${right.first_name} ${right.surname}`)
      }
      if (sortBy === 'status') {
        return `${left.status || 'new'} ${left.first_name}`.localeCompare(`${right.status || 'new'} ${right.first_name}`)
      }
      return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    })

    return next
  }, [applicants, searchQuery, statusFilter, areaFilter, placementFilter, sortBy])

  useEffect(() => {
    if (loading) return
    if (filteredApplicants.length === 0) {
      setSelectedId('')
      setSelectedApplicant(null)
      return
    }

    const stillVisible = filteredApplicants.some((applicant) => applicant.id === selectedId)
    if (!stillVisible) {
      setSelectedId(filteredApplicants[0].id)
    }
  }, [filteredApplicants, selectedId, loading])

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
    const counts = { total: applicants.length, filtered: filteredApplicants.length, new: 0, shortlisted: 0, placed: 0 }
    applicants.forEach((applicant) => {
      if (applicant.status === 'new') counts.new += 1
      if (applicant.status === 'shortlisted') counts.shortlisted += 1
      if (applicant.status === 'placed') counts.placed += 1
    })
    return counts
  }, [applicants, filteredApplicants.length])

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
    window.location.replace('/admin')
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setAreaFilter('all')
    setPlacementFilter('all')
    setSortBy('newest')
  }

  const selectedListApplicant = filteredApplicants.find((applicant) => applicant.id === selectedId) || selectedApplicant

  return (
    <div className="shell admin-shell">
      <div className="container">
        <div className="header">
          <div>
            <div className="brand-kicker">Lombicor Admin</div>
            <h1>Applications dashboard</h1>
            <p className="muted">Search faster, review cleaner, and make placement decisions with less digging.</p>
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
          <StatCard label="Showing" value={stats.filtered} />
          <StatCard label="New" value={stats.new} />
          <StatCard label="Placed" value={stats.placed} />
        </div>

        <div className="panel admin-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="admin-toolbar-grid">
            <div className="admin-search-block">
              <label className="form-label">Search applications</label>
              <input
                className="admin-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, SA ID, phone, ref, area, skill, status, placement"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                {options.statuses.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Area</label>
              <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
                <option value="all">All areas</option>
                {options.areas.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Placement</label>
              <select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)}>
                <option value="all">All placement states</option>
                <option value="Unplaced">Unplaced</option>
                {options.placements.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Sort</label>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          <div className="admin-toolbar-footer">
            <div className="status-row admin-filter-summary">
              <span className="tag active">{stats.filtered} match{stats.filtered === 1 ? '' : 'es'}</span>
              <span className="tag">{filteredApplicants.filter((item) => item.status === 'shortlisted').length} shortlisted</span>
              <span className="tag">{filteredApplicants.filter((item) => item.placement_site).length} placed</span>
            </div>
            <div className="admin-quick-filters">
              <button className="tag tag-button" type="button" onClick={() => setStatusFilter('new')}>New</button>
              <button className="tag tag-button" type="button" onClick={() => setStatusFilter('shortlisted')}>Shortlisted</button>
              <button className="tag tag-button" type="button" onClick={() => setStatusFilter('placed')}>Placed</button>
              <button className="tag tag-button" type="button" onClick={() => setPlacementFilter('Unplaced')}>Unplaced</button>
              <button className="btn btn-ghost btn-small" type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          </div>
        </div>

        <div className="columns admin-columns" style={{ paddingBottom: '2rem' }}>
          <div className="panel list-panel admin-list-panel">
            <div className="admin-list-header">
              <div>
                <h2 style={{ marginBottom: '0.2rem' }}>Applicants</h2>
                <p className="muted small" style={{ marginBottom: 0 }}>Search by person, status, skill, location, or placement.</p>
              </div>
            </div>

            {loading && <p className="muted">Loading applications…</p>}
            {!loading && applicants.length === 0 && <p className="muted">No applications saved yet.</p>}
            {!loading && applicants.length > 0 && filteredApplicants.length === 0 && <p className="muted">No applications match the current filters.</p>}

            {filteredApplicants.map((applicant) => {
              const applicantSkills = renderSkills(applicant)
              const applicantPlacement = applicant.placement_site || 'Unplaced'
              const isActive = selectedId === applicant.id

              return (
                <button
                  key={applicant.id}
                  className={`list-item admin-list-item ${isActive ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedId(applicant.id)}
                >
                  <div className="list-item-header">
                    <strong>{applicant.first_name} {applicant.surname}</strong>
                    <span className={`status-badge ${isActive ? 'active' : ''}`}>{applicant.status || 'new'}</span>
                  </div>
                  <div className="list-meta">{applicant.ref_id} · {applicant.contact_number}</div>
                  <div className="list-meta">{renderArea(applicant)} · {truncateText(applicantSkills, 46)}</div>
                  <div className="list-tag-row">
                    <span className="tag">{applicantPlacement}</span>
                    {applicant.packhouse_experience && <span className="tag">Packhouse</span>}
                    {applicant.forklift_licence && <span className="tag">Forklift</span>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="panel stack admin-detail-panel">
            {!selectedListApplicant && <p className="muted">Pick an applicant to inspect the full form.</p>}
            {selectedListApplicant && (
              <>
                <div className="admin-hero panel">
                  <div className="admin-hero-top">
                    <div>
                      <div className="brand-kicker">Selected applicant</div>
                      <h2 style={{ marginBottom: '0.25rem' }}>{selectedListApplicant.first_name} {selectedListApplicant.surname}</h2>
                      <p className="muted" style={{ marginBottom: 0 }}>{selectedListApplicant.ref_id} · {selectedListApplicant.contact_number}</p>
                    </div>
                    <div className="status-row">
                      <span className="status-badge active">{selectedListApplicant.status || 'new'}</span>
                      <span className="tag">{renderArea(selectedListApplicant)}</span>
                      <span className="tag">{selectedListApplicant.placement_site || 'Unplaced'}</span>
                    </div>
                  </div>
                  <div className="summary-strip">
                    <MiniStat label="SA ID" value={selectedListApplicant.id_number} />
                    <MiniStat label="Shift" value={selectedListApplicant.work_shift || 'No preference'} />
                    <MiniStat label="Skills" value={truncateText(renderSkills(selectedListApplicant), 34)} />
                  </div>
                </div>

                <div className="detail-grid admin-detail-grid">
                  <SummaryPanel title="Applicant details">
                    <DetailRow label="Name" value={`${selectedListApplicant.first_name} ${selectedListApplicant.surname}`} />
                    <DetailRow label="Email" value={selectedListApplicant.email || 'Not provided'} />
                    <DetailRow label="Phone" value={selectedListApplicant.contact_number} />
                    <DetailRow label="SA ID" value={selectedListApplicant.id_number} />
                    <DetailRow label="Gender" value={selectedListApplicant.gender} />
                    <DetailRow label="Race" value={selectedListApplicant.race} />
                    <DetailRow label="Area" value={renderArea(selectedListApplicant)} />
                    <DetailRow label="Address notes" value={selectedListApplicant.address_notes || 'None'} />
                  </SummaryPanel>

                  <SummaryPanel title="Work profile">
                    <DetailRow label="Skills" value={renderSkills(selectedListApplicant)} />
                    <DetailRow label="Preferred shift" value={selectedListApplicant.work_shift || 'No preference'} />
                    <DetailRow label="Packhouse experience" value={selectedListApplicant.packhouse_experience ? 'Yes' : 'No'} />
                    <DetailRow label="Forklift licence" value={selectedListApplicant.forklift_licence ? 'Yes' : 'No'} />
                    <DetailRow label="Current status" value={selectedListApplicant.status || 'new'} />
                    <DetailRow label="Placement" value={selectedListApplicant.placement_site || 'Not placed'} />
                  </SummaryPanel>
                </div>

                <SummaryPanel title="Uploaded documents">
                  <div className="documents document-grid">
                    <DocumentLink label="ID Copy" value={selectedListApplicant.id_copy_url} />
                    <DocumentLink label="SARS Proof" value={selectedListApplicant.proof_sars_url} />
                    <DocumentLink label="Bank Statement" value={selectedListApplicant.proof_bank_url} />
                    <DocumentLink label="Payslip" value={selectedListApplicant.payslip_url} />
                    <DocumentLink label="Forklift Licence" value={selectedListApplicant.forklift_doc_url} />
                  </div>
                </SummaryPanel>

                <SummaryPanel title="Admin decision">
                  <div className="grid two">
                    <div>
                      <label className="form-label">Status</label>
                      <select value={status} onChange={(event) => setStatus(event.target.value)}>
                        {options.statuses.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Placement site</label>
                      <select value={placement} onChange={(event) => setPlacement(event.target.value)}>
                        <option value="">Select placement</option>
                        {options.placements.map((option) => (
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

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <div className="muted small">{label}</div>
      <strong>{value}</strong>
    </div>
  )
}

function SummaryPanel({ title, children }) {
  return (
    <div className="panel summary-panel">
      <h3>{title}</h3>
      <div className="stack">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <div className="muted small">{label}</div>
      <div>{value}</div>
    </div>
  )
}

function DocumentLink({ label, value }) {
  return (
    <div className="document-card">
      <div className="muted small">{label}</div>
      {value ? <a href={value} target="_blank" rel="noreferrer">Open file</a> : <span className="muted">Not uploaded</span>}
    </div>
  )
}

function renderArea(applicant) {
  return applicant.area === 'Other' ? applicant.area_other || 'Other' : applicant.area || 'Unknown'
}

function renderSkills(applicant) {
  const skills = Array.isArray(applicant.skills) ? applicant.skills : []
  const filled = applicant.skills_other ? [...skills.filter((item) => item !== 'Other'), applicant.skills_other] : skills
  return filled.length ? filled.join(', ') : 'None saved'
}

function buildSearchText(applicant) {
  return [
    applicant.first_name,
    applicant.surname,
    applicant.id_number,
    applicant.contact_number,
    applicant.ref_id,
    applicant.area,
    applicant.area_other,
    applicant.status,
    applicant.placement_site,
    renderSkills(applicant),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function truncateText(value, maxLength) {
  if (!value || value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}
