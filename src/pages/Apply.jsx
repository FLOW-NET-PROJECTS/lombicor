import { useEffect, useMemo, useState } from 'react'
import { getOptions, submitApplication, uploadDocument } from '../lib/api'

const STEPS = ['Personal', 'Work', 'Documents', 'Review']

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
          skills: ['Packer', 'Picker', 'Forklift Driver', 'General Worker', 'Quality Checker', 'Other'],
        })
      })
  }, [])

  useEffect(() => {
    if (!result) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [result])

  const stepTitle = useMemo(() => STEPS[step], [step])

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
      <div className="shell">
        <div className="container">
          <div className="header">
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
    <div className="shell">
      <div className="container">
        <div className="header">
          <div>
            <div className="brand-kicker">Lombicor Recruitment</div>
            <h1>Apply for seasonal work</h1>
            <p className="muted">Complete the form, upload your documents, and keep your SA ID unique on the system.</p>
          </div>
        </div>

        <div className="hero-card stack" style={{ marginBottom: '1rem' }}>
          <div className="step-row">
            {STEPS.map((label, index) => (
              <span key={label} className={`step-pill ${index === step ? 'active' : ''}`}>
                {index + 1}. {label}
              </span>
            ))}
          </div>
          <div>
            <h2 style={{ marginBottom: '0.35rem' }}>{stepTitle}</h2>
            <p className="muted small">Fill in each section carefully. The admin team will use these details for review and placement.</p>
          </div>
        </div>

        {apiError && (
          <div className="notice" style={{ marginBottom: '1rem' }}>
            <strong>Something needs attention.</strong>
            <p className="muted" style={{ marginBottom: 0 }}>{apiError}</p>
          </div>
        )}

        <div className="panel stack" style={{ marginBottom: '2rem' }}>
          {step === 0 && (
            <div className="grid two">
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
              <Field label="Address notes (optional)" error={errors.address_notes}>
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
                    <label key={skill} className="checkbox-card">
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
                <label className="checkbox-card">
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
                <label className="checkbox-card">
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
                <div key={field} className="upload-box stack">
                  <div>
                    <strong>{label}</strong>
                    <div className="muted small">PDF, JPG, or PNG up to 5MB.</div>
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
                  {form[field] && <a href={form[field]} target="_blank" rel="noreferrer">View uploaded file</a>}
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <div className="grid two">
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

          <div className="actions">
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

function Field({ label, error, children }) {
  return (
    <div className="form-card">
      <label className="form-label">{label}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="panel">
      <div className="muted small">{label}</div>
      <strong>{value}</strong>
    </div>
  )
}
