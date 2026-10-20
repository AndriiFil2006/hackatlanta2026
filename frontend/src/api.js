const configuredUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const baseUrl = configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`
const TOKEN_KEY = 'circuit.session'
export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(message, status, requestId) {
    super(message)
    this.status = status
    this.requestId = requestId
  }
}

export async function api(path, { method = 'GET', body, token, headers = {}, signal } = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('We couldn’t reach the store. Check your connection and try again.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail
    const message = Array.isArray(detail)
      ? detail.map((item) => `${item.loc?.at(-1) || 'Field'}: ${item.msg}`).join('. ')
      : typeof detail === 'string'
        ? detail
        : 'Something went wrong. Please try again.'
    if (response.status === 401 && token === getToken()) {
      clearToken()
      window.dispatchEvent(new Event('circuit:session-expired'))
    }
    throw new ApiError(message, response.status, response.headers.get('X-Request-ID'))
  }
  return data
}

export function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value),
  )
}

export const dateLabel = (value) => {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  return new Date(normalized).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
