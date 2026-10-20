/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ token: getToken(), user: null, loading: !!getToken() })

  useEffect(() => {
    const controller = new AbortController()
    const token = getToken()
    if (token) {
      api('/users/me', { token, signal: controller.signal })
        .then((user) => setSession({ token, user, loading: false }))
        .catch((error) => {
          if (error.name !== 'AbortError') {
            // A network outage should not erase an otherwise valid credential.
            if (error.status === 401) clearToken()
            setSession({ token: null, user: null, loading: false })
          }
        })
    }
    const expired = () => setSession({ token: null, user: null, loading: false })
    window.addEventListener('circuit:session-expired', expired)
    return () => {
      controller.abort()
      window.removeEventListener('circuit:session-expired', expired)
    }
  }, [])

  async function authenticate(mode, values) {
    const { access_token } = await api(`/auth/${mode}`, { method: 'POST', body: values })
    const user = await api('/users/me', { token: access_token })
    setToken(access_token)
    setSession({ token: access_token, user, loading: false })
  }

  function logout() {
    clearToken()
    setSession({ token: null, user: null, loading: false })
  }

  return (
    <AuthContext.Provider value={{ ...session, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
