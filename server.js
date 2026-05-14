import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const PORT = Number(process.env.PORT || 3000)
const ADMIN_PIN = process.env.ADMIN_PIN || '2026'
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim()
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'applicant-docs'

function isValidHttpUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const SUPABASE_CONFIG_ERROR = !SUPABASE_URL
  ? 'Supabase URL is missing.'
  : !isValidHttpUrl(SUPABASE_URL)
    ? 'Supabase URL must be a valid http or https URL.'
    : !SUPABASE_SERVICE_ROLE_KEY
      ? 'Supabase service role key is missing.'
      : ''

const HAS_SUPABASE = !SUPABASE_CONFIG_ERROR
const supabase = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

const AREA_OPTIONS = ['Uitenhage', 'Kirkwood', 'Addo', 'Other']
const STATUS_OPTIONS = ['new', 'reviewed', 'shortlisted', 'placed', 'rejected']
const PLACEMENT_OPTIONS = ['Unifrutti', 'Greenco Day', 'Greenco Night', 'Freshco', 'Golden Ridge']
const SKILL_OPTIONS = ['Packer', 'Sorter', 'Pre Sorter', 'Palletizer', 'Strapper', 'General Worker/Cleaner', 'Forklift Driver', 'Other']

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

function requireSupabase(res) {
  if (!supabase) {
    res.status(500).json({
      error: SUPABASE_CONFIG_ERROR || 'Supabase is not configured yet. Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.',
    })
    return false
  }
  return true
}

function normalizeIdNumber(idNumber = '') {
  return String(idNumber).replace(/\D/g, '').trim()
}

function normalizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '').trim()
}

function makeReferenceId() {
  return `APP-${Date.now().toString(36).toUpperCase()}`
}

function ensureArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function validateApplicantPayload(body) {
  const idNumber = normalizeIdNumber(body.id_number)
  const contactNumber = normalizePhone(body.contact_number)
  const area = body.area
  const areaOther = String(body.area_other || '').trim()
  const skills = ensureArray(body.skills)
    .map((item) => String(item).trim())
    .filter(Boolean)

  const errors = {}

  if (!String(body.first_name || '').trim()) errors.first_name = 'First name is required.'
  if (!String(body.surname || '').trim()) errors.surname = 'Surname is required.'
  if (!/^\d{13}$/.test(idNumber)) errors.id_number = 'A valid 13-digit SA ID number is required.'
  if (!/^0\d{9}$/.test(contactNumber)) errors.contact_number = 'A valid 10-digit SA phone number is required.'
  if (!String(body.gender || '').trim()) errors.gender = 'Gender is required.'
  if (!String(body.race || '').trim()) errors.race = 'Race is required.'
  if (!AREA_OPTIONS.includes(area)) errors.area = 'Please select a valid area.'
  if (area === 'Other' && !areaOther) errors.area_other = 'Please fill in the other area.'
  if (skills.length === 0) errors.skills = 'Select at least one skill.'

  return {
    errors,
    payload: {
      ref_id: String(body.ref_id || makeReferenceId()),
      first_name: String(body.first_name || '').trim(),
      surname: String(body.surname || '').trim(),
      email: String(body.email || '').trim() || null,
      id_number: idNumber,
      contact_number: contactNumber,
      gender: String(body.gender || '').trim(),
      race: String(body.race || '').trim(),
      area,
      area_other: area === 'Other' ? areaOther : null,
      address_notes: String(body.address_notes || '').trim() || null,
      skills,
      skills_other: skills.includes('Other') ? String(body.skills_other || '').trim() || null : null,
      packhouse_experience: Boolean(body.packhouse_experience),
      forklift_licence: Boolean(body.forklift_licence),
      work_shift: String(body.work_shift || '').trim() || null,
      status: 'new',
      placement_site: null,
      id_copy_url: String(body.id_copy_url || '').trim() || null,
      proof_sars_url: String(body.proof_sars_url || '').trim() || null,
      proof_bank_url: String(body.proof_bank_url || '').trim() || null,
      payslip_url: String(body.payslip_url || '').trim() || null,
      forklift_doc_url: String(body.forklift_doc_url || '').trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'lombicor-recruitment',
    supabaseConfigured: HAS_SUPABASE,
    supabaseConfigError: SUPABASE_CONFIG_ERROR || null,
  })
})

app.get('/api/options', (_req, res) => {
  res.json({
    areas: AREA_OPTIONS,
    skills: SKILL_OPTIONS,
    statuses: STATUS_OPTIONS,
    placements: PLACEMENT_OPTIONS,
  })
})

app.post('/api/admin/unlock', (req, res) => {
  const pin = String(req.body?.pin || '')
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Incorrect PIN.' })
  }
  return res.json({ ok: true })
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!requireSupabase(res)) return
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' })
  }

  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')
  const objectPath = `applications/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(objectPath, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath)
  return res.json({ file_url: data.publicUrl, path: objectPath })
})

app.post('/api/applicants', async (req, res) => {
  if (!requireSupabase(res)) return

  const { errors, payload } = validateApplicantPayload(req.body || {})
  if (Object.keys(errors).length) {
    return res.status(400).json({ errors })
  }

  const { data: existingApplicant, error: existingError } = await supabase
    .from('applicants')
    .select('id, ref_id')
    .eq('id_number', payload.id_number)
    .maybeSingle()

  if (existingError) {
    return res.status(500).json({ error: existingError.message })
  }

  if (existingApplicant) {
    return res.status(409).json({
      error: 'An application with this SA ID already exists.',
      code: 'DUPLICATE_ID_NUMBER',
      ref_id: existingApplicant.ref_id,
    })
  }

  const { data, error } = await supabase
    .from('applicants')
    .insert(payload)
    .select('id, ref_id, first_name, surname, id_number, status, created_at')
    .single()

  if (error) {
    const message = error.code === '23505'
      ? 'An application with this SA ID already exists.'
      : error.message
    return res.status(error.code === '23505' ? 409 : 500).json({
      error: message,
      code: error.code,
    })
  }

  return res.status(201).json(data)
})

app.get('/api/applicants', async (_req, res) => {
  if (!requireSupabase(res)) return

  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data)
})

app.get('/api/applicants/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'Applicant not found.' })
  }

  return res.json(data)
})

app.patch('/api/applicants/:id', async (req, res) => {
  if (!requireSupabase(res)) return

  const updates = {}
  const nextStatus = req.body?.status ? String(req.body.status).trim() : null
  const nextPlacement = req.body?.placement_site ? String(req.body.placement_site).trim() : null
  const nextNotes = typeof req.body?.admin_notes === 'string' ? req.body.admin_notes.trim() : undefined

  if (nextStatus) {
    if (!STATUS_OPTIONS.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid status option.' })
    }
    updates.status = nextStatus
  }

  if (typeof nextNotes === 'string') {
    updates.admin_notes = nextNotes || null
  }

  if (nextPlacement) {
    if (!PLACEMENT_OPTIONS.includes(nextPlacement)) {
      return res.status(400).json({ error: 'Invalid placement option.' })
    }
    updates.placement_site = nextPlacement
    updates.status = updates.status || 'placed'
  } else if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'placement_site')) {
    updates.placement_site = null
  }

  if (updates.status === 'placed' && !updates.placement_site && !nextPlacement) {
    return res.status(400).json({ error: 'Choose a placement site before saving a placed applicant.' })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('applicants')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data)
})

const clientDir = path.join(__dirname, 'dist', 'client')
app.use(express.static(clientDir))
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next()
  }
  return res.sendFile(path.join(clientDir, 'index.html'), (error) => {
    if (error) {
      res.status(200).send('Lombicor Recruitment API is running. Build the frontend with npm run build.')
    }
  })
})

app.listen(PORT, () => {
  console.log(`Lombicor server listening on http://127.0.0.1:${PORT}`)
})
