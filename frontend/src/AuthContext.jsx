/* eslint-disable react-refresh/only-export-components -- hook colocated with provider */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  clearToken,
  getMe,
  getToken,
  loginRequest,
  registerRequest,
  setToken,
} from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  const refreshUser = useCallback(async (t) => {
    const tok = t ?? getToken()
    if (!tok) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const u = await getMe(tok)
      setUser(u)
    } catch {
      clearToken()
      setTokenState(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser(token)
  }, [token, refreshUser])

  const login = useCallback(async (email, password) => {
    const { access_token } = await loginRequest(email, password)
    setToken(access_token)
    setTokenState(access_token)
    await refreshUser(access_token)
  }, [refreshUser])

  const register = useCallback(
    async (email, password, display_name) => {
      const { access_token } = await registerRequest(
        email,
        password,
        display_name,
      )
      setToken(access_token)
      setTokenState(access_token)
      await refreshUser(access_token)
    },
    [refreshUser],
  )

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAdmin: !!user?.is_admin,
      login,
      register,
      logout,
      refreshUser,
    }),
    [token, user, loading, login, register, logout, refreshUser],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
