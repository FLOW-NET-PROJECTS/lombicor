import { useEffect, useMemo, useState } from 'react'
import { getOptions, listApplicants, updateApplicant } from '../lib/api'

const DEFAULT_OPTIONS = {
  placements: [],
  statuses: ['new', 'reviewed', 'shortlisted', 'placed', 'rejected'],
  areas: ['Uitenhage', 'Kirkwood', 'Addo', 'Other'],
}

export default function Admin() {
  const [applicants, setApplicants] = useState([])
  const [expandedId, setExpandedId] = useState('')
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

  function syncExpandedDrafts(applicant) {
    setAdminNotes(applicant?.admin_notes || '')
    setStatus(applicant?.status || 'new')
    setPlacement(applicant?.placement_site || '')
  }

  function closeExpandedApplicant() {
    setExpandedId('')
    setAdminNotes('')
    setStatus('new')
    setPlacement('')
  }

  async function loadApplicants() {
    setLoading(true)
    setError('')
    try {
      const [list, fetchedOptions] = await Promise.all([listApplicants(), getOptions()])
      setApplicants(list)
      setOptions({ ...DEFAULT_OPTIONS, ...fetchedOptions })

      if (expandedId) {
        const refreshedApplicant = list.find((item) => item.id === expandedId)
        if (refreshedApplicant) {
          syncExpandedDrafts(refreshedApplicant)
        } else {
          closeExpandedApplicant()
        }
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
    if (loading || !expandedId) return

    const stillVisible = filteredApplicants.some((applicant) => applicant.id === expandedId)
    if (!stillVisible) {
      closeExpandedApplicant()
    }
  }, [expandedId, filteredApplicants, loading])

  const expandedApplicant = useMemo(
    () => applicants.find((applicant) => applicant.id === expandedId) || null,
    [applicants, expandedId],
  )

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
    if (!expandedApplicant) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateApplicant(expandedApplicant.id, {
        status,
        placement_site: placement || null,
        admin_notes: adminNotes,
      })
      setApplicants((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      syncExpandedDrafts(updated)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function handleToggleApplicant(applicant) {
    if (expandedId === applicant.id) {
      closeExpandedApplicant()
      return
    }

    setExpandedId(applicant.id)
    syncExpandedDrafts(applicant)
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

        <div className="panel list-panel admin-list-panel admin-accordion-panel" style={{ paddingBottom: '2rem' }}>
          <div className="admin-list-header">
            <div>
              <h2 style={{ marginBottom: '0.2rem' }}>Applicants</h2>
              <p className="muted small" style={{ marginBottom: 0 }}>Expand an applicant to view the full form, documents, and admin controls.</p>
            </div>
          </div>

          {loading && <p className="muted">Loading applications...</p>}
          {!loading && applicants.length === 0 && <p className="muted">No applications saved yet.</p>}
          {!loading && applicants.length > 0 && filteredApplicants.length === 0 && <p className="muted">No applications match the current filters.</p>}

          {!loading && filteredApplicants.length > 0 && (
            <div className="admin-accordion-list">
              {filteredApplicants.map((applicant) => {
                const applicantSkills = renderSkills(applicant)
                const hasPlacement = Boolean(applicant.placement_site)
                const isExpanded = expandedId === applicant.id
                const detailApplicant = isExpanded && expandedApplicant?.id === applicant.id
                  ? expandedApplicant
                  : applicant

                return (
                  <article key={applicant.id} className={`list-item admin-applicant-card ${isExpanded ? 'active' : ''}`}>
                    <button
                      className="admin-accordion-trigger"
                      type="button"
                      onClick={() => handleToggleApplicant(applicant)}
                      aria-expanded={isExpanded}
                    >
                      <div className="admin-accordion-main">
                        <div className="list-item-header">
                          <strong>{applicant.first_name} {applicant.surname}</strong>
                          <span className={`status-badge ${isExpanded ? 'active' : ''}`}>{applicant.status || 'new'}</span>
                        </div>
                        <div className="admin-accordion-meta">
                          <span className="admin-meta-pill">Ref {applicant.ref_id}</span>
                          <span className="admin-meta-pill">{renderArea(applicant)}</span>
                          <span className={`admin-meta-pill ${hasPlacement ? 'highlight' : ''}`}>{hasPlacement ? 'Placed' : 'Not placed'}</span>
                        </div>
                        <div className="list-meta">{truncateText(applicantSkills, 72)}</div>
                      </div>

                      <div className="admin-accordion-side">
                        {hasPlacement && <span className="tag active">{applicant.placement_site}</span>}
                        {applicant.packhouse_experience && <span className="tag">Packhouse</span>}
                        {applicant.forklift_licence && <span className="tag">Forklift</span>}
                        <span className="accordion-toggle-label">{isExpanded ? 'Hide details' : 'Open details'}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="admin-accordion-content stack">
                        <div className="admin-hero">
                          <div className="admin-hero-top">
                            <div>
                              <div className="brand-kicker">Expanded applicant</div>
                              <h2 style={{ marginBottom: '0.25rem' }}>{detailApplicant.first_name} {detailApplicant.surname}</h2>
                              <p className="muted" style={{ marginBottom: 0 }}>
                                Reference {detailApplicant.ref_id} | {detailApplicant.contact_number}
                              </p>
                            </div>
                            <div className="status-row">
                              <span className="status-badge active">{detailApplicant.status || 'new'}</span>
                              <span className="tag">{renderArea(detailApplicant)}</span>
                              <span className="tag">{detailApplicant.placement_site || 'Unplaced'}</span>
                            </div>
                          </div>
                          <div className="summary-strip">
                            <MiniStat label="SA ID" value={detailApplicant.id_number} />
                            <MiniStat label="Shift" value={detailApplicant.work_shift || 'No preference'} />
                            <MiniStat label="Skills" value={truncateText(renderSkills(detailApplicant), 34)} />
                          </div>
                        </div>

                        <div className="detail-grid admin-detail-grid">
                          <SummaryPanel title="Applicant details">
                            <DetailRow label="Name" value={`${detailApplicant.first_name} ${detailApplicant.surname}`} />
                            <DetailRow label="Email" value={detailApplicant.email || 'Not provided'} />
                            <DetailRow label="Phone" value={detailApplicant.contact_number} />
                            <DetailRow label="SA ID" value={detailApplicant.id_number} />
                            <DetailRow label="Gender" value={detailApplicant.gender} />
                            <DetailRow label="Race" value={detailApplicant.race} />
                            <DetailRow label="Area" value={renderArea(detailApplicant)} />
                            <DetailRow label="Address notes" value={detailApplicant.address_notes || 'None'} />
                          </SummaryPanel>

                          <SummaryPanel title="Work profile">
                            <DetailRow label="Skills" value={renderSkills(detailApplicant)} />
                            <DetailRow label="Preferred shift" value={detailApplicant.work_shift || 'No preference'} />
                            <DetailRow label="Packhouse experience" value={detailApplicant.packhouse_experience ? 'Yes' : 'No'} />
                            <DetailRow label="Forklift licence" value={detailApplicant.forklift_licence ? 'Yes' : 'No'} />
                            <DetailRow label="Current status" value={detailApplicant.status || 'new'} />
                            <DetailRow label="Placement" value={detailApplicant.placement_site || 'Not placed'} />
                          </SummaryPanel>
                        </div>

                        <SummaryPanel title="Uploaded documents">
                          <div className="documents document-grid">
                            <DocumentLink label="ID Copy" value={detailApplicant.id_copy_url} />
                            <DocumentLink label="SARS Proof" value={detailApplicant.proof_sars_url} />
                            <DocumentLink label="Bank Statement" value={detailApplicant.proof_bank_url} />
                            <DocumentLink label="Payslip" value={detailApplicant.payslip_url} />
                            <DocumentLink label="Forklift Licence" value={detailApplicant.forklift_doc_url} />
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
                              {saving ? 'Saving...' : 'Save decision'}
                            </button>
                          </div>
                        </SummaryPanel>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
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
  return `${value.slice(0, maxLength - 3)}...`
}
