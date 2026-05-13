const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error || 'Request failed.'
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function getOptions() {
  return request('/api/options')
}

export function submitApplication(payload) {
  return request('/api/applicants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request('/api/upload', {
    method: 'POST',
    body: formData,
  })
}

export function unlockAdmin(pin) {
  return request('/api/admin/unlock', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

export function listApplicants() {
  return request('/api/applicants')
}

export function getApplicant(id) {
  return request(`/api/applicants/${id}`)
}

export function updateApplicant(id, payload) {
  return request(`/api/applicants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
