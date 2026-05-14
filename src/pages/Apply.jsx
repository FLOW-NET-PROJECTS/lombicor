import { useEffect, useMemo, useState } from 'react'
import { getOptions, submitApplication, uploadDocument } from '../lib/api'

const STEPS = ['Personal', 'Work', 'Documents', 'Review']
const STEP_DETAILS = [
  {
    eyebrow: 'Step 1 of 4',
    title: 'Personal details',
    description: 'Share your identity, contact details, and area so the team can review your application correctly.',
    caption: 'Identity and contact',
  },
  {
    eyebrow: 'Step 2 of 4',
    title: 'Work profile',
    description: 'Select the work categories you fit best and add any experience that helps with placement.',
    caption: 'Skills and readiness',
  },
  {
    eyebrow: 'Step 3 of 4',
    title: 'Documents',
    description: 'Upload the files the team may need during screening so your application is easier to process.',
    caption: 'Files and proof',
  },
  {
    eyebrow: 'Step 4 of 4',
    title: 'Review and submit',
    description: 'Check the key details one last time, then submit your application and save your reference ticket.',
    caption: 'Final check',
  },
]

const initialForm = {
  first_name: '',
  surname: '',
  email: '',
  id_number: '',
  contact_number: '',
  gender: '',
  race: '',
  area: '',
  area_other: '',
  address_notes: '',
  skills: [],
  skills_other: '',
  packhouse_experience: false,
  forklift_licence: false,
  work_shift: '',
  id_copy_url: '',
  proof_sars_url: '',
  proof_bank_url: '',
  payslip_url: '',
  forklift_doc_url: '',
}

const documentFields = [
  ['id_copy_url', 'ID Copy'],
  ['proof_sars_url', 'SARS Proof'],
  ['proof_bank_url', 'Bank Statement'],
  ['payslip_url', 'Payslip'],
  ['forklift_doc_url', 'Forklift Licence'],
]

export default function Apply() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [options, setOptions] = useState({ areas: [], skills: [] })
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    getOptions()
      .then((data) => setOptions(data))
      .catch(() => {
        setOptions({
          areas: ['Uitenhage', 'Kirkwood', 'Addo', 'Other'],
          skills: ['Packer', 'Sorter', 'Pre Sorter', 'Palletizer', 'Strapper', 'General Worker/Cleaner', 'Forklift Driver', 'Other'],
        })
      })
  }, [])

  useEffect(() => {
    if (!result) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [result])

  const stepMeta = useMemo(() => STEP_DETAILS[step], [step])
  const progressValue = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])
  const uploadedCount = useMemo(
    () => documentFields.filter(([field]) => Boolean(form[field])).length,
    [form],
  )
  const stepAsideItems = useMemo(() => {
    if (step === 0) {
      return [
        {
          label: 'Identity check',
          value: 'Use your legal names, current cellphone number, and one unique SA ID.',
        },
        {
          label: 'Area selected',
          value: form.area === 'Other' ? form.area_other || 'Other' : form.area || 'Choose your area',
        },
      ]
    }

    if (step === 1) {
      const experience = [form.packhouse_experience && 'Packhouse', form.forklift_licence && 'Forklift']
        .filter(Boolean)
        .join(' + ')

      return [
        {
          label: 'Skills chosen',
          value: form.skills.length ? `${form.skills.length} selected` : 'Select at least one role',
        },
        {
          label: 'Experience flags',
          value: experience || 'No extra experience selected yet',
        },
      ]
    }

    if (step === 2) {
      return [
        {
          label: 'Upload status',
          value: `${uploadedCount} of ${documentFields.length} files uploaded`,
        },
        {
          label: 'Accepted files',
          value: 'PDF, JPG, or PNG up to 5MB per document',
        },
      ]
    }

    return [
      {
        label: 'Applicant',
        value: `${form.first_name} ${form.surname}`.trim() || 'Finish your details before sending',
      },
      {
        label: 'Duplicate rule',
        value: 'Submitting blocks another application with the same SA ID.',
      },
    ]
  }, [form, step, uploadedCount])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function toggleSkill(skill) {
    setForm((current) => {
      const hasSkill = current.skills.includes(skill)
      return {
        ...current,
        skills: hasSkill
          ? current.skills.filter((item) => item !== skill)
          : [...current.skills, skill],
      }
    })
    setErrors((current) => ({ ...current, skills: '' }))
  }

  function validateCurrentStep() {
    const nextErrors = {}

    if (step === 0) {
      if (!form.first_name.trim()) nextErrors.first_name = 'First name is required.'
      if (!form.surname.trim()) nextErrors.surname = 'Surname is required.'
      if (!/^\d{13}$/.test(form.id_number.replace(/\D/g, ''))) nextErrors.id_number = 'Enter a valid 13-digit SA ID number.'
      if (!/^0\d{9}$/.test(form.contact_number.replace(/\D/g, ''))) nextErrors.contact_number = 'Enter a valid 10-digit cellphone number.'
      if (!form.gender) nextErrors.gender = 'Select a gender.'
      if (!form.race) nextErrors.race = 'Select a race.'
      if (!form.area) nextErrors.area = 'Select an area.'
      if (form.area === 'Other' && !form.area_other.trim()) nextErrors.area_other = 'Fill in the other area.'
    }

    if (step === 1) {
      if (form.skills.length === 0) nextErrors.skills = 'Select at least one skill.'
      if (form.skills.includes('Other') && !form.skills_other.trim()) nextErrors.skills_other = 'Add the other skill.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleUpload(field, file) {
    setApiError('')
    setUploading((current) => ({ ...current, [field]: true }))
    try {
      const response = await uploadDocument(file)
      updateField(field, response.file_url)
    } catch (error) {
      setApiError(error.message)
    } finally {
      setUploading((current) => ({ ...current, [field]: false }))
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setApiError('')
    try {
      const response = await submitApplication(form)
      setResult(response)
      setForm(initialForm)
      setStep(0)
    } catch (error) {
      if (error.status === 409 && error.data?.code === 'DUPLICATE_ID_NUMBER') {
        setErrors({ id_number: 'This SA ID already has an application on the system.' })
        setStep(0)
      }
      setApiError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  function nextStep() {
    if (!validateCurrentStep()) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0))
  }

  function resetApplicationFlow() {
    setResult(null)
    setApiError('')
    setErrors({})
    setUploading({})
  }

  if (result) {
    const applicantName = `${result.first_name || ''} ${result.surname || ''}`.trim()
    const submittedOn = result.created_at
      ? new Date(result.created_at).toLocaleString('en-ZA', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Saved successfully'

    return (
      <div className="shell apply-shell">
        <div className="container apply-page">
          <div className="apply-header apply-confirmation-header">
            <div>
              <div className="brand-kicker">Lombicor Recruitment</div>
              <h1>Application submitted</h1>
              <p className="muted">Your application is on the system. Keep the reference ticket below for any follow-up.</p>
            </div>
          </div>

          <div className="confirmation-screen">
            <div className="hero-card confirmation-card stack">
              <div>
                <div className="brand-kicker">Final confirmation</div>
                <h2 className="confirmation-title">Reference ticket saved</h2>
                <p className="muted confirmation-copy">
                  This reference number is the main proof that your submission was received.
                </p>
              </div>

              <div className="reference-ticket">
                <div className="muted small">Reference number</div>
                <div className="reference-code">{result.ref_id}</div>
                <p className="reference-help">
                  Quote this number when contacting Lombicor about your application.
                </p>
              </div>

              <div className="grid three confirmation-meta">
                <SummaryCard label="Applicant" value={applicantName || 'Application received'} />
                <SummaryCard label="Current status" value={result.status || 'new'} />
                <SummaryCard label="Submitted" value={submittedOn} />
              </div>

              <div className="notice success confirmation-notice">
                <strong>What happens next?</strong>
                <p className="muted" style={{ marginBottom: 0 }}>
                  The admin team can now review your details, documents, and placement readiness using this reference ticket.
                </p>
              </div>

              <div className="actions">
                <button className="btn btn-primary" type="button" onClick={resetApplicationFlow}>
                  Submit another application
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shell apply-shell">
      <div className="container apply-page">
        <div className="apply-header">
          <section className="hero-card apply-hero">
            <div className="apply-hero-grid">
              <div className="apply-hero-copy">
                <div className="brand-kicker">Lombicor Recruitment</div>
                <h1>Apply for seasonal work</h1>
                <p className="apply-lead muted">Complete the form, upload your documents, and keep your SA ID unique on the system.</p>
                <div className="apply-hero-badges">
                  <span className="hero-badge">4 guided steps</span>
                  <span className="hero-badge">Reference ticket on submit</span>
                  <span className="hero-badge">Document upload ready</span>
                </div>
              </div>

              <div className="apply-side-card">
                <div className="brand-kicker">Before you begin</div>
                <div className="apply-side-list">
                  <div className="apply-side-item">
                    <strong>Keep your details exact.</strong>
                    <div className="muted small">The review team uses this information for screening and placement.</div>
                  </div>
                  <div className="apply-side-item">
                    <strong>Prepare your documents.</strong>
                    <div className="muted small">Have PDFs or images ready so uploads take less time.</div>
                  </div>
                  <div className="apply-side-item">
                    <strong>Use one SA ID only.</strong>
                    <div className="muted small">Duplicate applications for the same SA ID are blocked after submission.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="hero-card apply-progress-card stack">
          <div className="progress-top">
            <div>
              <div className="brand-kicker">{stepMeta.eyebrow}</div>
              <h2>{stepMeta.title}</h2>
              <p className="muted apply-step-copy">{stepMeta.description}</p>
            </div>

            <div className="progress-meter">
              <div className="progress-meter-top">
                <span className="muted small">Application progress</span>
                <strong>{progressValue}%</strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span className="progress-value" style={{ width: `${progressValue}%` }} />
              </div>
            </div>
          </div>

          <div className="apply-stepper">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`apply-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`.trim()}
              >
                <span className="apply-step-number">{index + 1}</span>
                <div className="apply-step-body">
                  <strong>{label}</strong>
                  <span className="muted small">{STEP_DETAILS[index].caption}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {apiError && (
          <div className="notice apply-notice">
            <strong>Something needs attention.</strong>
            <p className="muted" style={{ marginBottom: 0 }}>{apiError}</p>
          </div>
        )}

        <div className="panel stack apply-form-panel">
          <div className="apply-section-head">
            <div>
              <div className="brand-kicker">{stepMeta.eyebrow}</div>
              <h2 className="apply-section-title">{stepMeta.title}</h2>
              <p className="muted apply-section-copy">{stepMeta.description}</p>
            </div>

            <div className="section-rail-card">
              <div className="brand-kicker">Application pulse</div>
              <div className="stack">
                {stepAsideItems.map((item) => (
                  <div key={item.label} className="apply-aside-row">
                    <div className="muted small">{item.label}</div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {step === 0 && (
            <div className="grid two form-grid">
              <Field label="First name" error={errors.first_name}>
                <input value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} />
              </Field>
              <Field label="Surname" error={errors.surname}>
                <input value={form.surname} onChange={(event) => updateField('surname', event.target.value)} />
              </Field>
              <Field label="Email (optional)" error={errors.email}>
                <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
              </Field>
              <Field label="Contact number" error={errors.contact_number}>
                <input value={form.contact_number} onChange={(event) => updateField('contact_number', event.target.value)} placeholder="0821234567" />
              </Field>
              <Field label="SA ID number" error={errors.id_number}>
                <input value={form.id_number} onChange={(event) => updateField('id_number', event.target.value)} placeholder="13 digits" />
              </Field>
              <Field label="Gender" error={errors.gender}>
                <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Race" error={errors.race}>
                <select value={form.race} onChange={(event) => updateField('race', event.target.value)}>
                  <option value="">Select</option>
                  <option value="African">African</option>
                  <option value="Coloured">Coloured</option>
                  <option value="Indian">Indian</option>
                  <option value="White">White</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Area" error={errors.area}>
                <select value={form.area} onChange={(event) => updateField('area', event.target.value)}>
                  <option value="">Select area</option>
                  {options.areas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </Field>
              {form.area === 'Other' && (
                <Field label="Other area" error={errors.area_other}>
                  <input value={form.area_other} onChange={(event) => updateField('area_other', event.target.value)} />
                </Field>
              )}
              <Field label="Address notes (optional)" error={errors.address_notes} className="field-span-full">
                <textarea value={form.address_notes} onChange={(event) => updateField('address_notes', event.target.value)} placeholder="Street, section, landmark, or pickup note" />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <div>
                <label className="form-label">Skills / role choice</label>
                <div className="grid two">
                  {options.skills.map((skill) => (
                    <label key={skill} className={`checkbox-card ${form.skills.includes(skill) ? 'checked' : ''}`.trim()}>
                      <input
                        type="checkbox"
                        checked={form.skills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                      />
                      <div>
                        <strong>{skill}</strong>
                        <div className="muted small">This selection is saved and visible in admin.</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.skills && <div className="field-error">{errors.skills}</div>}
              </div>

              {form.skills.includes('Other') && (
                <Field label="Other skill" error={errors.skills_other}>
                  <input value={form.skills_other} onChange={(event) => updateField('skills_other', event.target.value)} />
                </Field>
              )}

              <div className="grid two">
                <label className={`checkbox-card ${form.packhouse_experience ? 'checked' : ''}`.trim()}>
                  <input
                    type="checkbox"
                    checked={form.packhouse_experience}
                    onChange={(event) => updateField('packhouse_experience', event.target.checked)}
                  />
                  <div>
                    <strong>Packhouse experience</strong>
                    <div className="muted small">Tick this if you have worked in a packhouse before.</div>
                  </div>
                </label>
                <label className={`checkbox-card ${form.forklift_licence ? 'checked' : ''}`.trim()}>
                  <input
                    type="checkbox"
                    checked={form.forklift_licence}
                    onChange={(event) => updateField('forklift_licence', event.target.checked)}
                  />
                  <div>
                    <strong>Forklift licence</strong>
                    <div className="muted small">Tick this if you hold a valid forklift licence.</div>
                  </div>
                </label>
              </div>

              <Field label="Preferred shift (optional)">
                <select value={form.work_shift} onChange={(event) => updateField('work_shift', event.target.value)}>
                  <option value="">No preference</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                  <option value="Either">Either</option>
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid two">
              {documentFields.map(([field, label]) => (
                <div key={field} className={`upload-box stack ${form[field] ? 'uploaded' : ''}`.trim()}>
                  <div className="upload-header">
                    <div>
                      <strong>{label}</strong>
                      <div className="muted small">PDF, JPG, or PNG up to 5MB.</div>
                    </div>
                    <span className={`upload-status ${form[field] ? 'ready' : ''}`.trim()}>
                      {form[field] ? 'Uploaded' : 'Not uploaded'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) handleUpload(field, file)
                    }}
                  />
                  {uploading[field] && <div className="muted small">Uploading...</div>}
                  {form[field] && <a className="upload-link" href={form[field]} target="_blank" rel="noreferrer">View uploaded file</a>}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <div className="grid two apply-review-grid">
                <SummaryCard label="Applicant" value={`${form.first_name} ${form.surname}`.trim() || 'Not filled'} />
                <SummaryCard label="SA ID" value={form.id_number || 'Not filled'} />
                <SummaryCard label="Area" value={form.area === 'Other' ? form.area_other || 'Other' : form.area || 'Not filled'} />
                <SummaryCard label="Skills" value={form.skills.length ? form.skills.join(', ') : 'Not filled'} />
              </div>
              <div className="notice">
                <strong>Ready to send?</strong>
                <p className="muted" style={{ marginBottom: 0 }}>Submitting this will block duplicate applications for the same SA ID number.</p>
              </div>
            </div>
          )}

          <div className="actions apply-actions">
            {step > 0 && <button className="btn btn-secondary" type="button" onClick={previousStep}>Back</button>}
            {step < STEPS.length - 1 && <button className="btn btn-primary" type="button" onClick={nextStep}>Next</button>}
            {step === STEPS.length - 1 && (
              <button className="btn btn-primary" type="button" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting...' : 'Submit application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={`form-card ${className}`.trim()}>
      <label className="form-label">{label}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="panel summary-card">
      <div className="muted small">{label}</div>
      <strong>{value}</strong>
    </div>
  )
}
